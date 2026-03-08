import { verifyToken } from '../auth.js';
import { statsCollector } from '../services/statsCollector.js';

export function setupStatsWs(wss) {
  const clients = new Map();

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

    clients.set(ws, serverId);

    const history = statsCollector.getHistory(serverId);
    ws.send(JSON.stringify({ type: 'history', data: history }));

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  setInterval(() => {
    clients.forEach((serverId, ws) => {
      if (ws.readyState !== 1) {
        clients.delete(ws);
        return;
      }
      const stats = statsCollector.getStats(serverId);
      ws.send(JSON.stringify({ type: 'stats', data: stats }));
    });
  }, 2000);
}
