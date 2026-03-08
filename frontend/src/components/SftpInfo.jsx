import React from 'react';
import { Upload, Copy, Check } from 'lucide-react';

export default function SftpInfo({ server }) {
  const [copied, setCopied] = React.useState(null);

  const copy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const sftpHost = window.location.hostname;
  const sftpPort = 8382;

  const fields = [
    { label: 'Host', value: sftpHost },
    { label: 'Port', value: String(sftpPort) },
    { label: 'Username', value: 'Your panel username' },
    { label: 'Password', value: 'Your panel password' },
    { label: 'Protocol', value: 'SFTP' },
    { label: 'Server Directory', value: `/${server.name}` },
  ];

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <div className="card" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>SFTP Connection</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#71717a' }}>Use any SFTP client to connect</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fields.map(f => (
            <div key={f.label} style={styles.field}>
              <span style={styles.fieldLabel}>{f.label}</span>
              <div style={styles.fieldValue}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{f.value}</span>
                <button className="btn-icon" onClick={() => copy(f.value, f.label)} style={{ padding: 4 }}>
                  {copied === f.label ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.quickConnect}>
          <span style={{ fontSize: 12, color: '#71717a' }}>Quick connect command:</span>
          <div style={styles.commandBox}>
            <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#a1a1aa' }}>
              sftp -P {sftpPort} user@{sftpHost}
            </code>
            <button className="btn-icon" onClick={() => copy(`sftp -P ${sftpPort} user@${sftpHost}`, 'cmd')} style={{ padding: 4 }}>
              {copied === 'cmd' ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  field: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e1e1e' },
  fieldLabel: { fontSize: 12, color: '#71717a', fontWeight: 500 },
  fieldValue: { display: 'flex', alignItems: 'center', gap: 6 },
  quickConnect: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e1e1e' },
  commandBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111', borderRadius: 6, padding: '8px 12px', marginTop: 6 },
};
