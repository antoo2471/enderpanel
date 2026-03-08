import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../db.js';
import { adminOnly } from '../auth.js';

const router = Router();

router.get('/', (req, res) => {
  const nodes = db.prepare('SELECT id, name, host, port, cpu_cores, ram_total, status, is_primary, last_heartbeat, created_at FROM nodes').all();
  res.json(nodes);
});

router.post('/', adminOnly, (req, res) => {
  const { name, host, port, cpu_cores, ram_total } = req.body;
  if (!name || !host) return res.status(400).json({ error: 'Name and host required' });

  const id = uuidv4();
  const token = crypto.randomBytes(32).toString('hex');

  db.prepare('INSERT INTO nodes (id, name, host, port, token, cpu_cores, ram_total) VALUES (?,?,?,?,?,?,?)')
    .run(id, name, host, port || 31357, token, cpu_cores || 0, ram_total || 0);

  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
  res.status(201).json(node);
});

router.delete('/:id', adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM nodes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Node not found' });
  res.json({ success: true });
});

router.post('/heartbeat', (req, res) => {
  const { token, cpu_cores, ram_total } = req.body;
  if (!token) return res.status(401).json({ error: 'Token required' });

  const node = db.prepare('SELECT id FROM nodes WHERE token = ?').get(token);
  if (!node) return res.status(401).json({ error: 'Invalid token' });

  db.prepare('UPDATE nodes SET status = ?, cpu_cores = ?, ram_total = ?, last_heartbeat = datetime(\'now\') WHERE id = ?')
    .run('online', cpu_cores || 0, ram_total || 0, node.id);

  res.json({ success: true });
});

export default router;
