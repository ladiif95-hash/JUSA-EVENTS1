import type { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { isUniqueViolation, isUuid, one, query, transaction, type Db, type Row } from '../db';

function parseOptions(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const option = item as Record<string, unknown>;
    return {
      title: String(option.title || '').trim(),
      speaker: String(option.speaker || '').trim(),
      description: String(option.description || '').trim(),
      date: String(option.date || '').trim(),
      image: String(option.image || '').trim(),
      sortOrder: Number(option.sortOrder ?? index),
    };
  }).filter((option) => option.title);
}

async function serializePoll(poll: Row, userId?: string) {
  const options = await query<Row>(
    `SELECT o.*, (SELECT count(*)::int FROM votes v WHERE v.option_id = o.id) AS votes
     FROM vote_options o WHERE o.poll_id = $1 ORDER BY o.sort_order ASC, o.created_at ASC`,
    [poll.id],
  );
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
  const maxVotes = Math.max(0, ...options.map((option) => option.votes));
  const winners = maxVotes > 0 ? options.filter((option) => option.votes === maxVotes) : [];
  const mine = userId ? await one('SELECT option_id FROM votes WHERE poll_id = $1 AND user_id = $2', [poll.id, userId]) : null;
  return {
    ...poll,
    totalVotes,
    myVoteOptionId: mine ? mine.optionId : null,
    winner: winners.length === 1 ? winners[0] : null,
    tiedWinners: winners.length > 1 ? winners : [],
    options,
  };
}

const findPoll = (id: string) => (isUuid(id) ? one('SELECT * FROM vote_polls WHERE id = $1', [id]) : Promise.resolve(null));

async function insertOption(db: Db, pollId: string, option: ReturnType<typeof parseOptions>[number]) {
  await db.query('INSERT INTO vote_options (poll_id, title, speaker, description, date, image, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7)', [pollId, option.title, option.speaker, option.description, option.date, option.image, option.sortOrder]);
}

export async function currentPoll(request: Request, response: Response) {
  const poll = await one("SELECT * FROM vote_polls WHERE status = 'OPEN' ORDER BY created_at DESC LIMIT 1");
  if (!poll) return response.json({ data: null });
  return response.json({ data: await serializePoll(poll, request.user?.id) });
}

export async function castVote(request: Request, response: Response) {
  if (request.user?.role !== 'STUDENT') return response.status(403).json({ message: 'Only students can vote for the next seminar.' });
  const poll = await findPoll(String(request.params.pollId));
  if (!poll || poll.status !== 'OPEN') return response.status(404).json({ message: 'This vote is closed or not available.' });
  const optionId = String(request.body.optionId || '');
  const option = isUuid(optionId) ? await one('SELECT id FROM vote_options WHERE id = $1 AND poll_id = $2', [optionId, poll.id]) : null;
  if (!option) return response.status(400).json({ message: 'Choose a valid seminar option.' });
  try {
    await query('INSERT INTO votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)', [poll.id, option.id, request.user.id]);
  } catch (error) {
    if (isUniqueViolation(error)) return response.status(409).json({ message: 'You have already voted. Each student can vote only once.' });
    throw error;
  }
  return response.status(201).json({ data: await serializePoll(poll, request.user.id) });
}

export async function listPolls(_request: Request, response: Response) {
  const polls = await query('SELECT * FROM vote_polls ORDER BY created_at DESC');
  return response.json({ data: await Promise.all(polls.map((poll) => serializePoll(poll))) });
}

export async function createPoll(request: Request, response: Response) {
  const options = parseOptions(request.body.options);
  if (options.length < 2) return response.status(400).json({ message: 'Add at least two seminar options.' });
  const status = request.body.status === 'CLOSED' ? 'CLOSED' : 'OPEN';
  const poll = await transaction(async (db) => {
    if (status === 'OPEN') await db.query("UPDATE vote_polls SET status = 'CLOSED', updated_at = now() WHERE status = 'OPEN'");
    const created = await one(
      'INSERT INTO vote_polls (title, description, status, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [String(request.body.title || 'Choose the next seminar').trim(), String(request.body.description || 'Vote for the seminar you want to attend. You can vote only once.'), status, request.user!.id],
      db,
    );
    for (const option of options) await insertOption(db, created!.id, option);
    return created!;
  });
  return response.status(201).json({ data: await serializePoll(poll) });
}

export async function updatePoll(request: Request, response: Response) {
  const existingPoll = await findPoll(String(request.params.id));
  if (!existingPoll) return response.status(404).json({ message: 'Vote not found' });
  const poll = await transaction(async (db) => {
    const status = request.body.status === 'OPEN' || request.body.status === 'CLOSED' ? request.body.status : existingPoll.status;
    if (status === 'OPEN') await db.query("UPDATE vote_polls SET status = 'CLOSED', updated_at = now() WHERE status = 'OPEN' AND id <> $1", [existingPoll.id]);
    const updated = await one(
      'UPDATE vote_polls SET title = $2, description = $3, status = $4, updated_at = now() WHERE id = $1 RETURNING *',
      [existingPoll.id, request.body.title ? String(request.body.title).trim() : existingPoll.title, request.body.description != null ? String(request.body.description) : existingPoll.description, status],
      db,
    );
    const incoming = parseOptions(request.body.options);
    if (incoming.length) {
      const current = await query('SELECT id FROM vote_options WHERE poll_id = $1 ORDER BY sort_order ASC, created_at ASC', [existingPoll.id], db);
      for (const [index, option] of incoming.entries()) {
        if (current[index]) {
          await db.query('UPDATE vote_options SET title = $2, speaker = $3, description = $4, date = $5, image = $6, sort_order = $7, updated_at = now() WHERE id = $1', [current[index].id, option.title, option.speaker, option.description, option.date, option.image, option.sortOrder]);
        } else {
          await insertOption(db, existingPoll.id, option);
        }
      }
      // Options removed in the editor are deleted together with their votes.
      const removed = current.slice(incoming.length).map((option) => option.id);
      if (removed.length) await db.query('DELETE FROM vote_options WHERE id = ANY($1::uuid[])', [removed]);
    }
    return updated!;
  });
  return response.json({ data: await serializePoll(poll) });
}

export async function deletePoll(request: Request, response: Response) {
  const poll = await findPoll(String(request.params.id));
  if (!poll) return response.status(404).json({ message: 'Vote not found' });
  await query('DELETE FROM vote_polls WHERE id = $1', [poll.id]);
  return response.status(204).send();
}

export async function exportVoteReport(request: Request, response: Response) {
  const poll = await findPoll(String(request.params.id));
  if (!poll) return response.status(404).json({ message: 'Vote not found' });
  const serialized = await serializePoll(poll);
  const summaryRows = [
    { Field: 'Vote Title', Value: poll.title },
    { Field: 'Status', Value: poll.status },
    { Field: 'Total Votes Cast', Value: serialized.totalVotes },
    { Field: 'Winner', Value: serialized.winner ? serialized.winner.title : 'No winner yet' },
  ];
  const optionRows = [...serialized.options].sort((a, b) => b.votes - a.votes).map((option, index) => ({
    Rank: index + 1,
    'Option Title': option.title,
    'Votes Count': option.votes,
    'Percentage (%)': serialized.totalVotes > 0 ? Number(((option.votes / serialized.totalVotes) * 100).toFixed(1)) : 0,
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(optionRows), 'Results');
  const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  response.setHeader('Content-Disposition', `attachment; filename="jusa-vote-results-${poll.id}.xlsx"`);
  return response.send(buffer);
}
