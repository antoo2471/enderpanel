import React from 'react';
import api from '../api/client.js';
import { Play, Square, MemoryStick, Users, Globe } from 'lucide-react';

export default function ServerCard({ server, onClick, onRefresh }) {
  const isRunning = server.online;

  const quickAction = async (e, action) => {
    e.stopPropagation();
    try {
      await api.post(`/servers/${server.id}/${action}`);
      setTimeout(onRefresh, 500);
    } catch {}
  };

  return (
    <div className="card" style={styles.card} onClick={onClick} id={`server-card-${server.id}`}>
      <div style={styles.header}>
        <div style={styles.info}>
          <div style={styles.nameRow}>
            <div style={{ ...styles.dot, background: isRunning ? '#22c55e' : '#71717a' }} />
            <h3 style={styles.name}>{server.name}</h3>
          </div>
          <span className={`badge ${isRunning ? 'badge-green' : 'badge-red'}`}>
            {isRunning ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      <div style={styles.details}>
        <div style={styles.detail}>
          <Globe size={12} style={{ color: '#71717a' }} />
          <span style={styles.detailText}>{server.type} {server.version}</span>
        </div>
        <div style={styles.detail}>
          <MemoryStick size={12} style={{ color: '#71717a' }} />
          <span style={styles.detailText}>{server.memory}MB</span>
        </div>
        <div style={styles.detail}>
          <Users size={12} style={{ color: '#71717a' }} />
          <span style={styles.detailText}>Port {server.port}</span>
        </div>
      </div>
      <div style={styles.footer}>
        {isRunning ? (
          <button className="btn-danger btn-sm" onClick={(e) => quickAction(e, 'stop')}>
            <Square size={12} /> Stop
          </button>
        ) : (
          <button className="btn-primary btn-sm" onClick={(e) => quickAction(e, 'start')}>
            <Play size={12} /> Start
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: { cursor: 'pointer', padding: 16 },
  header: { marginBottom: 12 },
  info: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: '50%' },
  name: { fontSize: 15, fontWeight: 600, margin: 0 },
  details: { display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' },
  detail: { display: 'flex', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#a1a1aa' },
  footer: { display: 'flex', justifyContent: 'flex-end' },
};
