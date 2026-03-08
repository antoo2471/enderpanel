import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { backupService } from '../services/backupService.js';

const router = Router();

router.get('/:id/backups', (req, res) => {
  const backups = db.prepare('SELECT * FROM backups WHERE server_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(backups);
});

router.post('/:id/backups', async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  try {
    const backup = await backupService.create(server);
    res.status(201).json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/backups/:backupId/restore', async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const backup = db.prepare('SELECT * FROM backups WHERE id = ? AND server_id = ?').get(req.params.backupId, req.params.id);
  if (!backup) return res.status(404).json({ error: 'Backup not found' });

  try {
    await backupService.restore(server, backup);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/backups/:backupId', (req, res) => {
  const backup = db.prepare('SELECT * FROM backups WHERE id = ? AND server_id = ?').get(req.params.backupId, req.params.id);
  if (!backup) return res.status(404).json({ error: 'Backup not found' });

  backupService.remove(backup);
  db.prepare('DELETE FROM backups WHERE id = ?').run(req.params.backupId);
  res.json({ success: true });
});

export default router;
