'use client';

import { useEffect, useState } from 'react';
import {
  fetchAdminCandidates,
  fetchAllAdminCandidates,
  approveCandidate,
  rejectCandidate,
} from '../../../lib/api';
import { formatDate } from '../../../lib/utils';

export default function AdminCandidatesPage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = tab === 'pending' ? await fetchAdminCandidates() : await fetchAllAdminCandidates();
      setCandidates(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  async function onApprove(id: number) {
    try {
      await approveCandidate(id);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err?.message);
    }
  }

  async function onReject(id: number) {
    try {
      await rejectCandidate(id, rejectReason);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setRejectId(null);
      setRejectReason('');
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button className={`btn ${tab === 'pending' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setTab('pending')}>Pending</button>
        <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setTab('all')}>All</button>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">Candidates</div>
          <span style={{ fontSize: 13, color: 'var(--g400)' }}>{candidates.length} candidate(s)</span>
        </div>
        <div style={{ padding: '0 18px 18px' }}>
          {loading ? (
            <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
          ) : candidates.length === 0 ? (
            <div className="empty">
              <div className="empty-title">No candidates found</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Position</th>
                    <th>Party</th>
                    <th>Applied</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--navy),var(--navy-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
                            {c.user?.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <strong>{c.user?.full_name}</strong>
                            <div style={{ fontSize: 12, color: 'var(--g400)' }}>{c.user?.faculty}</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.position?.name || '—'}</td>
                      <td>{c.party_affiliation || '—'}</td>
                      <td style={{ fontSize: 13 }}>{formatDate(c.applied_at)}</td>
                      <td>
                        {c.approval_status === 'approved' ? (
                          <span className="badge badge-results_published">Approved</span>
                        ) : c.approval_status === 'rejected' ? (
                          <span className="badge badge-closed">Rejected</span>
                        ) : (
                          <span className="badge badge-nomination_open">Pending</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {c.approval_status === 'pending' && (
                            <>
                              <button className="btn btn-sm btn-primary" onClick={() => onApprove(c.id)}>✓ Approve</button>
                              <button className="btn btn-sm btn-outline" style={{ borderColor: 'var(--crimson)', color: 'var(--crimson)' }} onClick={() => setRejectId(c.id)}>✕ Reject</button>
                            </>
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

      {rejectId && (
        <div className="spinner-overlay" style={{ cursor: 'pointer' }} onClick={() => setRejectId(null)}>
          <div className="auth-card" style={{ maxWidth: 420, cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 20 }}>Reject Candidate</h3>
            <p style={{ fontSize: 13, color: 'var(--g600)' }}>Provide a reason (optional):</p>
            <textarea className="form-control" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setRejectId(null)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: 'var(--crimson)', color: 'white' }} onClick={() => onReject(rejectId)}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
