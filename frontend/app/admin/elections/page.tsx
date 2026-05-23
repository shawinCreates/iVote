'use client';

import { useEffect, useState } from 'react';
import {
  fetchAdminElections,
  createElection,
  updateElectionStatus,
  lockCandidates,
  fetchHEPublicKey,
} from '../../../lib/api';
import { formatDate, statusLabel, getStatusBadgeClass } from '../../../lib/utils';

export default function AdminElectionsPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminElections();
      setElections(data || []);
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onStatusChange(id: number, status: string) {
    try {
      await updateElectionStatus(id, status);
      await load();
    } catch (err: any) {
      setError(err?.message);
    }
  }

  async function onLock(id: number) {
    try {
      await lockCandidates(id);
      await load();
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

      <div style={{ marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '← Back to List' : '+ Create Election'}
        </button>
      </div>

      {showForm ? (
        <CreateElectionForm
          onCreated={() => { setShowForm(false); load(); }}
          onError={setError}
        />
      ) : (
        <div className="card">
          <div className="card-hd">
            <div className="card-title">All Elections</div>
            <span style={{ fontSize: 13, color: 'var(--g400)' }}>{elections.length} election(s)</span>
          </div>
          <div style={{ padding: '0 18px 18px' }}>
            {loading ? (
              <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
            ) : elections.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No elections created yet</div>
                <div className="empty-text">Click "Create Election" to get started</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Election</th>
                      <th>Positions</th>
                      <th>Voting Period</th>
                      <th>Status</th>
                      <th>HE Keys</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elections.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <strong>{e.name}</strong>
                          {e.description && <div style={{ fontSize: 12, color: 'var(--g400)' }}>{e.description}</div>}
                        </td>
                        <td>{e.positions?.length ?? 0}</td>
                        <td style={{ fontSize: 13 }}>{formatDate(e.voting_start)} → {formatDate(e.voting_end)}</td>
                        <td><span className={getStatusBadgeClass(e.status)}>{statusLabel(e.status)}</span></td>
                        <td>
                          {e.he_key_fingerprint
                            ? <span className="he-badge" style={{ color: 'var(--navy)', background: 'var(--g100)' }}>…{e.he_key_fingerprint.slice(-12)}</span>
                            : <span style={{ fontSize: 12, color: 'var(--g400)' }}>—</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {e.status === 'draft' && (
                              <button className="btn btn-sm btn-primary" onClick={() => onStatusChange(e.id, 'nomination_open')}>Open Nominations</button>
                            )}
                            {e.status === 'nomination_open' && !e.candidates_locked && (
                              <button className="btn btn-sm btn-outline" onClick={() => onLock(e.id)}>Lock Candidates</button>
                            )}
                            {e.status === 'nomination_open' && (
                              <button className="btn btn-sm btn-gold" onClick={() => onStatusChange(e.id, 'voting_open')}>Open Voting</button>
                            )}
                            {e.status === 'nomination_open' && (
                              <button className="btn btn-sm btn-outline" style={{ borderColor: 'var(--g400)', color: 'var(--g600)' }} onClick={() => onStatusChange(e.id, 'draft')}>Revert to Draft</button>
                            )}
                            {e.status === 'voting_open' && (
                              <button className="btn btn-sm" style={{ background: 'var(--crimson)', color: 'white' }} onClick={() => onStatusChange(e.id, 'closed')}>Close Election</button>
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
      )}
    </div>
  );
}

function CreateElectionForm({ onCreated, onError }: { onCreated: () => void; onError: (msg: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nominationStart, setNominationStart] = useState('');
  const [nominationEnd, setNominationEnd] = useState('');
  const [votingStart, setVotingStart] = useState('');
  const [votingEnd, setVotingEnd] = useState('');
  const [positions, setPositions] = useState([{ name: '', description: '', max_votes: 1 }]);
  const [saving, setSaving] = useState(false);

  function addPosition() {
    setPositions([...positions, { name: '', description: '', max_votes: 1 }]);
  }

  function removePosition(i: number) {
    if (positions.length > 1) setPositions(positions.filter((_, idx) => idx !== i));
  }

  function updatePosition(i: number, field: string, value: any) {
    const updated = [...positions];
    (updated[i] as any)[field] = value;
    setPositions(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !nominationStart || !nominationEnd || !votingStart || !votingEnd) {
      onError('Please fill in all required fields');
      return;
    }
    if (positions.some((p) => !p.name)) {
      onError('All positions must have a name');
      return;
    }

    setSaving(true);
    try {
      await createElection({
        name,
        description: description || null,
        nomination_start: new Date(nominationStart).toISOString(),
        nomination_end: new Date(nominationEnd).toISOString(),
        voting_start: new Date(votingStart).toISOString(),
        voting_end: new Date(votingEnd).toISOString(),
        positions: positions.map((p) => ({
          name: p.name,
          description: p.description || null,
          max_votes: p.max_votes,
        })),
      });
      onCreated();
    } catch (err: any) {
      onError(err?.message || 'Failed to create election');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card-hd">
        <div className="card-title">Create New Election</div>
      </div>
      <form onSubmit={handleSubmit} style={{ padding: 24 }}>
        <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
          <div className="form-group">
            <label className="form-label">Election Name <span className="req">*</span></label>
            <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Student Council 2026" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Nomination Start <span className="req">*</span></label>
              <input className="form-control" type="datetime-local" value={nominationStart} onChange={(e) => setNominationStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nomination End <span className="req">*</span></label>
              <input className="form-control" type="datetime-local" value={nominationEnd} onChange={(e) => setNominationEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Voting Start <span className="req">*</span></label>
              <input className="form-control" type="datetime-local" value={votingStart} onChange={(e) => setVotingStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Voting End <span className="req">*</span></label>
              <input className="form-control" type="datetime-local" value={votingEnd} onChange={(e) => setVotingEnd(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>Positions</h3>
            <button type="button" className="btn btn-sm btn-outline" onClick={addPosition}>+ Add Position</button>
          </div>
          {positions.map((pos, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Name <span className="req">*</span></label>
                <input className="form-control" style={{ padding: '10px 14px' }} value={pos.name} onChange={(e) => updatePosition(i, 'name', e.target.value)} placeholder="e.g. President" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Max Votes</label>
                <input className="form-control" style={{ padding: '10px 14px' }} type="number" min={1} max={10} value={pos.max_votes} onChange={(e) => updatePosition(i, 'max_votes', parseInt(e.target.value) || 1)} />
              </div>
              {positions.length > 1 && (
                <button type="button" className="btn btn-sm" style={{ background: 'transparent', color: 'var(--crimson)', padding: '10px', flexShrink: 0 }} onClick={() => removePosition(i)}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Election'}</button>
        </div>
      </form>
    </div>
  );
}
