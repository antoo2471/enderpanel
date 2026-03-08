import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { Terminal, Trash2, ArrowDown } from 'lucide-react';

export default function Console({ serverId }) {
  const [command, setCommand] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const logsRef = useRef(null);
  const { messages, connected, send, clear } = useWebSocket('/ws/console', { server: serverId });

  useEffect(() => {
    if (autoScroll && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    send({ type: 'command', data: command });
    setHistory(prev => [command, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);
    setCommand('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIdx < history.length - 1) {
        const idx = historyIdx + 1;
        setHistoryIdx(idx);
        setCommand(history[idx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const idx = historyIdx - 1;
        setHistoryIdx(idx);
        setCommand(history[idx]);
      } else {
        setHistoryIdx(-1);
        setCommand('');
      }
    }
  };

  const colorize = (text) => {
    if (text.includes('WARN')) return '#eab308';
    if (text.includes('ERROR') || text.includes('SEVERE')) return '#ef4444';
    if (text.startsWith('>')) return '#3b82f6';
    if (text.includes('[EnderPanel]')) return '#a855f7';
    return '#a1a1aa';
  };

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.status}>
          <div style={{ ...styles.dot, background: connected ? '#22c55e' : '#ef4444' }} />
          <span style={{ fontSize: 12, color: '#71717a' }}>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div style={styles.toolbarActions}>
          <button className="btn-icon" onClick={() => setAutoScroll(!autoScroll)} title="Auto-scroll" style={{ color: autoScroll ? '#3b82f6' : '#71717a' }}>
            <ArrowDown size={14} />
          </button>
          <button className="btn-icon" onClick={clear} title="Clear">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div ref={logsRef} style={styles.logs}>
        {messages.length === 0 ? (
          <div style={styles.empty}>
            <Terminal size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <span>Waiting for console output...</span>
          </div>
        ) : messages.map((msg, i) => (
          <div key={i} style={{ ...styles.logLine, color: colorize(msg.data || msg.line || '') }}>
            {msg.data || msg.line || JSON.stringify(msg)}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={styles.inputRow}>
        <span style={styles.prompt}>&gt;</span>
        <input
          id="console-input"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          style={styles.input}
          autoFocus
          spellCheck={false}
        />
      </form>
    </div>
  );
}

const styles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column' },
  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 16px', borderBottom: '1px solid #1e1e1e',
  },
  status: { display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: '50%' },
  toolbarActions: { display: 'flex', gap: 2 },
  logs: {
    flex: 1, overflowY: 'auto', padding: '8px 16px',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.6,
    background: '#050505',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13,
  },
  logLine: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  inputRow: {
    display: 'flex', alignItems: 'center', padding: '0 16px',
    borderTop: '1px solid #1e1e1e', background: '#050505',
  },
  prompt: { color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 },
  input: {
    flex: 1, padding: '10px 8px', background: 'transparent',
    border: 'none', color: '#e4e4e7',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
  },
};
