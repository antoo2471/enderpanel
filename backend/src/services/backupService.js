import fs from 'fs';
import path from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { x as tarX } from 'tar';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

class BackupService {
  async create(server) {
    const id = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${server.name}_${timestamp}.tar.gz`;
    const backupPath = path.join(BACKUP_DIR, filename);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(backupPath);
      const archive = archiver('tar', { gzip: true, gzipOptions: { level: 6 } });

      output.on('close', () => {
        const size = archive.pointer();
        db.prepare('INSERT INTO backups (id, server_id, filename, size) VALUES (?,?,?,?)')
          .run(id, server.id, filename, size);
        const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(id);
        resolve(backup);
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(server.path, false);
      archive.finalize();
    });
  }

  async restore(server, backup) {
    const backupPath = path.join(BACKUP_DIR, backup.filename);
    if (!fs.existsSync(backupPath)) throw new Error('Backup file not found');

    const items = fs.readdirSync(server.path);
    for (const item of items) {
      fs.rmSync(path.join(server.path, item), { recursive: true, force: true });
    }

    await tarX({ file: backupPath, cwd: server.path });
  }

  remove(backup) {
    const backupPath = path.join(BACKUP_DIR, backup.filename);
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
  }

  getBackupDir() {
    return BACKUP_DIR;
  }
}

export const backupService = new BackupService();
