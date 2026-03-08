import { verifyToken } from '../auth.js';
import { serverManager } from '../services/serverManager.js';

export function setupConsoleWs(wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const serverId = url.searchParams.get('server');

    if (!token || !serverId) {
      ws.close(4001, 'Missing token or server');
      return;
    }

    try {
      verifyToken(token);
    } catch {
      ws.close(4003, 'Invalid token');
      return;
    }

    const existingLogs = serverManager.getLogs(serverId);
    existingLogs.forEach(entry => {
      ws.send(JSON.stringify({ type: 'log', data: entry.line }));
    });

    const onLog = (sid, line) => {
      if (sid === serverId && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'log', data: line }));
      }
    };

    const onStopped = (sid) => {
      if (sid === serverId && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'status', data: 'stopped' }));
      }
    };

    const onStarted = (sid) => {
      if (sid === serverId && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'status', data: 'running' }));
      }
    };

    serverManager.on('log', onLog);
    serverManager.on('stopped', onStopped);
    serverManager.on('started', onStarted);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'command' && msg.data) {
          serverManager.sendCommand(serverId, msg.data);
        }
      } catch {}
    });

    ws.on('close', () => {
      serverManager.off('log', onLog);
      serverManager.off('stopped', onStopped);
      serverManager.off('started', onStarted);
    });
  });
}
