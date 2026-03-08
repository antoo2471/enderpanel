import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import NodeCard from '../components/NodeCard.jsx';
import { Plus, Network, X } from 'lucide-react';

export default function Nodes() {
  const [nodes, setNodes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', host: '', port: 31357, cpu_cores: 0, ram_total: 0 });

  const fetchNodes = () => {
    api.get('/nodes').then(res => setNodes(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  const addNode = async (e) => {
    e.preventDefault();
    try {
      await api.post('/nodes', form);
      setShowAdd(false);
      setForm({ name: '', host: '', port: 31357, cpu_cores: 0, ram_total: 0 });
      fetchNodes();
    } catch {}
  };

  const deleteNode = async (id) => {
    if (!confirm('Remove this node?')) return;
    await api.delete(`/nodes/${id}`);
    fetchNodes();
  };

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Nodes</h1>
          <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>{nodes.length} node{nodes.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)} id="add-node-btn">
          <Plus size={16} /> Add Node
        </button>
      </div>

      {nodes.length === 0 ? (
        <div className="empty-state">
          <Network size={48} />
          <p style={{ marginTop: 8 }}>No nodes registered</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {nodes.map(node => (
            <NodeCard key={node.id} node={node} onDelete={() => deleteNode(node.id)} />
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Add Node</h2>
              <button className="btn-icon" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addNode}>
              <div className="form-group">
                <label>Node Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="node-01" />
              </div>
              <div className="form-group">
                <label>Host</label>
                <input value={form.host} onChange={e => setForm({...form, host: e.target.value})} required placeholder="192.168.1.100" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Port</label>
                  <input type="number" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label>CPU Cores</label>
                  <input type="number" value={form.cpu_cores} onChange={e => setForm({...form, cpu_cores: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label>RAM (MB)</label>
                  <input type="number" value={form.ram_total} onChange={e => setForm({...form, ram_total: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Node</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
