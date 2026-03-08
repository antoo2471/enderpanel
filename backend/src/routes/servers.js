import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { adminOnly } from '../auth.js';
import { serverManager } from '../services/serverManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVERS_DIR = path.join(__dirname, '..', '..', 'data', 'servers');

const router = Router();

router.get('/', (req, res) => {
  let servers;
  if (req.user.role === 'admin') {
    servers = db.prepare('SELECT * FROM servers').all();
  } else {
    servers = db.prepare(`
      SELECT s.* FROM servers s
      INNER JOIN permissions p ON p.server_id = s.id
      WHERE p.user_id = ?
    `).all(req.user.id);
  }
  servers = servers.map(s => ({ ...s, online: serverManager.isRunning(s.id) }));
  res.json(servers);
});

router.get('/:id', (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  server.online = serverManager.isRunning(server.id);
  res.json(server);
});

router.post('/', adminOnly, (req, res) => {
  const { name, type, version, port, memory, rcon_port, rcon_password, java_args } = req.body;
  if (!name) return res.status(400).json({ error: 'Server name required' });

  const id = uuidv4();
  const serverPath = path.join(SERVERS_DIR, id);
  fs.mkdirSync(serverPath, { recursive: true });

  const usedPort = port || 25565;
  const usedRconPort = rcon_port || (usedPort + 10);

  db.prepare(`INSERT INTO servers (id, name, type, version, port, memory, path, rcon_port, rcon_password, java_args) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, name, type || 'vanilla', version || '1.21.4', usedPort, memory || 1024, serverPath, usedRconPort, rcon_password || 'enderpanel', java_args || '');

  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
  res.status(201).json(server);
});

router.put('/:id', adminOnly, (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const { name, type, version, port, memory, rcon_port, rcon_password, auto_start, java_args } = req.body;
  db.prepare(`UPDATE servers SET name=?, type=?, version=?, port=?, memory=?, rcon_port=?, rcon_password=?, auto_start=?, java_args=? WHERE id=?`)
    .run(
      name || server.name, type || server.type, version || server.version,
      port || server.port, memory || server.memory,
      rcon_port || server.rcon_port, rcon_password || server.rcon_password,
      auto_start !== undefined ? (auto_start ? 1 : 0) : server.auto_start,
      java_args !== undefined ? java_args : server.java_args,
      req.params.id
    );

  const updated = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', adminOnly, (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  if (serverManager.isRunning(req.params.id)) {
    serverManager.stop(req.params.id);
  }

  db.prepare('DELETE FROM servers WHERE id = ?').run(req.params.id);
  if (fs.existsSync(server.path)) {
    fs.rmSync(server.path, { recursive: true, force: true });
  }
  res.json({ success: true });
});

router.post('/:id/start', (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  if (serverManager.isRunning(server.id)) return res.status(400).json({ error: 'Server already running' });

  try {
    serverManager.start(server);
    db.prepare('UPDATE servers SET status = ? WHERE id = ?').run('running', server.id);
    res.json({ success: true, status: 'running' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/stop', (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  if (!serverManager.isRunning(server.id)) return res.status(400).json({ error: 'Server not running' });

  serverManager.stop(server.id);
  db.prepare('UPDATE servers SET status = ? WHERE id = ?').run('stopped', server.id);
  res.json({ success: true, status: 'stopped' });
});

router.post('/:id/restart', (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  serverManager.restart(server);
  res.json({ success: true, status: 'running' });
});

router.post('/:id/kill', (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  serverManager.kill(server.id);
  db.prepare('UPDATE servers SET status = ? WHERE id = ?').run('stopped', server.id);
  res.json({ success: true, status: 'stopped' });
});

router.post('/:id/command', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Command required' });
  if (!serverManager.isRunning(req.params.id)) return res.status(400).json({ error: 'Server not running' });

  serverManager.sendCommand(req.params.id, command);
  res.json({ success: true });
});

router.get('/:id/properties', (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const propsPath = path.join(server.path, 'server.properties');
  if (!fs.existsSync(propsPath)) return res.json({});

  const content = fs.readFileSync(propsPath, 'utf-8');
  const props = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        props[trimmed.substring(0, idx)] = trimmed.substring(idx + 1);
      }
    }
  });
  res.json(props);
});

router.put('/:id/properties', (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const propsPath = path.join(server.path, 'server.properties');
  const lines = [];
  if (fs.existsSync(propsPath)) {
    const existing = fs.readFileSync(propsPath, 'utf-8').split('\n');
    const updates = { ...req.body };
    existing.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed) {
        lines.push(line);
        return;
      }
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx);
        if (key in updates) {
          lines.push(`${key}=${updates[key]}`);
          delete updates[key];
        } else {
          lines.push(line);
        }
      }
    });
    Object.entries(updates).forEach(([k, v]) => lines.push(`${k}=${v}`));
  } else {
    Object.entries(req.body).forEach(([k, v]) => lines.push(`${k}=${v}`));
  }

  fs.writeFileSync(propsPath, lines.join('\n'));
  res.json({ success: true });
});

export default router;
