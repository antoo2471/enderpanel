import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { Plus, Pencil, Trash2, Shield, X, UserPlus } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });

  const fetchUsers = () => {
    api.get('/users').then(res => setUsers(res.data)).catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setShowCreate(false);
      setForm({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch {}
  };

  const updateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { username: form.username, role: form.role };
      if (form.password) payload.password = form.password;
      await api.put(`/users/${editUser.id}`, payload);
      setEditUser(null);
      setForm({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch {}
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/users/${id}`);
    fetchUsers();
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ username: user.username, password: '', role: user.role });
  };

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Users</h1>
          <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowCreate(true); setForm({ username: '', password: '', role: 'user' }); }} id="create-user-btn">
          <UserPlus size={16} /> New User
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.username}</td>
                <td>
                  <span className={`badge ${user.role === 'admin' ? 'badge-blue' : 'badge-yellow'}`}>
                    <Shield size={10} /> {user.role}
                  </span>
                </td>
                <td style={{ color: '#71717a' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-icon" onClick={() => openEdit(user)}><Pencil size={14} /></button>
                    <button className="btn-icon" onClick={() => deleteUser(user.id)} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showCreate || editUser) && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditUser(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{editUser ? 'Edit User' : 'Create User'}</h2>
              <button className="btn-icon" onClick={() => { setShowCreate(false); setEditUser(null); }}><X size={18} /></button>
            </div>
            <form onSubmit={editUser ? updateUser : createUser}>
              <div className="form-group">
                <label>Username</label>
                <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editUser} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowCreate(false); setEditUser(null); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
