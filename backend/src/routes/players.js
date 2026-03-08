import { Router } from 'express';
import db from '../db.js';
import { rconClient } from '../services/rcon.js';
import { serverManager } from '../services/serverManager.js';

const router = Router();

router.get('/:id/players', async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  if (!serverManager.isRunning(server.id)) return res.json([]);

  try {
    const players = await rconClient.listPlayers(server);
    res.json(players);
  } catch {
    const cached = serverManager.getPlayerList(server.id);
    res.json(cached);
  }
});

router.post('/:id/players/kick', async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const { player, reason } = req.body;
  if (!player) return res.status(400).json({ error: 'Player name required' });

  try {
    const result = await rconClient.execute(server, `kick ${player} ${reason || ''}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/players/ban', async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const { player, reason } = req.body;
  if (!player) return res.status(400).json({ error: 'Player name required' });

  try {
    const result = await rconClient.execute(server, `ban ${player} ${reason || ''}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/players/unban', async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const { player } = req.body;
  if (!player) return res.status(400).json({ error: 'Player name required' });

  try {
    const result = await rconClient.execute(server, `pardon ${player}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/players/teleport', async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const { player, target } = req.body;
  if (!player || !target) return res.status(400).json({ error: 'Player and target required' });

  try {
    const result = await rconClient.execute(server, `tp ${player} ${target}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
