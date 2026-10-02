import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { voteService, type VotePoll } from '../services/vote.service';

export default function VotePollCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [poll, setPoll] = useState<VotePoll | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    voteService.current().then((response) => {
      setPoll(response.data);
      if (response.data?.myVoteOptionId) setSelected(response.data.myVoteOptionId);
    }).catch(() => undefined);
  };

  useEffect(() => {
    load();
    // Refresh live counts without draining the API rate limit; skip while the tab is hidden.
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  if (!poll) return compact ? null : <section className="page container vote-page"><span className="eyebrow">STUDENT VOICE</span><h1 className="page-title">Choose the next seminar</h1><p className="lead">There is no open seminar vote right now. Check back soon.</p></section>;

  const locked = Boolean(poll.myVoteOptionId) || poll.status !== 'OPEN';
  const maxVotes = Math.max(1, ...poll.options.map((option) => option.votes));
  const submit = async () => {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    if (!selected) return setError('Select a seminar before voting.');
    setBusy(true);
    setError('');
    try {
      const response = await voteService.cast(poll.id, selected);
      setPoll(response.data);
      show('Thank you! Your vote has been recorded.', 'success');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to save your vote.');
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={compact ? 'vote-card' : 'page container vote-page'}>
      <div className="vote-heading">
        <span className="eyebrow">STUDENT VOICE</span>
        <h2>{poll.title}</h2>
        <p>{poll.description}</p>
        {poll.winner && <p className="vote-winner"><Trophy /> Winning seminar: <b>{poll.winner.title}</b> — {poll.winner.votes} votes</p>}
        {poll.tiedWinners.length > 1 && <p className="vote-winner"><Trophy /> Currently tied: {poll.tiedWinners.map((item) => item.title).join(', ')}</p>}
      </div>
      <div className="vote-options" role="radiogroup" aria-label={poll.title}>
        {poll.options.map((option) => {
          const percent = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
          const checked = selected === option.id;
          return (
            <label key={option.id} className={checked ? 'vote-option selected' : 'vote-option'}>
              <input type="radio" name={`poll-${poll.id}`} value={option.id} checked={checked} disabled={locked || busy} onChange={() => setSelected(option.id)} />
              {option.image ? <img src={option.image} alt="" /> : null}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 16, color: '#171717' }}>{option.title}</b>
                  <span style={{ fontSize: 13, fontWeight: 700, color: checked ? '#2D368D' : '#52606d' }}>
                    {option.votes} vote{option.votes === 1 ? '' : 's'} ({percent}%)
                  </span>
                </div>
                {(option.speaker || option.date) && <small>{[option.speaker, option.date].filter(Boolean).join(' · ')}</small>}
                {option.description && <p>{option.description}</p>}
                <i style={{ width: `${Math.max(percent, option.votes > 0 ? 4 : 0)}%`, transition: 'width 0.4s ease' }} />
              </div>
            </label>
          );
        })}
      </div>
      <div className="vote-actions">
        <span>{poll.totalVotes} total vote{poll.totalVotes === 1 ? '' : 's'}</span>
        {locked ? <small>{poll.myVoteOptionId ? 'Your vote is in. Counts update live.' : 'Voting is closed.'}</small> : <button className="button" disabled={busy || (Boolean(user) && !selected)} onClick={submit}>{user ? (busy ? 'Saving…' : 'Submit vote') : 'Sign in to vote'}</button>}
        {error && <b className="vote-error">{error}</b>}
        {compact && <Link className="text-link" to="/vote">Open full vote</Link>}
      </div>
    </section>
  );
}
