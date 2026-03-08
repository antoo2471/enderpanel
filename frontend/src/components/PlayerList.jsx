import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { UserX, Ban, MapPin, RefreshCw, Users } from 'lucide-react';

export default function PlayerList({ serverId }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tpTarget, setTpTarget] = useState({ player: '', target: '' });
  const [showTp, setShowTp] = useState(false);

  const fetchPlayers = () => {
    setLoading(true);
    api.get(`/servers/${serverId}/players`).then(res => setPlayers(res.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, [serverId]);

  const kickPlayer = async (name) => {
    await api.post(`/servers/${serverId}/players/kick`, { player: name, reason: 'Kicked by panel' });
    setTimeout(fetchPlayers, 1000);
  };

  const banPlayer = async (name) => {
    if (!confirm(`Ban ${name}?`)) return;
    await api.post(`/servers/${serverId}/players/ban`, { player: name, reason: 'Banned by panel' });
    setTimeout(fetchPlayers, 1000);
  };

  const teleportPlayer = async () => {
    if (!tpTarget.player || !tpTarget.target) return;
    await api.post(`/servers/${serverId}/players/teleport`, tpTarget);
    setShowTp(false);
    setTpTarget({ player: '', target: '' });
  };

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Online Players ({players.length})</h3>
        <button className="btn-secondary btn-sm" onClick={fetchPlayers} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-pulse' : ''} /> Refresh
        </button>
      </div>

      {players.length === 0 ? (
        <div className="empty-state">
          <Users size={36} />
          <p style={{ marginTop: 8 }}>No players online</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.name}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => kickPlayer(p.name)} title="Kick">
                        <UserX size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => banPlayer(p.name)} title="Ban" style={{ color: '#ef4444' }}>
                        <Ban size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => { setTpTarget({ player: p.name, target: '' }); setShowTp(true); }} title="Teleport">
                        <MapPin size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTp && (
        <div className="modal-overlay" onClick={() => setShowTp(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Teleport {tpTarget.player}</h2>
            <div className="form-group">
              <label>Target (player name or x y z)</label>
              <input value={tpTarget.target} onChange={e => setTpTarget({...tpTarget, target: e.target.value})} placeholder="player or 0 64 0" />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowTp(false)}>Cancel</button>
              <button className="btn-primary" onClick={teleportPlayer}>Teleport</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
