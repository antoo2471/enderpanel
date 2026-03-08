import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div style={styles.layout}>
      <aside style={{ ...styles.sidebar, width: collapsed ? 60 : 240 }}>
        <div style={styles.sidebarHeader}>
          {!collapsed && (
            <div style={styles.brand}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span style={styles.brandText}>EnderPanel</span>
            </div>
          )}
          <button className="btn-icon" onClick={() => setCollapsed(!collapsed)} id="toggle-sidebar">
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>
        <Sidebar collapsed={collapsed} />
        <div style={styles.sidebarFooter}>
          {!collapsed && (
            <div style={styles.userInfo}>
              <div style={styles.avatar}>{user?.username?.[0]?.toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.username}>{user?.username}</div>
                <div style={styles.role}>{user?.role}</div>
              </div>
            </div>
          )}
          <button className="btn-secondary btn-sm" onClick={logout} style={{ width: collapsed ? '100%' : 'auto' }} id="logout-btn">
            {collapsed ? '...' : 'Logout'}
          </button>
        </div>
      </aside>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: {
    background: '#0a0a0a', borderRight: '1px solid #1e1e1e',
    display: 'flex', flexDirection: 'column', transition: 'width 200ms ease',
    flexShrink: 0, overflow: 'hidden',
  },
  sidebarHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px', borderBottom: '1px solid #1e1e1e', minHeight: 52,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 16, fontWeight: 700, color: '#e4e4e7', whiteSpace: 'nowrap' },
  main: { flex: 1, overflow: 'hidden', background: '#000' },
  sidebarFooter: {
    padding: '12px', borderTop: '1px solid #1e1e1e',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: 6,
    background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600, flexShrink: 0,
  },
  username: { fontSize: 13, fontWeight: 500, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  role: { fontSize: 11, color: '#71717a', textTransform: 'capitalize' },
};
