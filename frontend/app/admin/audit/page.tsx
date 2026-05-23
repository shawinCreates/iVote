'use client';

import { useEffect, useState } from 'react';
import { fetchAuditLogs, exportAuditLogs } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const limit = 50;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs(skip, limit);
      setLogs(data || []);
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [skip]);

  async function handleExport() {
    try {
      const csvData = await exportAuditLogs();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
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

      <div className="card">
        <div className="card-hd">
          <div className="card-title">Audit Logs</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-outline" onClick={handleExport}>📥 Export CSV</button>
          </div>
        </div>
        <div style={{ padding: '0 18px 18px' }}>
          {loading ? (
            <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
          ) : logs.length === 0 ? (
            <div className="empty">
              <div className="empty-title">No audit logs found</div>
              <div className="empty-text">Logs will appear here as actions are performed</div>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Action</th>
                      <th>User ID</th>
                      <th>Election ID</th>
                      <th>Details</th>
                      <th>IP Address</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: 12, color: 'var(--g400)' }}>{log.id}</td>
                        <td><span className="badge badge-nomination_open" style={{ fontSize: 11 }}>{log.action}</span></td>
                        <td style={{ fontSize: 13 }}>{log.user_id || '—'}</td>
                        <td style={{ fontSize: 13 }}>{log.election_id || '—'}</td>
                        <td style={{ fontSize: 13, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details || '—'}</td>
                        <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{log.ip_address || '—'}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(log.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '18px 0' }}>
                <button className="btn btn-sm btn-outline" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))}>← Previous</button>
                <span style={{ fontSize: 13, color: 'var(--g400)', alignSelf: 'center' }}>Showing {skip + 1}–{skip + logs.length}</span>
                <button className="btn btn-sm btn-outline" disabled={logs.length < limit} onClick={() => setSkip(skip + limit)}>Next →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
