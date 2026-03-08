import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Cpu, MemoryStick, HardDrive, Gauge, Users } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</div>
      ))}
    </div>
  );
};

function StatCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e4e4e7' }}>{value}<span style={{ fontSize: 12, color: '#71717a', marginLeft: 3 }}>{unit}</span></div>
        <div style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      </div>
    </div>
  );
}

function MiniChart({ data, dataKey, color, name }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: '#71717a', marginBottom: 10, fontWeight: 500 }}>{name}</div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" hide />
          <YAxis hide domain={dataKey === 'tps' ? [0, 25] : ['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#g-${dataKey})`} strokeWidth={2} name={name} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StatsCharts({ serverId }) {
  const { messages } = useWebSocket('/ws/stats', { server: serverId });

  const history = messages.filter(m => m.type === 'history').flatMap(m => m.data || []);
  const live = messages.filter(m => m.type === 'stats').map(m => m.data);
  const allData = [...history, ...live].slice(-60).map((d, i) => ({ ...d, idx: i }));

  const latest = allData[allData.length - 1] || { cpu: 0, memory: 0, disk: 0, tps: 20.0, players: 0 };

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        <StatCard icon={Cpu} label="CPU Usage" value={latest.cpu.toFixed(1)} unit="%" color="#3b82f6" />
        <StatCard icon={MemoryStick} label="Memory" value={latest.memory} unit="MB" color="#a855f7" />
        <StatCard icon={HardDrive} label="Disk Usage" value={latest.disk} unit="MB" color="#f97316" />
        <StatCard icon={Gauge} label="TPS" value={latest.tps.toFixed(1)} unit="" color="#22c55e" />
        <StatCard icon={Users} label="Players" value={latest.players} unit="" color="#eab308" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
        <MiniChart data={allData} dataKey="cpu" color="#3b82f6" name="CPU (%)" />
        <MiniChart data={allData} dataKey="memory" color="#a855f7" name="Memory (MB)" />
        <MiniChart data={allData} dataKey="disk" color="#f97316" name="Disk (MB)" />
        <MiniChart data={allData} dataKey="tps" color="#22c55e" name="TPS" />
        <MiniChart data={allData} dataKey="players" color="#eab308" name="Players" />
      </div>
    </div>
  );
}
