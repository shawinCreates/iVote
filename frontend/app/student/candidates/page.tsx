'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';

export default function StudentCandidatesPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api('/api/elections');
        const active = (data || []).filter((e: any) =>
          ['nomination_open', 'voting_open', 'closed', 'results_published'].includes(e.status)
        );
        setElections(active);
        if (active.length > 0) setSelectedElection(active[0].id);
      } catch (err: any) {
        setError(err?.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedElection) return;
    async function loadCandidates() {
      const election = elections.find((e) => e.id === selectedElection);
      if (!election) return;
      const byPos: Record<number, any[]> = {};
      for (const pos of election.positions || []) {
        try {
          const data = await api(`/api/positions/${pos.id}/candidates`);
          byPos[pos.id] = data || [];
        } catch {
          byPos[pos.id] = [];
        }
      }
      setCandidates(byPos);
    }
    loadCandidates();
  }, [selectedElection, elections]);

  const currentElection = elections.find((e) => e.id === selectedElection);

  return (
    <div>
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex' }}>
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      {elections.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {elections.map((e) => (
            <button
              key={e.id}
              className={`btn btn-sm ${selectedElection === e.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedElection(e.id)}
            >
              {e.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
      ) : !currentElection ? (
        <div className="card">
          <div className="empty">
            <div className="empty-title">No elections available</div>
          </div>
        </div>
      ) : (
        (currentElection.positions || []).map((pos: any) => {
          const posCandidates = candidates[pos.id] || [];
          return (
            <div key={pos.id} className="card" style={{ marginBottom: 18 }}>
              <div className="card-hd">
                <div className="card-title">{pos.name}</div>
                <span style={{ fontSize: 13, color: 'var(--g400)' }}>{posCandidates.length} candidate(s) · Max votes: {pos.max_votes}</span>
              </div>
              <div style={{ padding: 18 }}>
                {posCandidates.length === 0 ? (
                  <div className="empty" style={{ padding: 24 }}>
                    <div className="empty-text">No approved candidates for this position</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {posCandidates.map((c: any) => (
                      <div key={c.id} style={{ border: '1px solid var(--g100)', borderRadius: 16, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--gold-lt))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', fontWeight: 800, fontSize: 16 }}>
                            {c.user?.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{c.user?.full_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--g400)' }}>{c.user?.faculty} · Year {c.user?.year}</div>
                          </div>
                        </div>
                        {c.party_affiliation && (
                          <div style={{ fontSize: 13, marginBottom: 8 }}>
                            <span style={{ fontWeight: 600 }}>Party:</span> {c.party_affiliation}
                          </div>
                        )}
                        {c.manifesto && (
                          <div style={{ fontSize: 13, color: 'var(--g600)', lineHeight: 1.5, maxHeight: 80, overflow: 'hidden' }}>
                            {c.manifesto}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
