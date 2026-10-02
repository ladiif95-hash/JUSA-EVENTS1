import { useEffect, useState } from 'react';
import { downloadExport } from '../utils/exportParticipants';
import { BarChart2, CheckCircle2, Download, Plus, Trash2, Trophy, Vote } from 'lucide-react';
import { voteService, type VotePoll } from '../services/vote.service';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useToast } from '../context/ToastContext';

const blankOption = () => ({ title: '' });

const CHART_COLORS = ['#00A451', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#059669'];

export default function AdminVoting() {
  const { show, confirm } = useToast();
  const [polls, setPolls] = useState<VotePoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('Choose the next seminar');
  const [options, setOptions] = useState([blankOption(), blankOption()]);
  const [selectedPollId, setSelectedPollId] = useState<string>('');

  const load = () => {
    setLoading(true);
    setError('');
    voteService.adminList()
      .then((response) => {
        setPolls(response.data);
        if (response.data.length > 0 && !selectedPollId) {
          const openPoll = response.data.find((p) => p.status === 'OPEN');
          setSelectedPollId(openPoll ? openPoll.id : response.data[0].id);
        }
      })
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load votes'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const current = polls.find((poll) => poll.id === selectedPollId) || polls.find((poll) => poll.status === 'OPEN') || polls[0];

  const setOptionTitle = (index: number, val: string) => {
    setOptions((list) => list.map((opt, itemIndex) => (itemIndex === index ? { title: val } : opt)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validOptions = options.map((opt) => ({ title: opt.title.trim() })).filter((opt) => opt.title);
    if (validOptions.length < 2) {
      setError('Please provide at least 2 option titles.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await voteService.create({
        title: title.trim(),
        options: validOptions,
      });
      setOptions([blankOption(), blankOption()]);
      show('New vote created and published.', 'success');
      setSelectedPollId(response.data.id);
      load();
    } catch (issue) {
      show(issue instanceof Error ? issue.message : 'Unable to create this vote.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const closePoll = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await voteService.update(id, { status: 'CLOSED' });
      show('Voting closed.', 'success');
      load();
    } catch (issue) {
      show(issue instanceof Error ? issue.message : 'Unable to close this vote.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removePoll = async (id: string, pollTitle: string) => {
    if (!(await confirm({ title: 'Delete this vote?', message: `"${pollTitle}" and all of its votes will be removed permanently.`, confirmLabel: 'Delete vote' }))) {
      return;
    }
    setBusy(true);
    try {
      await voteService.remove(id);
      show('Vote deleted.', 'success');
      load();
    } catch (issue) {
      show(issue instanceof Error ? issue.message : 'Unable to delete vote.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportPoll = (pollId: string) => downloadExport(`/admin/votes/${pollId}/export`, 'jusa-vote-report.xlsx')
    .catch((issue) => show(issue instanceof Error ? issue.message : 'Unable to export.', 'error'));

  return (
    <section className="admin-page">
      <div className="admin-title">
        <div>
          <span className="eyebrow">STUDENT VOICE &amp; VOTING</span>
          <h1>Seminar Voting Management</h1>
          <p className="admin-lead">
            Create seminar options for students to vote on. Voting is based purely on title for speed and clarity.
          </p>
        </div>
      </div>

      {loading && !polls.length ? <LoadingState /> : error && !polls.length ? <ErrorState message={error} retry={load} /> : null}

      {/* Live / Selected Poll Results & Visual Chart */}
      {current && (
        <div className="admin-panel vote-admin-live">
          <div className="panel-head" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="eyebrow">{current.status === 'OPEN' ? '🟢 LIVE RESULTS' : '🔒 CLOSED VOTE'}</span>
              <h2>{current.title}</h2>
              <p>
                <b>{current.totalVotes}</b> total vote{current.totalVotes === 1 ? '' : 's'} ·{' '}
                <span style={{ color: current.status === 'OPEN' ? '#2D368D' : '#6b7280', fontWeight: 600 }}>
                  {current.status === 'OPEN' ? 'Open for voting' : 'Voting closed'}
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => exportPoll(current.id)}
                title="Export Excel Report"
              >
                <Download style={{ width: 16 }} /> Export
              </button>
              {current.status === 'OPEN' && (
                <button className="button button-outline" disabled={busy} onClick={() => closePoll(current.id)}>
                  Close voting
                </button>
              )}
            </div>
          </div>

          {current.winner && (
            <p className="vote-winner" style={{ fontSize: 15 }}>
              <Trophy /> Winning Seminar: <b>{current.winner.title}</b> ({current.winner.votes} votes)
            </p>
          )}

          {/* Visual Bar Chart */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart2 style={{ width: 16 }} /> Vote Distribution &amp; Chart
            </h3>

            <div style={{ display: 'grid', gap: 12 }}>
              {current.options.map((option, idx) => {
                const percentage = current.totalVotes > 0 ? Math.round((option.votes / current.totalVotes) * 100) : 0;
                const isWinner = current.winner?.id === option.id;
                const color = CHART_COLORS[idx % CHART_COLORS.length];

                return (
                  <div
                    key={option.id}
                    style={{
                      padding: '12px 16px',
                      background: isWinner ? '#f0fdf4' : '#f9fafb',
                      border: `1px solid ${isWinner ? '#86efac' : '#e5e7eb'}`,
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: color,
                            display: 'inline-block',
                          }}
                        />
                        <b style={{ fontSize: 15, color: '#111827' }}>{option.title}</b>
                        {isWinner && (
                          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                            Winner
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <b style={{ fontSize: 15, color: color }}>{option.votes} votes</b>
                        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 6 }}>({percentage}%)</span>
                      </div>
                    </div>

                    {/* Progress Fill Bar */}
                    <div style={{ height: 10, width: '100%', backgroundColor: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(percentage, option.votes > 0 ? 3 : 0)}%`,
                          backgroundColor: color,
                          borderRadius: 'inherit',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create New Vote Form (Title Only for options) */}
      <form className="admin-panel profile-form seminar-form" onSubmit={submit}>
        <div className="settings-section full">
          <Vote />
          <div>
            <h2>Create a new voting poll</h2>
            <p>Enter the main poll title and candidate seminar titles. Students will vote by title.</p>
          </div>
        </div>

        <label className="full">
          Vote Question / Poll Title
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Choose the next seminar topic"
          />
        </label>

        <div className="full" style={{ display: 'grid', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Seminar Options (Title Only)</span>
          {options.map((option, index) => (
            <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  required
                  value={option.title}
                  onChange={(event) => setOptionTitle(index, event.target.value)}
                  placeholder={`Option ${index + 1} Title (e.g. Artificial Intelligence in Health)`}
                  style={{ width: '100%' }}
                />
              </div>
              {options.length > 2 && (
                <button
                  type="button"
                  className="user-delete-button"
                  onClick={() => setOptions((list) => list.filter((_, itemIndex) => itemIndex !== index))}
                  title="Remove this option"
                  style={{ height: 42, padding: '0 12px' }}
                >
                  <Trash2 style={{ width: 16 }} />
                </button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="status-bar status-bar-fail full">
            <b>{error}</b>
          </div>
        )}

        {success && (
          <div className="status-bar status-bar-pass full" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 style={{ width: 16 }} />
            <b>{success}</b>
          </div>
        )}

        <div className="form-actions full">
          <button
            type="button"
            className="button button-outline"
            onClick={() => setOptions((list) => [...list, blankOption()])}
          >
            <Plus /> Add option
          </button>
          <button className="button" disabled={busy}>
            {busy ? 'Saving…' : 'Publish vote'}
          </button>
        </div>
      </form>

      {/* Past Polls & History */}
      {polls.length > 1 && (
        <div className="admin-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">POLL HISTORY</span>
              <h2>All Voting Polls ({polls.length})</h2>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Poll Title</th>
                  <th>Status</th>
                  <th>Total Votes</th>
                  <th>Winner</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {polls.map((poll) => (
                  <tr key={poll.id} style={{ background: poll.id === selectedPollId ? '#f0fdf4' : undefined }}>
                    <td>
                      <b>{poll.title}</b>
                    </td>
                    <td>
                      <span className={`pill ${poll.status === 'OPEN' ? 'pill-green' : ''}`}>
                        {poll.status === 'OPEN' ? 'Active / Open' : 'Closed'}
                      </span>
                    </td>
                    <td>{poll.totalVotes}</td>
                    <td>{poll.winner ? poll.winner.title : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="button button-outline"
                          style={{ padding: '4px 10px', fontSize: 12, height: 32 }}
                          onClick={() => setSelectedPollId(poll.id)}
                        >
                          View Results
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          style={{ padding: '4px 10px', fontSize: 12, height: 32 }}
                          onClick={() => exportPoll(poll.id)}
                          title="Export Excel"
                          aria-label="Export Excel"
                        >
                          <Download style={{ width: 14 }} />
                        </button>
                        <button
                          type="button"
                          className="user-delete-button"
                          style={{ height: 32, padding: '0 8px' }}
                          onClick={() => removePoll(poll.id, poll.title)}
                          title="Delete poll"
                        >
                          <Trash2 style={{ width: 14 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

