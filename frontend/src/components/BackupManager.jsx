import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { Plus, RotateCw, Trash2, Archive, Download } from 'lucide-react';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export default function BackupManager({ serverId }) {
  const [backups, setBackups] = useState([]);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);

  const fetchBackups = () => {
    api.get(`/servers/${serverId}/backups`).then(res => setBackups(res.data)).catch(() => {});
  };

  useEffect(() => { fetchBackups(); }, [serverId]);

  const createBackup = async () => {
    setCreating(true);
    try {
      await api.post(`/servers/${serverId}/backups`);
      fetchBackups();
    } catch {}
    setCreating(false);
  };

  const restoreBackup = async (backupId) => {
    if (!confirm('Restore this backup? Current server files will be replaced.')) return;
    setRestoring(backupId);
    try {
      await api.post(`/servers/${serverId}/backups/${backupId}/restore`);
    } catch {}
    setRestoring(null);
  };

  const deleteBackup = async (backupId) => {
    if (!confirm('Delete this backup?')) return;
    await api.delete(`/servers/${serverId}/backups/${backupId}`);
    fetchBackups();
  };

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Backups</h3>
        <button className="btn-primary btn-sm" onClick={createBackup} disabled={creating}>
          <Plus size={14} /> {creating ? 'Creating...' : 'New Backup'}
        </button>
      </div>

      {backups.length === 0 ? (
        <div className="empty-state">
          <Archive size={36} />
          <p style={{ marginTop: 8 }}>No backups yet</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Created</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(backup => (
                <tr key={backup.id}>
                  <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{backup.filename}</td>
                  <td style={{ color: '#a1a1aa' }}>{formatSize(backup.size)}</td>
                  <td style={{ color: '#71717a' }}>{new Date(backup.created_at).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => restoreBackup(backup.id)} title="Restore" disabled={restoring === backup.id}>
                        <RotateCw size={14} className={restoring === backup.id ? 'animate-pulse' : ''} />
                      </button>
                      <button className="btn-icon" onClick={() => deleteBackup(backup.id)} title="Delete" style={{ color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
