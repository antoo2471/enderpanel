import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { adminOnly } from '../auth.js';

const router = Router();

router.get('/', adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users').all();
  res.json(users);
});

router.post('/', adminOnly, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Username already exists' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(id, username, hash, role || 'user');
  res.status(201).json({ id, username, role: role || 'user' });
});

router.put('/:id', adminOnly, (req, res) => {
  const { username, password, role } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username && username !== user.username) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
    if (exists) return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = password ? bcrypt.hashSync(password, 10) : user.password_hash;
  db.prepare('UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ?')
    .run(username || user.username, hash, role || user.role, req.params.id);
  res.json({ id: req.params.id, username: username || user.username, role: role || user.role });
});

router.delete('/:id', adminOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true });
});

router.get('/:userId/permissions', adminOnly, (req, res) => {
  const perms = db.prepare('SELECT * FROM permissions WHERE user_id = ?').all(req.params.userId);
  res.json(perms);
});

router.put('/:userId/permissions/:serverId', adminOnly, (req, res) => {
  const { can_console, can_files, can_players, can_settings, can_backups, can_schedule, can_sftp, can_start, can_stop } = req.body;
  const existing = db.prepare('SELECT id FROM permissions WHERE user_id = ? AND server_id = ?').get(req.params.userId, req.params.serverId);

  if (existing) {
    db.prepare(`UPDATE permissions SET can_console=?, can_files=?, can_players=?, can_settings=?, can_backups=?, can_schedule=?, can_sftp=?, can_start=?, can_stop=? WHERE user_id=? AND server_id=?`)
      .run(can_console?1:0, can_files?1:0, can_players?1:0, can_settings?1:0, can_backups?1:0, can_schedule?1:0, can_sftp?1:0, can_start?1:0, can_stop?1:0, req.params.userId, req.params.serverId);
  } else {
    db.prepare(`INSERT INTO permissions (id, user_id, server_id, can_console, can_files, can_players, can_settings, can_backups, can_schedule, can_sftp, can_start, can_stop) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(uuidv4(), req.params.userId, req.params.serverId, can_console?1:0, can_files?1:0, can_players?1:0, can_settings?1:0, can_backups?1:0, can_schedule?1:0, can_sftp?1:0, can_start?1:0, can_stop?1:0);
  }
  res.json({ success: true });
});

export default router;
