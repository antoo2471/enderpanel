import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { Save, RefreshCw } from 'lucide-react';

const PROPERTY_GROUPS = {
  'Server': ['server-name', 'motd', 'server-port', 'max-players', 'difficulty', 'gamemode', 'level-name', 'level-seed', 'level-type'],
  'World': ['generate-structures', 'allow-nether', 'spawn-npcs', 'spawn-animals', 'spawn-monsters', 'view-distance', 'simulation-distance', 'max-world-size'],
  'Players': ['pvp', 'allow-flight', 'white-list', 'enforce-whitelist', 'player-idle-timeout', 'op-permission-level', 'force-gamemode', 'hardcore'],
  'Network': ['online-mode', 'network-compression-threshold', 'rate-limit', 'max-tick-time', 'prevent-proxy-connections'],
  'RCON': ['enable-rcon', 'rcon.port', 'rcon.password', 'broadcast-rcon-to-ops'],
  'Query': ['enable-query', 'query.port'],
};

const BOOLEANS = ['allow-nether', 'spawn-npcs', 'spawn-animals', 'spawn-monsters', 'pvp', 'allow-flight', 'white-list', 'enforce-whitelist', 'online-mode', 'enable-rcon', 'broadcast-rcon-to-ops', 'enable-query', 'generate-structures', 'force-gamemode', 'hardcore', 'prevent-proxy-connections'];

export default function ServerSettings({ serverId, server, onUpdate }) {
  const [props, setProps] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverConfig, setServerConfig] = useState({
    name: server?.name || '',
    memory: server?.memory || 1024,
    java_args: server?.java_args || '',
    auto_start: server?.auto_start || false,
  });

  const fetchProps = () => {
    api.get(`/servers/${serverId}/properties`).then(res => setProps(res.data)).catch(() => {});
  };

  useEffect(() => { fetchProps(); }, [serverId]);

  const updateProp = (key, value) => {
    setProps(prev => ({ ...prev, [key]: value }));
  };

  const saveProps = async () => {
    setSaving(true);
    try {
      await api.put(`/servers/${serverId}/properties`, props);
    } catch {}
    setSaving(false);
  };

  const saveConfig = async () => {
    try {
      await api.put(`/servers/${serverId}`, serverConfig);
      onUpdate?.();
    } catch {}
  };

  const allKeys = Object.keys(props);
  const groupedKeys = new Set(Object.values(PROPERTY_GROUPS).flat());
  const otherKeys = allKeys.filter(k => !groupedKeys.has(k));

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Panel Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label>Server Name</label>
            <input value={serverConfig.name} onChange={e => setServerConfig({...serverConfig, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Memory (MB)</label>
            <input type="number" value={serverConfig.memory} onChange={e => setServerConfig({...serverConfig, memory: parseInt(e.target.value)})} />
          </div>
          <div className="form-group">
            <label>Java Arguments</label>
            <input value={serverConfig.java_args} onChange={e => setServerConfig({...serverConfig, java_args: e.target.value})} placeholder="-XX:+UseG1GC" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div className={`toggle ${serverConfig.auto_start ? 'active' : ''}`} onClick={() => setServerConfig({...serverConfig, auto_start: !serverConfig.auto_start})} />
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>Auto-start on panel boot</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary btn-sm" onClick={saveConfig}><Save size={12} /> Save Panel Settings</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>server.properties</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-secondary btn-sm" onClick={fetchProps}><RefreshCw size={12} /> Reload</button>
          <button className="btn-primary btn-sm" onClick={saveProps} disabled={saving}><Save size={12} /> {saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {Object.entries(PROPERTY_GROUPS).map(([group, keys]) => {
        const relevant = keys.filter(k => k in props);
        if (relevant.length === 0) return null;
        return (
          <div key={group} className="card" style={{ marginBottom: 10, padding: 16 }}>
            <h4 style={{ fontSize: 12, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>{group}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              {relevant.map(key => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {BOOLEANS.includes(key) ? (
                    <>
                      <div className={`toggle ${props[key] === 'true' ? 'active' : ''}`} onClick={() => updateProp(key, props[key] === 'true' ? 'false' : 'true')} />
                      <span style={{ fontSize: 13, color: '#a1a1aa' }}>{key}</span>
                    </>
                  ) : (
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label>{key}</label>
                      <input value={props[key] || ''} onChange={e => updateProp(key, e.target.value)} style={{ fontSize: 13 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {otherKeys.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <h4 style={{ fontSize: 12, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Other</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {otherKeys.map(key => (
              <div key={key} className="form-group" style={{ margin: 0 }}>
                <label>{key}</label>
                <input value={props[key] || ''} onChange={e => updateProp(key, e.target.value)} style={{ fontSize: 13 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
