import React from 'react';
import { Cpu, MemoryStick, Trash2, Wifi, WifiOff } from 'lucide-react';

export default function NodeCard({ node, onDelete }) {
  const isOnline = node.status === 'online';

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isOnline ? <Wifi size={16} style={{ color: '#22c55e' }} /> : <WifiOff size={16} style={{ color: '#71717a' }} />}
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{node.name}</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#71717a' }}>{node.host}:{node.port}</p>
          </div>
        </div>
        <span className={`badge ${isOnline ? 'badge-green' : 'badge-red'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={14} style={{ color: '#71717a' }} />
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>{node.cpu_cores} cores</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MemoryStick size={14} style={{ color: '#71717a' }} />
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>{node.ram_total >= 1024 ? `${(node.ram_total / 1024).toFixed(1)} GB` : `${node.ram_total} MB`}</span>
        </div>
      </div>

      {node.last_heartbeat && (
        <p style={{ fontSize: 11, color: '#71717a', marginBottom: 10 }}>
          Last heartbeat: {new Date(node.last_heartbeat).toLocaleString()}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-icon" onClick={onDelete} style={{ color: '#ef4444' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
