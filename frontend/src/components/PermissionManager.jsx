import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { Shield, Save } from 'lucide-react';

const PERMS = [
  { key: 'can_console', label: 'Console' },
  { key: 'can_files', label: 'Files' },
  { key: 'can_players', label: 'Players' },
  { key: 'can_settings', label: 'Settings' },
  { key: 'can_backups', label: 'Backups' },
  { key: 'can_schedule', label: 'Schedule' },
  { key: 'can_sftp', label: 'SFTP' },
  { key: 'can_start', label: 'Start' },
  { key: 'can_stop', label: 'Stop' },
];

export default function PermissionManager({ serverId }) {
  const [users, setUsers] = useState([]);
  const [perms, setPerms] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api.get('/users').then(res => {
      const nonAdmin = res.data.filter(u => u.role !== 'admin');
      setUsers(nonAdmin);
      nonAdmin.forEach(u => {
        api.get(`/users/${u.id}/permissions`).then(r => {
          const serverPerms = r.data.find(p => p.server_id === serverId);
          if (serverPerms) {
            setPerms(prev => ({ ...prev, [u.id]: serverPerms }));
          }
        });
      });
    });
  }, [serverId]);

  const togglePerm = (userId, key) => {
    setPerms(prev => {
      const current = prev[userId] || {};
      return { ...prev, [userId]: { ...current, [key]: current[key] ? 0 : 1 } };
    });
  };

  const savePerms = async (userId) => {
    setSaving(userId);
    const p = perms[userId] || {};
    await api.put(`/users/${userId}/permissions/${serverId}`, p);
    setSaving(null);
  };

  if (users.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <div className="empty-state">
          <Shield size={36} />
          <p style={{ marginTop: 8 }}>No non-admin users to manage</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>User Permissions</h3>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>User</th>
              {PERMS.map(p => <th key={p.key} style={{ textAlign: 'center' }}>{p.label}</th>)}
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const userPerms = perms[user.id] || {};
              return (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500 }}>{user.username}</td>
                  {PERMS.map(p => (
                    <td key={p.key} style={{ textAlign: 'center' }}>
                      <div
                        className={`toggle ${userPerms[p.key] ? 'active' : ''}`}
                        onClick={() => togglePerm(user.id, p.key)}
                        style={{ display: 'inline-block' }}
                      />
                    </td>
                  ))}
                  <td>
                    <button className="btn-primary btn-sm" onClick={() => savePerms(user.id)} disabled={saving === user.id}>
                      <Save size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
