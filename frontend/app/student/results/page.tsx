'use client';

import { useEffect, useState } from 'react';
import { fetchElectionResults, api } from '../../../lib/api';

export default function StudentResultsPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api('/api/elections');
        setElections((data || []).filter((e: any) => e.status === 'results_published'));
      } catch (err: any) {
        setError(err?.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setResultsLoading(true);
    setResults(null);
    fetchElectionResults(selectedId)
      .then(setResults)
      .catch((err: any) => setError(err?.message))
      .finally(() => setResultsLoading(false));
  }, [selectedId]);

  return (
    <div>
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex' }}>
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
      ) : elections.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-title">No published results yet</div>
            <div className="empty-text">Results will appear here once published by the Election Head</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18, alignItems: 'start' }}>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">Elections</div>
            </div>
            <div style={{ padding: 8 }}>
              {elections.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    borderRadius: 10,
                    background: selectedId === e.id ? 'var(--g100)' : 'transparent',
                    fontWeight: selectedId === e.id ? 700 : 400,
                    fontSize: 14,
                    cursor: 'pointer',
                    marginBottom: 4,
                  }}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-title">
                {selectedId ? elections.find((e) => e.id === selectedId)?.name || 'Results' : 'Select an election'}
              </div>
            </div>
            <div style={{ padding: 18 }}>
              {resultsLoading ? (
                <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
              ) : results ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
                    <div className="stat-card navy" style={{ minHeight: 60, padding: 14 }}>
                      <div className="stat-value" style={{ fontSize: 22 }}>{results.total_eligible}</div>
                      <div className="stat-label" style={{ fontSize: 12 }}>Eligible Voters</div>
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
                    <div key={pos.position_id} style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--gold)' }}>
                        {pos.position_name}
                      </h3>

                      {pos.candidates
                        ?.sort((a: any, b: any) => b.vote_count - a.vote_count)
                        .map((c: any, idx: number) => (
                          <div
                            key={c.candidate_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              padding: '12px 16px',
                              borderRadius: 12,
                              marginBottom: 6,
                              background: c.is_winner ? 'rgba(240, 165, 0, 0.08)' : 'transparent',
                              border: c.is_winner ? '1px solid rgba(240, 165, 0, 0.25)' : '1px solid transparent',
                            }}
                          >
                            <div style={{ width: 32, fontWeight: 800, color: 'var(--g400)', fontSize: 13 }}>#{idx + 1}</div>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,var(--navy),var(--navy-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15 }}>
                              {c.candidate_name?.[0] || '?'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700 }}>{c.candidate_name}</div>
                              {c.party_affiliation && <div style={{ fontSize: 12, color: 'var(--g400)' }}>{c.party_affiliation}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: 18 }}>{c.vote_count}</div>
                              <div style={{ fontSize: 12, color: 'var(--g400)' }}>{c.percentage?.toFixed(1)}%</div>
                            </div>
                            {c.is_winner && <span style={{ fontSize: 22 }}>🏆</span>}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-title">Select an election to view results</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
