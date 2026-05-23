'use client';

import { useEffect, useState } from 'react';
import {
  fetchAllStudents,
  fetchPendingStudents,
  verifyStudent,
  rejectStudent,
} from '../../../lib/api';

export default function AdminStudentsPage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = tab === 'pending' ? await fetchPendingStudents() : await fetchAllStudents();
      setStudents(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  async function onVerify(id: number) {
    try {
      await verifyStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err?.message);
    }
  }

  async function onReject(id: number) {
    try {
      await rejectStudent(id, rejectReason);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setRejectModal(null);
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
        <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setTab('all')}>All Students</button>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">{tab === 'pending' ? 'Pending Verifications' : 'All Students'}</div>
          <span style={{ fontSize: 13, color: 'var(--g400)' }}>{students.length} student(s)</span>
        </div>
        <div style={{ padding: '0 18px 18px' }}>
          {loading ? (
            <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
          ) : students.length === 0 ? (
            <div className="empty">
              <div className="empty-title">No {tab === 'pending' ? 'pending' : ''} students</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>TU Number</th>
                    <th>Faculty</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.full_name}</strong></td>
                      <td>{s.email}</td>
                      <td style={{ fontSize: 13 }}>{s.tu_registration_number}</td>
                      <td>{s.faculty}</td>
                      <td>Year {s.year}</td>
                      <td>
                        {s.is_verified
                          ? <span className="badge badge-results_published">Verified</span>
                          : s.is_active
                            ? <span className="badge badge-nomination_open">Pending</span>
                            : <span className="badge badge-closed">Rejected</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!s.is_verified && s.is_active && (
                            <>
                              <button className="btn btn-sm btn-primary" onClick={() => onVerify(s.id)}>✓ Verify</button>
                              <button className="btn btn-sm btn-outline" style={{ borderColor: 'var(--crimson)', color: 'var(--crimson)' }} onClick={() => setRejectModal(s.id)}>✕ Reject</button>
                            </>
                          )}
                          {!s.is_active && (
                            <span style={{ fontSize: 12, color: 'var(--g400)' }}>{s.rejection_reason || 'Rejected'}</span>
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

      {rejectModal && (
        <div className="spinner-overlay" style={{ cursor: 'pointer' }} onClick={() => setRejectModal(null)}>
          <div className="auth-card" style={{ maxWidth: 420, cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 20 }}>Reject Student</h3>
            <p style={{ fontSize: 13, color: 'var(--g600)' }}>Provide a reason for rejection (optional):</p>
            <textarea
              className="form-control"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason..."
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: 'var(--crimson)', color: 'white' }} onClick={() => onReject(rejectModal)}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
