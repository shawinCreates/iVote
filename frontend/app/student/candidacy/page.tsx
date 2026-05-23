'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, applyForCandidacy } from '../../../lib/api';

export default function StudentCandidacyPage() {
  const router = useRouter();
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState<number | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [manifesto, setManifesto] = useState('');
  const [party, setParty] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api('/api/elections');
        const open = (data || []).filter((e: any) => e.status === 'nomination_open' && !e.candidates_locked);
        setElections(open);
      } catch (err: any) {
        setError(err?.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedElection) { setPositions([]); return; }
    const election = elections.find((e) => e.id === selectedElection);
    setPositions(election?.positions || []);
    setPositionId(null);
  }, [selectedElection, elections]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!positionId || !manifesto.trim()) {
      setError('Please select a position and write your manifesto');
      return;
    }
    if (!photo) {
      setError('Please upload a profile photo');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('position_id', String(positionId));
      form.append('manifesto', manifesto);
      form.append('party_affiliation', party || '');
      form.append('photo', photo);
      await applyForCandidacy(form);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="card">
        <div className="empty" style={{ padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div className="empty-title" style={{ fontSize: 20 }}>Application Submitted!</div>
          <div className="empty-text" style={{ marginBottom: 18 }}>Your candidacy is pending approval by the Election Head.</div>
          <button className="btn btn-primary" onClick={() => router.push('/student/dashboard')}>Back to Dashboard</button>
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

      <div className="card">
        <div className="card-hd">
          <div className="card-title">Apply for Candidacy</div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24, maxWidth: 600 }}>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 18 }} />
          ) : elections.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              <div className="empty-title">No elections open for nominations</div>
              <div className="empty-text">Check back when nominations are open</div>
            </div>
          ) : (
            <>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Election <span className="req">*</span></label>
                <select className="form-control" value={selectedElection || ''} onChange={(e) => setSelectedElection(Number(e.target.value) || null)}>
                  <option value="">Select an election…</option>
                  {elections.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              {positions.length > 0 && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Position <span className="req">*</span></label>
                  <select className="form-control" value={positionId || ''} onChange={(e) => setPositionId(Number(e.target.value) || null)}>
                    <option value="">Select a position…</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (max {p.max_votes} vote(s))</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Manifesto <span className="req">*</span></label>
                <textarea className="form-control" rows={5} value={manifesto} onChange={(e) => setManifesto(e.target.value)} placeholder="Tell voters why they should vote for you…" maxLength={5000} />
                <div style={{ fontSize: 12, color: 'var(--g400)', textAlign: 'right' }}>{manifesto.length}/5000</div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Party Affiliation</label>
                <input className="form-control" value={party} onChange={(e) => setParty(e.target.value)} placeholder="e.g. Progressive Alliance (optional)" />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Profile Photo <span className="req">*</span></label>
                <div className="file-zone">
                  <input type="file" accept="image/jpeg,image/png" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                  <div className="file-zone-text">{photo ? photo.name : 'Click to upload your photo (JPG or PNG, max 5MB)'}</div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
