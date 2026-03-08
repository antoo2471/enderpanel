import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import Console from '../components/Console.jsx';
import StatsCharts from '../components/StatsCharts.jsx';
import PlayerList from '../components/PlayerList.jsx';
import FileExplorer from '../components/FileExplorer.jsx';
import ServerSettings from '../components/ServerSettings.jsx';
import SftpInfo from '../components/SftpInfo.jsx';
import ScheduleManager from '../components/ScheduleManager.jsx';
import PermissionManager from '../components/PermissionManager.jsx';
import BackupManager from '../components/BackupManager.jsx';
import { Play, Square, RotateCw, Terminal, BarChart3, Users, FolderOpen, Settings, Upload, Clock, Shield, Archive, ArrowLeft, Skull } from 'lucide-react';

const TABS = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'sftp', label: 'SFTP', icon: Upload },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'users', label: 'Users', icon: Shield },
  { id: 'backups', label: 'Backups', icon: Archive },
];

export default function ServerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(null);
  const [tab, setTab] = useState('console');
  const [loading, setLoading] = useState(false);

  const fetchServer = () => {
    api.get(`/servers/${id}`).then(res => setServer(res.data)).catch(() => navigate('/'));
  };

  useEffect(() => {
    fetchServer();
    const interval = setInterval(fetchServer, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const action = async (act) => {
    setLoading(true);
    try {
      await api.post(`/servers/${id}/${act}`);
      setTimeout(fetchServer, 500);
    } catch {}
    setLoading(false);
  };

  if (!server) return <div style={{ padding: 24 }}>Loading...</div>;

  const isRunning = server.online;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button className="btn-icon" onClick={() => navigate('/')} id="back-btn">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>{server.name}</h1>
              <span className={`badge ${isRunning ? 'badge-green' : 'badge-red'}`}>
                {isRunning ? 'Online' : 'Offline'}
              </span>
            </div>
            <p style={styles.meta}>{server.type} {server.version} &middot; Port {server.port} &middot; {server.memory}MB</p>
          </div>
        </div>
        <div style={styles.actions}>
          {!isRunning && (
            <button className="btn-primary" onClick={() => action('start')} disabled={loading} id="start-btn">
              <Play size={14} /> Start
            </button>
          )}
          {isRunning && (
            <>
              <button className="btn-secondary" onClick={() => action('restart')} disabled={loading} id="restart-btn">
                <RotateCw size={14} /> Restart
              </button>
              <button className="btn-danger" onClick={() => action('stop')} disabled={loading} id="stop-btn">
                <Square size={14} /> Stop
              </button>
              <button className="btn-icon" onClick={() => action('kill')} title="Force Kill" id="kill-btn" style={{ color: '#ef4444' }}>
                <Skull size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div style={styles.tabs}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.content}>
        {tab === 'console' && <Console serverId={id} />}
        {tab === 'stats' && <StatsCharts serverId={id} />}
        {tab === 'players' && <PlayerList serverId={id} />}
        {tab === 'files' && <FileExplorer serverId={id} />}
        {tab === 'settings' && <ServerSettings serverId={id} server={server} onUpdate={fetchServer} />}
        {tab === 'sftp' && <SftpInfo server={server} />}
        {tab === 'schedule' && <ScheduleManager serverId={id} />}
        {tab === 'users' && <PermissionManager serverId={id} />}
        {tab === 'backups' && <BackupManager serverId={id} />}
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #1e1e1e' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '20px', fontWeight: '700', margin: 0 },
  meta: { fontSize: '12px', color: '#71717a', marginTop: '2px' },
  actions: { display: 'flex', gap: '8px', alignItems: 'center' },
  tabs: { display: 'flex', gap: '2px', padding: '0 24px', borderBottom: '1px solid #1e1e1e', overflowX: 'auto', flexShrink: 0 },
  tab: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px',
    border: 'none', background: 'transparent', color: '#71717a',
    fontSize: '13px', fontWeight: '500', cursor: 'pointer',
    borderBottom: '2px solid transparent', transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
  },
  tabActive: { color: '#3b82f6', borderBottomColor: '#3b82f6' },
  content: { flex: 1, overflow: 'hidden' },
};
