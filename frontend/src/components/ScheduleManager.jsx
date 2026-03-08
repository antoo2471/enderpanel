import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { Plus, Pencil, Trash2, Clock, X, Play, Pause } from 'lucide-react';

const ACTION_OPTIONS = [
  { value: 'command', label: 'Run Command' },
  { value: 'start', label: 'Start Server' },
  { value: 'stop', label: 'Stop Server' },
  { value: 'restart', label: 'Restart Server' },
  { value: 'backup', label: 'Create Backup' },
];

export default function ScheduleManager({ serverId }) {
  const [schedules, setSchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', cron: '0 */6 * * *', action: 'command', payload: '' });

  const fetch = () => {
    api.get(`/servers/${serverId}/schedules`).then(res => setSchedules(res.data)).catch(() => {});
  };

  useEffect(() => { fetch(); }, [serverId]);

  const submit = async (e) => {
    e.preventDefault();
    if (editing) {
      await api.put(`/servers/${serverId}/schedules/${editing}`, form);
    } else {
      await api.post(`/servers/${serverId}/schedules`, form);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', cron: '0 */6 * * *', action: 'command', payload: '' });
    fetch();
  };

  const toggle = async (sched) => {
    await api.put(`/servers/${serverId}/schedules/${sched.id}`, { ...sched, enabled: !sched.enabled });
    fetch();
  };

  const remove = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    await api.delete(`/servers/${serverId}/schedules/${id}`);
    fetch();
  };

  const edit = (sched) => {
    setEditing(sched.id);
    setForm({ name: sched.name, cron: sched.cron, action: sched.action, payload: sched.payload });
    setShowForm(true);
  };

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Scheduled Tasks</h3>
        <button className="btn-primary btn-sm" onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', cron: '0 */6 * * *', action: 'command', payload: '' }); }}>
          <Plus size={14} /> New Task
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="empty-state">
          <Clock size={36} />
          <p style={{ marginTop: 8 }}>No scheduled tasks</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Cron</th>
                <th>Action</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td><code style={{ fontSize: 12, color: '#a1a1aa', fontFamily: "'JetBrains Mono', monospace" }}>{s.cron}</code></td>
                  <td><span className="badge badge-blue">{s.action}</span></td>
                  <td>
                    <div className={`toggle ${s.enabled ? 'active' : ''}`} onClick={() => toggle(s)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => edit(s)}><Pencil size={14} /></button>
                      <button className="btn-icon" onClick={() => remove(s.id)} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{editing ? 'Edit Task' : 'New Task'}</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Task Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Daily backup" />
              </div>
              <div className="form-group">
                <label>Cron Expression</label>
                <input value={form.cron} onChange={e => setForm({...form, cron: e.target.value})} required placeholder="0 */6 * * *" />
                <small style={{ color: '#71717a', fontSize: 11 }}>Format: minute hour day month weekday</small>
              </div>
              <div className="form-group">
                <label>Action</label>
                <select value={form.action} onChange={e => setForm({...form, action: e.target.value})}>
                  {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {form.action === 'command' && (
                <div className="form-group">
                  <label>Command</label>
                  <input value={form.payload} onChange={e => setForm({...form, payload: e.target.value})} placeholder="say Server restart in 5 minutes" />
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
