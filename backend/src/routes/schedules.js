import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { scheduler } from '../services/scheduler.js';

const router = Router();

router.get('/:id/schedules', (req, res) => {
  const schedules = db.prepare('SELECT * FROM schedules WHERE server_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(schedules);
});

router.post('/:id/schedules', (req, res) => {
  const { name, cron, action, payload } = req.body;
  if (!name || !cron) return res.status(400).json({ error: 'Name and cron expression required' });

  const id = uuidv4();
  db.prepare('INSERT INTO schedules (id, server_id, name, cron, action, payload) VALUES (?,?,?,?,?,?)')
    .run(id, req.params.id, name, cron, action || 'command', payload || '');

  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  scheduler.register(schedule);
  res.status(201).json(schedule);
});

router.put('/:id/schedules/:schedId', (req, res) => {
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND server_id = ?').get(req.params.schedId, req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

  const { name, cron, action, payload, enabled } = req.body;
  db.prepare('UPDATE schedules SET name=?, cron=?, action=?, payload=?, enabled=? WHERE id=?')
    .run(name || schedule.name, cron || schedule.cron, action || schedule.action, payload !== undefined ? payload : schedule.payload, enabled !== undefined ? (enabled ? 1 : 0) : schedule.enabled, req.params.schedId);

  const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.schedId);
  scheduler.unregister(req.params.schedId);
  if (updated.enabled) scheduler.register(updated);
  res.json(updated);
});

router.delete('/:id/schedules/:schedId', (req, res) => {
  const result = db.prepare('DELETE FROM schedules WHERE id = ? AND server_id = ?').run(req.params.schedId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Schedule not found' });
  scheduler.unregister(req.params.schedId);
  res.json({ success: true });
});

export default router;
