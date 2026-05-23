'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, checkHasVoted, castPlainVote } from '../../../lib/api';
import { timeRemaining } from '../../../lib/utils';

export default function StudentVotePage() {
  const router = useRouter();
  const [election, setElection] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<Record<number, any[]>>({});
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api('/api/elections');
        const open = (data || []).find((e: any) => e.status === 'voting_open');
        if (!open) { setElection(null); setLoading(false); return; }
        setElection(open);

        const voted = await checkHasVoted(open.id);
        setHasVoted(voted);

        if (voted?.has_voted) { setLoading(false); return; }

        const byPos: Record<number, any[]> = {};
        for (const pos of open.positions || []) {
          const data = await api(`/api/positions/${pos.id}/candidates`);
          byPos[pos.id] = data || [];
        }
        setCandidates(byPos);
      } catch (err: any) {
        setError(err?.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleSelect(positionId: number, candidateId: number, maxVotes: number) {
    setSelections((prev) => {
      const current = prev[positionId] || [];
      if (current.includes(candidateId)) {
        return { ...prev, [positionId]: current.filter((id) => id !== candidateId) };
      }
      if (current.length >= maxVotes) {
        if (maxVotes === 1) return { ...prev, [positionId]: [candidateId] };
        return prev;
      }
      return { ...prev, [positionId]: [...current, candidateId] };
    });
  }

  async function handleSubmit() {
    if (!election) return;
    const allPositions = election.positions || [];
    for (const pos of allPositions) {
      const sel = selections[pos.id] || [];
      if (sel.length > pos.max_votes) {
        setError(`You can select at most ${pos.max_votes} candidate(s) for ${pos.name}`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const positions = allPositions.map((pos: any) => ({
        position_id: pos.id,
        candidate_ids: selections[pos.id] || [],
      }));
      const result = await castPlainVote(election.id, positions);
      setConfirmCode(result.confirmation_code);
    } catch (err: any) {
      setError(err?.message || 'Failed to cast vote');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="skeleton" style={{ height: 400, borderRadius: 18 }} />;
  }

  if (confirmCode) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🗳️</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 8 }}>Your Vote Has Been Recorded</h2>
        <p style={{ color: 'var(--g600)', marginBottom: 18 }}>Your encrypted vote has been submitted and cannot be changed.</p>
        <div style={{ background: 'var(--g100)', borderRadius: 12, padding: '16px 24px', display: 'inline-block', marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--g400)', marginBottom: 4 }}>Confirmation Code</div>
          <code style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: 'var(--navy)' }}>{confirmCode}</code>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => router.push('/student/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (hasVoted?.has_voted) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 8 }}>You Have Already Voted</h2>
        <p style={{ color: 'var(--g600)', marginBottom: 8 }}>Your vote was recorded on {new Date(hasVoted.voted_at).toLocaleString()}.</p>
        <p style={{ color: 'var(--g400)', fontSize: 13, marginBottom: 18 }}>Confirmation: <code style={{ fontWeight: 700 }}>{hasVoted.confirmation_code}</code></p>
        <button className="btn btn-primary" onClick={() => router.push('/student/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="card">
        <div className="empty" style={{ padding: 48 }}>
          <div className="empty-title" style={{ fontSize: 20 }}>No Active Voting</div>
          <div className="empty-text">There are no elections currently open for voting.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex' }}>
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      <div className="e-hero" style={{ marginBottom: 18 }}>
        <div className="e-hero-bg" />
        <div className="e-hero-inner">
          <div>
            <div className="e-hero-label">Voting Open</div>
            <div className="e-hero-name">{election.name}</div>
            <div className="e-hero-sub">Review candidates and cast your vote before the election closes.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="e-hero-timer">{timeRemaining(election.voting_end)}</div>
            <div className="e-hero-timer-lbl">Remaining</div>
          </div>
        </div>
      </div>

      {(election.positions || []).map((pos: any) => {
        const posCandidates = candidates[pos.id] || [];
        return (
          <div key={pos.id} className="card" style={{ marginBottom: 18 }}>
            <div className="card-hd">
              <div className="card-title">{pos.name}</div>
              <span style={{ fontSize: 13, color: 'var(--g400)' }}>
                Select up to {pos.max_votes} · {posCandidates.length} candidate(s)
              </span>
            </div>
            <div style={{ padding: 18 }}>
              {posCandidates.length === 0 ? (
                <div className="empty" style={{ padding: 24 }}>
                  <div className="empty-text">No candidates available for this position</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {posCandidates.map((c: any) => {
                    const selected = (selections[pos.id] || []).includes(c.id);
                    return (
                      <label
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '14px 18px',
                          borderRadius: 14,
                          border: `2px solid ${selected ? 'var(--gold)' : 'var(--g100)'}`,
                          background: selected ? 'rgba(240,165,0,0.06)' : 'white',
                          cursor: 'pointer',
                          transition: 'all var(--t)',
                        }}
                      >
                        <input
                          type={pos.max_votes === 1 ? 'radio' : 'checkbox'}
                          name={`pos_${pos.id}`}
                          checked={selected}
                          onChange={() => toggleSelect(pos.id, c.id, pos.max_votes)}
                          style={{ width: 18, height: 18, accentColor: 'var(--gold)', cursor: 'pointer' }}
                        />
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--gold-lt))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--navy)', flexShrink: 0 }}>
                          {c.user?.full_name?.[0] || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{c.user?.full_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--g400)' }}>
                            {c.user?.faculty} · Year {c.user?.year}
                            {c.party_affiliation ? ` · ${c.party_affiliation}` : ''}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="card" style={{ padding: 18 }}>
        <button
          className="btn btn-gold btn-lg btn-block"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting Your Vote…' : 'Cast My Vote'}
        </button>
        <p style={{ fontSize: 12, color: 'var(--g400)', textAlign: 'center', marginTop: 12 }}>
          Your vote will be encrypted end-to-end and cannot be changed after submission.
        </p>
      </div>
    </div>
  );
}
