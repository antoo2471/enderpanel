import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import api from '../api/client.js';
import { Save, X, FileCode } from 'lucide-react';

export default function FileEditor({ serverId, filePath, onClose }) {
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/servers/${serverId}/files/content`, { params: { path: filePath } })
      .then(res => {
        setContent(res.data.content);
        setOriginal(res.data.content);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serverId, filePath]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/servers/${serverId}/files/content`, { path: filePath, content });
      setOriginal(content);
    } catch {}
    setSaving(false);
  };

  const getLanguage = (path) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const map = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      json: 'json', yml: 'yaml', yaml: 'yaml', xml: 'xml', html: 'html',
      css: 'css', md: 'markdown', py: 'python', java: 'java', sh: 'shell',
      properties: 'ini', toml: 'ini', cfg: 'ini', conf: 'ini', txt: 'plaintext',
      log: 'plaintext', mcmeta: 'json',
    };
    return map[ext] || 'plaintext';
  };

  const hasChanges = content !== original;
  const fileName = filePath.split('/').pop();

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.fileInfo}>
          <FileCode size={14} style={{ color: '#3b82f6' }} />
          <span style={styles.fileName}>{fileName}</span>
          <span style={styles.filePath}>{filePath}</span>
          {hasChanges && <span style={styles.modified}>Modified</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-primary btn-sm" onClick={save} disabled={saving || !hasChanges} id="save-file-btn">
            <Save size={12} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            <X size={12} /> Close
          </button>
        </div>
      </div>
      <div style={styles.editor}>
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : (
          <Editor
            height="100%"
            language={getLanguage(filePath)}
            value={content}
            onChange={(v) => setContent(v || '')}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: true, scale: 1 },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              automaticLayout: true,
              padding: { top: 8 },
            }}
            onMount={(editor) => {
              editor.addCommand(2097, save);
            }}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column' },
  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 16px', borderBottom: '1px solid #1e1e1e', background: '#0a0a0a',
  },
  fileInfo: { display: 'flex', alignItems: 'center', gap: 8 },
  fileName: { fontSize: 13, fontWeight: 600, color: '#e4e4e7' },
  filePath: { fontSize: 11, color: '#71717a' },
  modified: { fontSize: 10, color: '#eab308', background: '#422006', padding: '1px 6px', borderRadius: 4, fontWeight: 600 },
  editor: { flex: 1, overflow: 'hidden' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a' },
};
