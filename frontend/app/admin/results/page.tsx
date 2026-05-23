'use client';

import { useEffect, useState } from 'react';
import { fetchAdminElections, fetchAdminElectionResults, publishResults } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';

export default function AdminResultsPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminElections();
      setElections((data || []).filter((e: any) =>
        ['closed', 'results_published'].includes(e.status)
      ));
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function viewResults(election: any) {
    setSelected(election);
    setResultsLoading(true);
    setResults(null);
    try {
      const r = await fetchAdminElectionResults(election.id);
      setResults(r);
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setResultsLoading(false);
    }
  }

  async function onPublish(electionId: number) {
    try {
      await publishResults(electionId);
      setError(null);
      await load();
      if (selected?.id === electionId) setSelected(null);
    } catch (err: any) {
      setError(err?.message);
    }
  }

  return (
    <div>
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex' }}>
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-hd">
            <div className="card-title">Completed Elections</div>
          </div>
          <div style={{ padding: '0 18px 18px' }}>
            {loading ? (
              <div className="skeleton" style={{ height: 200, borderRadius: 18 }} />
            ) : elections.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No completed elections</div>
                <div className="empty-text">Close an election to view and publish results</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Election</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elections.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <strong>{e.name}</strong>
                          <div style={{ fontSize: 12, color: 'var(--g400)' }}>{e.positions?.length ?? 0} position(s)</div>
                        </td>
                        <td>
                          {e.status === 'results_published'
                            ? <span className="badge badge-results_published">Published</span>
                            : <span className="badge badge-closed">Closed</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-outline" onClick={() => viewResults(e)}>View Results</button>
                            {e.status === 'closed' && (
                              <button className="btn btn-sm btn-gold" onClick={() => onPublish(e.id)}>Publish</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div className="card">
            <div className="card-hd">
              <div className="card-title">{selected.name} — Results</div>
              <button className="btn btn-sm btn-outline" onClick={() => { setSelected(null); setResults(null); }}>Close</button>
            </div>
            <div style={{ padding: 18 }}>
              {resultsLoading ? (
                <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
              ) : results ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
                    <div className="stat-card navy" style={{ minHeight: 60, padding: 14 }}>
                      <div className="stat-value" style={{ fontSize: 22 }}>{results.total_eligible}</div>
                      <div className="stat-label" style={{ fontSize: 12 }}>Eligible</div>
                    </div>
                    <div className="stat-card gold" style={{ minHeight: 60, padding: 14 }}>
                      <div className="stat-value" style={{ fontSize: 22 }}>{results.total_cast}</div>
                      <div className="stat-label" style={{ fontSize: 12 }}>Votes Cast</div>
                    </div>
                    <div className="stat-card green" style={{ minHeight: 60, padding: 14 }}>
                      <div className="stat-value" style={{ fontSize: 22 }}>{results.turnout_pct?.toFixed(1)}%</div>
                      <div className="stat-label" style={{ fontSize: 12 }}>Turnout</div>
                    </div>
                  </div>

                  {results.positions?.map((pos: any) => (
                    <div key={pos.position_id} style={{ marginBottom: 18 }}>
                      <h3 style={{ fontSize: 15, marginBottom: 8 }}>{pos.position_name}</h3>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Candidate</th>
                              <th>Votes</th>
                              <th>%</th>
                              <th>Winner</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pos.candidates?.map((c: any) => (
                              <tr key={c.candidate_id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--navy),var(--navy-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11 }}>
                                      {c.candidate_name?.[0] || '?'}
                                    </div>
                                    <strong style={{ fontSize: 14 }}>{c.candidate_name}</strong>
                                  </div>
                                </td>
                                <td style={{ fontWeight: 700 }}>{c.vote_count}</td>
                                <td>{c.percentage?.toFixed(1)}%</td>
                                <td>{c.is_winner ? <span style={{ color: 'var(--gold)', fontSize: 18 }}>🏆</span> : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-title">No results available</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
