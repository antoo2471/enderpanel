import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client.js';
import { LayoutDashboard, Server, Network, Users, ChevronDown, ChevronRight } from 'lucide-react';

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [servers, setServers] = useState([]);
  const [serversOpen, setServersOpen] = useState(true);

  useEffect(() => {
    api.get('/servers').then(res => setServers(res.data)).catch(() => {});
    const interval = setInterval(() => {
      api.get('/servers').then(res => setServers(res.data)).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/nodes', label: 'Nodes', icon: Network },
    { path: '/users', label: 'Users', icon: Users },
  ];

  const isActive = (path) => location.pathname === path;
  const isServerActive = (id) => location.pathname === `/servers/${id}`;

  return (
    <nav style={styles.nav}>
      {navItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{ ...styles.navItem, ...(isActive(item.path) ? styles.navItemActive : {}) }}
            title={collapsed ? item.label : undefined}
          >
            <Icon size={16} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        );
      })}

      <div style={styles.divider} />

      <button
        onClick={() => setServersOpen(!serversOpen)}
        style={styles.sectionHeader}
        title={collapsed ? 'Servers' : undefined}
      >
        <Server size={16} />
        {!collapsed && (
          <>
            <span style={{ flex: 1, textAlign: 'left' }}>Servers</span>
            {serversOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </>
        )}
      </button>

      {serversOpen && !collapsed && servers.map(server => (
        <button
          key={server.id}
          onClick={() => navigate(`/servers/${server.id}`)}
          style={{ ...styles.serverItem, ...(isServerActive(server.id) ? styles.navItemActive : {}) }}
        >
          <div style={{ ...styles.statusDot, background: server.online ? '#22c55e' : '#71717a' }} />
          <span style={styles.serverName}>{server.name}</span>
        </button>
      ))}
    </nav>
  );
}

const styles = {
  nav: { flex: 1, padding: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
    border: 'none', background: 'transparent', color: '#a1a1aa',
    cursor: 'pointer', borderRadius: 6, fontSize: 13, fontWeight: 500,
    transition: 'all 150ms ease', width: '100%', textAlign: 'left',
  },
  navItemActive: { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
  divider: { height: 1, background: '#1e1e1e', margin: '6px 0' },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
    border: 'none', background: 'transparent', color: '#71717a',
    cursor: 'pointer', borderRadius: 6, fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.5px', width: '100%',
  },
  serverItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 20px',
    border: 'none', background: 'transparent', color: '#a1a1aa',
    cursor: 'pointer', borderRadius: 6, fontSize: 13, width: '100%',
    textAlign: 'left', transition: 'all 150ms ease',
  },
  statusDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  serverName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
