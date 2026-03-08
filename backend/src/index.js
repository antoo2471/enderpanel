import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './db.js';
import { authMiddleware } from './auth.js';
import { setupConsoleWs } from './ws/console.js';
import { setupStatsWs } from './ws/stats.js';
import { statsCollector } from './services/statsCollector.js';
import { scheduler } from './services/scheduler.js';
import { nodeManager } from './services/nodeManager.js';
import { sftpService } from './services/sftpServer.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import serverRoutes from './routes/servers.js';
import fileRoutes from './routes/files.js';
import backupRoutes from './routes/backups.js';
import scheduleRoutes from './routes/schedules.js';
import nodeRoutes from './routes/nodes.js';
import playerRoutes from './routes/players.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '31357');
const HOST = process.env.HOST || '127.0.0.1';
const SFTP_PORT = parseInt(process.env.SFTP_PORT || '8382');

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const staticPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(staticPath));

app.use('/api/auth', authRoutes);

app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/servers', authMiddleware, serverRoutes);
app.use('/api/servers', authMiddleware, fileRoutes);
app.use('/api/servers', authMiddleware, backupRoutes);
app.use('/api/servers', authMiddleware, scheduleRoutes);
app.use('/api/servers', authMiddleware, playerRoutes);
app.use('/api/nodes', authMiddleware, nodeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(staticPath, 'index.html'));
  }
});

const consoleWss = new WebSocketServer({ noServer: true });
const statsWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/ws/console') {
    consoleWss.handleUpgrade(request, socket, head, (ws) => {
      consoleWss.emit('connection', ws, request);
    });
  } else if (url.pathname === '/ws/stats') {
    statsWss.handleUpgrade(request, socket, head, (ws) => {
      statsWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

setupConsoleWs(consoleWss);
setupStatsWs(statsWss);

async function start() {
  console.log('');
  console.log('  ╔═══════════════════════════════════╗');
  console.log('  ║         E N D E R P A N E L       ║');
  console.log('  ║   Minecraft Server Management     ║');
  console.log('  ╚═══════════════════════════════════╝');
  console.log('');

  await initDatabase();
  statsCollector.start();
  scheduler.init();
  nodeManager.start();

  try {
    sftpService.start(SFTP_PORT);
  } catch (err) {
    console.warn(`[SFTP] Failed to start: ${err.message}`);
  }

  server.listen(PORT, HOST, () => {
    console.log(`[Server] Backend running on http://${HOST}:${PORT}`);
    console.log(`[Server] SFTP on port ${SFTP_PORT}`);
    console.log(`[Server] Default login: admin / admin`);
    console.log('');
  });
}

start().catch(console.error);

process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  statsCollector.stop();
  nodeManager.stop();
  sftpService.stop();
  server.close();
  process.exit(0);
});
