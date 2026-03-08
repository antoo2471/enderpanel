import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db.js';

const router = Router();

function safePath(serverPath, relativePath) {
  const resolved = path.resolve(serverPath, relativePath || '');
  if (!resolved.startsWith(path.resolve(serverPath))) return null;
  return resolved;
}

router.get('/:id/files', (req, res) => {
  const server = db.prepare('SELECT path FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const targetPath = safePath(server.path, req.query.path);
  if (!targetPath) return res.status(403).json({ error: 'Access denied' });

  if (!fs.existsSync(targetPath)) return res.json([]);

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return res.json({ type: 'file', content, name: path.basename(targetPath) });
  }

  const entries = fs.readdirSync(targetPath, { withFileTypes: true }).map(entry => {
    const entryPath = path.join(targetPath, entry.name);
    const entryStat = fs.statSync(entryPath);
    return {
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      size: entryStat.size,
      modified: entryStat.mtime.toISOString()
    };
  });

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  res.json({ type: 'directory', entries, path: req.query.path || '/' });
});

router.get('/:id/files/content', (req, res) => {
  const server = db.prepare('SELECT path FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const targetPath = safePath(server.path, req.query.path);
  if (!targetPath) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(targetPath)) return res.status(404).json({ error: 'File not found' });

  const content = fs.readFileSync(targetPath, 'utf-8');
  res.json({ content, name: path.basename(targetPath) });
});

router.put('/:id/files/content', (req, res) => {
  const server = db.prepare('SELECT path FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const targetPath = safePath(server.path, req.body.path);
  if (!targetPath) return res.status(403).json({ error: 'Access denied' });

  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(targetPath, req.body.content);
  res.json({ success: true });
});

router.post('/:id/files/directory', (req, res) => {
  const server = db.prepare('SELECT path FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const targetPath = safePath(server.path, req.body.path);
  if (!targetPath) return res.status(403).json({ error: 'Access denied' });

  fs.mkdirSync(targetPath, { recursive: true });
  res.json({ success: true });
});

router.post('/:id/files/rename', (req, res) => {
  const server = db.prepare('SELECT path FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const oldPath = safePath(server.path, req.body.oldPath);
  const newPath = safePath(server.path, req.body.newPath);
  if (!oldPath || !newPath) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'File not found' });

  fs.renameSync(oldPath, newPath);
  res.json({ success: true });
});

router.delete('/:id/files', (req, res) => {
  const server = db.prepare('SELECT path FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  const targetPath = safePath(server.path, req.query.path);
  if (!targetPath) return res.status(403).json({ error: 'Access denied' });
  if (targetPath === path.resolve(server.path)) return res.status(403).json({ error: 'Cannot delete server root' });
  if (!fs.existsSync(targetPath)) return res.status(404).json({ error: 'File not found' });

  fs.rmSync(targetPath, { recursive: true, force: true });
  res.json({ success: true });
});

export default router;
