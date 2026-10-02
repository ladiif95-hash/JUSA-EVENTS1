import { useEffect, useState } from 'react';
import { downloadExport, exportParticipants } from '../utils/exportParticipants';
import { Award, BarChart2, BarChart3, Calendar, CheckCircle2, Download, PieChart, Trophy, Users, Vote } from 'lucide-react';
import { seminarService } from '../services/seminar.service';
import { voteService, type VotePoll } from '../services/vote.service';
import { ErrorState, LoadingState } from '../components/StateViews';
import type { Seminar } from '../types/seminar.types';

type SeminarReport = {
  capacity: number;
  registered: number;
  waitlisted: number;
  cancelled: number;
  attended: number;
  absent: number;
  attendanceRate: number;
};

const CHART_PALETTE = [
  '#00A451', '#2563eb', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#ca8a04', '#4f46e5',
];

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState<'seminars' | 'votes'>('votes');

  // Seminar state
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [seminarId, setSeminarId] = useState('');
  const [seminarReport, setSeminarReport] = useState<SeminarReport | null>(null);
  const [loadingSeminars, setLoadingSeminars] = useState(true);

  // Vote state
  const [polls, setPolls] = useState<VotePoll[]>([]);
  const [selectedPollId, setSelectedPollId] = useState('');
  const [loadingVotes, setLoadingVotes] = useState(true);

  const [error, setError] = useState('');

  // Load seminars
  useEffect(() => {
    setLoadingSeminars(true);
    seminarService.adminList()
      .then((result) => {
        setSeminars(result.data);
        if (result.data.length > 0) {
          const firstId = result.data[0]?.id || (result.data[0] as Seminar & { _id?: string })?._id || '';
          setSeminarId(firstId);
        }
      })
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load seminars.'))
      .finally(() => setLoadingSeminars(false));
  }, []);

  // Load seminar report
  useEffect(() => {
    if (!seminarId) return;
    setLoadingSeminars(true);
    seminarService.report(seminarId)
      .then((result) => setSeminarReport(result.data))
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load seminar report.'))
      .finally(() => setLoadingSeminars(false));
  }, [seminarId]);

  // Load vote polls
  const loadVotePolls = () => {
    setLoadingVotes(true);
    voteService.adminList()
      .then((result) => {
        setPolls(result.data);
        if (result.data.length > 0) {
          const openPoll = result.data.find((p) => p.status === 'OPEN');
          setSelectedPollId(openPoll ? openPoll.id : result.data[0].id);
        }
      })
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to load vote polls.'))
      .finally(() => setLoadingVotes(false));
  };

  useEffect(() => {
    loadVotePolls();
  }, []);

  const selectedPoll = polls.find((p) => p.id === selectedPollId) || polls[0];

  // Seminar metrics
  const seminarMetrics = seminarReport
    ? [
        ['Registered', seminarReport.registered, '#2563eb'],
        ['Attended', seminarReport.attended, '#2D368D'],
        ['Absent', seminarReport.absent, '#dc2626'],
        ['Waitlisted', seminarReport.waitlisted, '#d97706'],
      ]
    : [];

  return (
    <section className="admin-page">
      <div className="admin-title">
        <div>
          <span className="eyebrow">ANALYTICS &amp; INSIGHTS</span>
          <h1>Reports &amp; Charts</h1>
          <p className="admin-lead">
            Analyze event attendance and student voting results with live visual charts and exports.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '2px solid #e5e7eb', paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab('votes')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 10,
            border: 0,
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            backgroundColor: activeTab === 'votes' ? '#2D368D' : '#f3f4f6',
            color: activeTab === 'votes' ? '#ffffff' : '#4b5563',
            transition: 'all 0.2s',
          }}
        >
          <Vote style={{ width: 18 }} /> Vote Reports &amp; Charts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seminars')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 10,
            border: 0,
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            backgroundColor: activeTab === 'seminars' ? '#2D368D' : '#f3f4f6',
            color: activeTab === 'seminars' ? '#ffffff' : '#4b5563',
            transition: 'all 0.2s',
          }}
        >
          <Calendar style={{ width: 18 }} /> Seminar Attendance Reports
        </button>
      </div>

      {/* ===================== VOTE REPORTS TAB ===================== */}
      {activeTab === 'votes' && (
        <>
          <div className="admin-toolbar" style={{ marginTop: 0 }}>
            <select
              aria-label="Select vote poll"
              value={selectedPollId}
              onChange={(e) => setSelectedPollId(e.target.value)}
              style={{ minWidth: 320 }}
            >
              <option value="">Choose a vote poll</option>
              {polls.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title} ({item.totalVotes} votes · {item.status})
                </option>
              ))}
            </select>

            {selectedPoll && (
              <button
                type="button"
                className="button button-outline"
                onClick={() => downloadExport(`/admin/votes/${selectedPoll.id}/export`, 'jusa-vote-report.xlsx').catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to export.'))}
              >
                <Download style={{ width: 16 }} /> Export Vote Excel
              </button>
            )}
          </div>

          {loadingVotes && !polls.length ? (
            <LoadingState kind="table" />
          ) : error && !polls.length ? (
            <ErrorState message={error} retry={loadVotePolls} />
          ) : !selectedPoll ? (
            <section className="empty-state">
              <Vote />
              <h2>No Voting Data Yet</h2>
              <p>Create seminar votes in the Voting section to view reports and charts here.</p>
            </section>
          ) : (
            <>
              {/* Vote Summary Metric Grid */}
              <div className="metric-grid" style={{ marginBottom: 24 }}>
                <article style={{ minWidth: 0 }}>
                  <Users style={{ color: '#2563eb' }} />
                  <span>Total Votes Cast</span>
                  <b>{selectedPoll.totalVotes}</b>
                </article>
                <article style={{ minWidth: 0 }}>
                  <Trophy style={{ color: '#d97706' }} />
                  <span>Leading / Winner</span>
                  <b
                    style={{
                      fontSize: 'clamp(14px, 3.2vw, 18px)',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                    title={selectedPoll.winner ? selectedPoll.winner.title : undefined}
                  >
                    {selectedPoll.winner ? selectedPoll.winner.title : 'No votes yet'}
                  </b>
                </article>
                <article style={{ minWidth: 0 }}>
                  <BarChart2 style={{ color: '#7c3aed' }} />
                  <span>Options Count</span>
                  <b>{selectedPoll.options.length}</b>
                </article>
                <article style={{ minWidth: 0 }}>
                  <CheckCircle2 style={{ color: selectedPoll.status === 'OPEN' ? '#2D368D' : '#6b7280' }} />
                  <span>Poll Status</span>
                  <b>{selectedPoll.status === 'OPEN' ? '🟢 Active' : '🔒 Closed'}</b>
                </article>
              </div>

              {/* Vote Charts Card */}
              <div className="admin-panel" style={{ marginBottom: 24 }}>
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">VISUAL COMPARISON</span>
                    <h2><BarChart3 /> Vote Distribution Bar Chart</h2>
                    <p style={{ color: '#6b7280', margin: 0 }}>
                      Live visual breakdown of votes per topic for <b>"{selectedPoll.title}"</b>
                    </p>
                  </div>
                </div>

                {/* Stacked Proportional Distribution Bar */}
                {selectedPoll.totalVotes > 0 && (
                  <div style={{ margin: '18px 0 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PieChart style={{ width: 14 }} /> Total Share Distribution
                    </div>
                    <div style={{ height: 22, width: '100%', borderRadius: 8, overflow: 'hidden', display: 'flex', background: '#e5e7eb' }}>
                      {selectedPoll.options.map((option, idx) => {
                        const pct = (option.votes / selectedPoll.totalVotes) * 100;
                        if (pct <= 0) return null;
                        const color = CHART_PALETTE[idx % CHART_PALETTE.length];
                        return (
                          <div
                            key={option.id}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: color,
                              height: '100%',
                              transition: 'width 0.5s ease',
                            }}
                            title={`${option.title}: ${option.votes} votes (${Math.round(pct)}%)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bar Chart with percentage bars */}
                <div style={{ display: 'grid', gap: 14 }}>
                  {selectedPoll.options.map((option, idx) => {
                    const percentage = selectedPoll.totalVotes > 0 ? Math.round((option.votes / selectedPoll.totalVotes) * 100) : 0;
                    const isWinner = selectedPoll.winner?.id === option.id;
                    const color = CHART_PALETTE[idx % CHART_PALETTE.length];

                    return (
                      <div
                        key={option.id}
                        style={{
                          padding: '14px 18px',
                          borderRadius: 12,
                          background: isWinner ? '#f0fdf4' : '#ffffff',
                          border: `1px solid ${isWinner ? '#86efac' : '#e5e7eb'}`,
                          boxShadow: isWinner ? '0 2px 8px rgba(34, 197, 94, 0.1)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                backgroundColor: color,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                              {option.title}
                            </span>
                            {isWinner && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: 12 }}>
                                <Award style={{ width: 13 }} /> Winner
                              </span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 17, fontWeight: 800, color: color }}>
                              {option.votes}
                            </span>
                            <span style={{ fontSize: 14, color: '#6b7280', marginLeft: 6 }}>
                              vote{option.votes === 1 ? '' : 's'} ({percentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Visual Bar */}
                        <div style={{ height: 12, width: '100%', backgroundColor: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
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

              {/* Detailed Breakdown Table */}
              <div className="admin-panel">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">DATA BREAKDOWN</span>
                    <h2>Option Ranking &amp; Statistics</h2>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Rank</th>
                        <th>Option Title</th>
                        <th>Votes</th>
                        <th>Percentage</th>
                        <th>Share Visual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedPoll.options]
                        .sort((a, b) => b.votes - a.votes)
                        .map((opt, rank) => {
                          const percentage = selectedPoll.totalVotes > 0 ? Number(((opt.votes / selectedPoll.totalVotes) * 100).toFixed(1)) : 0;
                          const color = CHART_PALETTE[rank % CHART_PALETTE.length];
                          return (
                            <tr key={opt.id}>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    background: rank === 0 ? '#fef3c7' : '#f3f4f6',
                                    color: rank === 0 ? '#92400e' : '#4b5563',
                                    fontWeight: 700,
                                    fontSize: 13,
                                  }}
                                >
                                  {rank + 1}
                                </span>
                              </td>
                              <td>
                                <b>{opt.title}</b>
                              </td>
                              <td>
                                <b>{opt.votes}</b>
                              </td>
                              <td>
                                <b>{percentage}%</b>
                              </td>
                              <td style={{ width: 180 }}>
                                <div style={{ height: 8, width: '100%', background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.max(percentage, opt.votes > 0 ? 4 : 0)}%`, background: color, borderRadius: 'inherit' }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ===================== SEMINAR REPORTS TAB ===================== */}
      {activeTab === 'seminars' && (
        <>
          <div className="admin-toolbar" style={{ marginTop: 0 }}>
            <select
              aria-label="Select seminar"
              value={seminarId}
              onChange={(e) => setSeminarId(e.target.value)}
              style={{ minWidth: 320 }}
            >
              <option value="">Choose a seminar</option>
              {seminars.map((item) => (
                <option value={item.id || (item as Seminar & { _id?: string })._id} key={item.id}>
                  {item.title}
                </option>
              ))}
            </select>

            {seminarId && (
              <button
                type="button"
                className="button button-outline"
                onClick={() => exportParticipants(seminarId).catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to export.'))}
              >
                <Download style={{ width: 16 }} /> Export Seminar Excel
              </button>
            )}
          </div>

          {loadingSeminars ? (
            <LoadingState kind="table" />
          ) : error && !seminars.length ? (
            <ErrorState message={error} />
          ) : !seminarReport ? (
            <section className="empty-state">
              <BarChart3 />
              <h2>Select a seminar</h2>
              <p>Its registration and attendance data will appear here.</p>
            </section>
          ) : (
            <>
              <div className="metric-grid" style={{ marginBottom: 24 }}>
                {seminarMetrics.map(([label, value, color]) => (
                  <article key={String(label)}>
                    <BarChart3 style={{ color: String(color) }} />
                    <span>{label}</span>
                    <b>{value}</b>
                  </article>
                ))}
              </div>

              <section className="admin-panel report-card" style={{ marginBottom: 24 }}>
                <div>
                  <span className="eyebrow">ATTENDANCE RATE</span>
                  <h2>{seminarReport.attendanceRate}%</h2>
                  <p>{seminarReport.attended} of {seminarReport.registered} registered students checked in.</p>
                </div>
                <div className="report-progress">
                  <i style={{ width: `${seminarReport.attendanceRate}%` }} />
                </div>
                <small>Capacity: {seminarReport.capacity} · Cancelled: {seminarReport.cancelled}</small>
              </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
