import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import FileEditor from './FileEditor.jsx';
import { Folder, File, ChevronRight, ArrowLeft, Plus, Trash2, Pencil, Download, FolderPlus, FilePlus, X } from 'lucide-react';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function FileExplorer({ serverId }) {
  const [currentPath, setCurrentPath] = useState('/');
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameName, setRenameName] = useState('');

  const fetchDir = (p) => {
    api.get(`/servers/${serverId}/files`, { params: { path: p } }).then(res => {
      if (res.data.type === 'directory') {
        setEntries(res.data.entries || []);
        setCurrentPath(p);
      }
    }).catch(() => {});
  };

  useEffect(() => { fetchDir('/'); }, [serverId]);

  const openEntry = (entry) => {
    const fullPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
    if (entry.type === 'directory') {
      fetchDir(fullPath);
    } else {
      setEditing(fullPath);
    }
  };

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    fetchDir('/' + parts.join('/'));
  };

  const deleteEntry = async (entry) => {
    if (!confirm(`Delete ${entry.name}?`)) return;
    const fullPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
    await api.delete(`/servers/${serverId}/files`, { params: { path: fullPath } });
    fetchDir(currentPath);
  };

  const createEntry = async (type) => {
    if (!newName.trim()) return;
    const fullPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;
    if (type === 'directory') {
      await api.post(`/servers/${serverId}/files/directory`, { path: fullPath });
    } else {
      await api.put(`/servers/${serverId}/files/content`, { path: fullPath, content: '' });
    }
    setShowCreate(null);
    setNewName('');
    fetchDir(currentPath);
  };

  const renameEntry = async (entry) => {
    if (!renameName.trim()) return;
    const oldPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
    const newPath = currentPath === '/' ? `/${renameName}` : `${currentPath}/${renameName}`;
    await api.post(`/servers/${serverId}/files/rename`, { oldPath, newPath });
    setRenaming(null);
    setRenameName('');
    fetchDir(currentPath);
  };

  if (editing) {
    return <FileEditor serverId={serverId} filePath={editing} onClose={() => { setEditing(null); fetchDir(currentPath); }} />;
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.breadcrumbs}>
          <button className="btn-icon" onClick={goUp} disabled={currentPath === '/'}>
            <ArrowLeft size={14} />
          </button>
          <button style={styles.crumb} onClick={() => fetchDir('/')}>root</button>
          {breadcrumbs.map((part, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={12} style={{ color: '#71717a' }} />
              <button style={styles.crumb} onClick={() => fetchDir('/' + breadcrumbs.slice(0, i + 1).join('/'))}>{part}</button>
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={() => setShowCreate('file')} title="New File">
            <FilePlus size={14} />
          </button>
          <button className="btn-icon" onClick={() => setShowCreate('directory')} title="New Folder">
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {showCreate && (
        <div style={styles.createBar}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`New ${showCreate} name...`}
            style={styles.miniInput}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') createEntry(showCreate); if (e.key === 'Escape') setShowCreate(null); }}
          />
          <button className="btn-primary btn-sm" onClick={() => createEntry(showCreate)}>Create</button>
          <button className="btn-icon" onClick={() => setShowCreate(null)}><X size={14} /></button>
        </div>
      )}

      <div style={styles.list}>
        {entries.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <Folder size={32} />
            <p style={{ marginTop: 8 }}>Empty directory</p>
          </div>
        ) : entries.map(entry => (
          <div key={entry.name} style={styles.entry} onDoubleClick={() => openEntry(entry)}>
            <div style={styles.entryLeft} onClick={() => openEntry(entry)}>
              {entry.type === 'directory' ? <Folder size={16} style={{ color: '#3b82f6' }} /> : <File size={16} style={{ color: '#71717a' }} />}
              {renaming === entry.name ? (
                <input
                  value={renameName}
                  onChange={e => setRenameName(e.target.value)}
                  style={styles.miniInput}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') renameEntry(entry); if (e.key === 'Escape') setRenaming(null); }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span style={styles.entryName}>{entry.name}</span>
              )}
            </div>
            <div style={styles.entryRight}>
              {entry.type === 'file' && <span style={styles.entrySize}>{formatSize(entry.size)}</span>}
              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setRenaming(entry.name); setRenameName(entry.name); }} title="Rename">
                <Pencil size={12} />
              </button>
              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); deleteEntry(entry); }} title="Delete" style={{ color: '#ef4444' }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #1e1e1e' },
  breadcrumbs: { display: 'flex', alignItems: 'center', gap: 4 },
  crumb: { background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: 13, padding: '2px 4px', borderRadius: 4 },
  createBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' },
  miniInput: { padding: '4px 8px', fontSize: 13, background: '#111', border: '1px solid #1e1e1e', borderRadius: 4, color: '#e4e4e7' },
  list: { flex: 1, overflowY: 'auto' },
  entry: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid #111', cursor: 'pointer', transition: 'background 150ms' },
  entryLeft: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' },
  entryName: { fontSize: 13, color: '#e4e4e7' },
  entryRight: { display: 'flex', alignItems: 'center', gap: 4 },
  entrySize: { fontSize: 11, color: '#71717a', marginRight: 8 },
};
