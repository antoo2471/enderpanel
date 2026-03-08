import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import ServerCard from '../components/ServerCard.jsx';
import { Plus, Server, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import ServerWizard from '../components/ServerWizard.jsx';

export default function Dashboard() {
  const [servers, setServers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'vanilla', version: '1.21.4', port: 25565, memory: 1024 });
  const navigate = useNavigate();

  const fetchServers = () => {
    api.get('/servers').then(res => setServers(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleServerCreated = (server) => {
    setShowCreate(false);
    navigate(`/servers/${server.id}`);
  };

  const running = servers.filter(s => s.online).length;
  const totalPlayers = 0;
  const totalMem = servers.reduce((sum, s) => sum + s.memory, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>{servers.length} server{servers.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)} id="create-server-btn">
          <Plus size={16} />
          New Server
        </button>
      </div>

      <div style={styles.statsRow}>
        <div className="card" style={styles.statCard}>
          <Server size={18} style={{ color: '#3b82f6' }} />
          <div style={styles.statInfo}>
            <div className="stat-value">{running}</div>
            <div className="stat-label">Running</div>
          </div>
        </div>
        <div className="card" style={styles.statCard}>
          <Cpu size={18} style={{ color: '#a855f7' }} />
          <div style={styles.statInfo}>
            <div className="stat-value">{servers.length}</div>
            <div className="stat-label">Total Servers</div>
          </div>
        </div>
        <div className="card" style={styles.statCard}>
          <MemoryStick size={18} style={{ color: '#22c55e' }} />
          <div style={styles.statInfo}>
            <div className="stat-value">{totalMem >= 1024 ? `${(totalMem/1024).toFixed(1)}G` : `${totalMem}M`}</div>
            <div className="stat-label">Allocated RAM</div>
          </div>
        </div>
      </div>

      {servers.length === 0 ? (
        <div className="empty-state">
          <HardDrive size={48} />
          <p style={{ marginTop: 8, fontSize: 14 }}>No servers configured yet</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Your First Server
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {servers.map(server => (
            <ServerCard key={server.id} server={server} onClick={() => navigate(`/servers/${server.id}`)} onRefresh={fetchServers} />
          ))}
        </div>
      )}

      {showCreate && (
        <ServerWizard 
          onClose={() => setShowCreate(false)} 
          onSuccess={handleServerCreated} 
        />
      )}
    </div>
  );
}

const styles = {
  container: { padding: '24px', height: '100%', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', margin: 0 },
  subtitle: { fontSize: '13px', color: '#71717a', marginTop: '4px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' },
  statInfo: { flex: 1 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' },
};
