import ssh2 from 'ssh2';
const { Server: SSH2Server } = ssh2;
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_DIR = path.join(__dirname, '..', '..', 'data', 'keys');

class SftpService {
  constructor() {
    this.server = null;
  }

  start(port = 8382) {
    if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true });

    const keyPath = path.join(KEY_DIR, 'host_key');
    if (!fs.existsSync(keyPath)) {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' }
      });
      fs.writeFileSync(keyPath, privateKey);
    }

    this.server = new SSH2Server({
      hostKeys: [fs.readFileSync(keyPath)]
    }, (client) => {
      let authenticatedUser = null;

      client.on('authentication', (ctx) => {
        if (ctx.method === 'password') {
          const user = db.prepare('SELECT * FROM users WHERE username = ?').get(ctx.username);
          if (user && bcrypt.compareSync(ctx.password, user.password_hash)) {
            authenticatedUser = user;
            ctx.accept();
          } else {
            ctx.reject();
          }
        } else {
          ctx.reject(['password']);
        }
      });

      client.on('ready', () => {
        client.on('session', (accept) => {
          const session = accept();
          session.on('sftp', (accept) => {
            const sftp = accept();
            this.handleSftp(sftp, authenticatedUser);
          });
        });
      });
    });

    this.server.listen(port, '0.0.0.0', () => {
      console.log(`[SFTP] Server listening on port ${port}`);
    });
  }

  handleSftp(sftp, user) {
    const servers = user.role === 'admin'
      ? db.prepare('SELECT * FROM servers').all()
      : db.prepare('SELECT s.* FROM servers s INNER JOIN permissions p ON p.server_id = s.id WHERE p.user_id = ? AND p.can_sftp = 1').all(user.id);

    const getServerPath = (reqPath) => {
      const parts = reqPath.split('/').filter(Boolean);
      if (parts.length === 0) return { virtual: true, serverList: servers };

      const server = servers.find(s => s.name === parts[0] || s.id === parts[0]);
      if (!server) return null;

      const subPath = parts.slice(1).join('/');
      const resolved = path.resolve(server.path, subPath);
      if (!resolved.startsWith(path.resolve(server.path))) return null;

      return { serverPath: resolved, server };
    };

    sftp.on('OPENDIR', (reqId, dirPath) => {
      const result = getServerPath(dirPath);
      if (!result) return sftp.status(reqId, 2);
      sftp.handle(reqId, Buffer.from(dirPath));
    });

    sftp.on('READDIR', (reqId, handle) => {
      const dirPath = handle.toString();
      const result = getServerPath(dirPath);

      if (!result) return sftp.status(reqId, 2);

      if (result.virtual) {
        const entries = servers.map(s => ({
          filename: s.name,
          longname: `drwxr-xr-x 1 panel panel 0 Jan 1 00:00 ${s.name}`,
          attrs: { mode: 0o40755, size: 0, uid: 1000, gid: 1000, atime: 0, mtime: 0 }
        }));
        sftp.name(reqId, entries);
        return;
      }

      try {
        const entries = fs.readdirSync(result.serverPath, { withFileTypes: true }).map(entry => {
          const stat = fs.statSync(path.join(result.serverPath, entry.name));
          return {
            filename: entry.name,
            longname: `${entry.isDirectory() ? 'd' : '-'}rwxr-xr-x 1 panel panel ${stat.size} Jan 1 00:00 ${entry.name}`,
            attrs: {
              mode: entry.isDirectory() ? 0o40755 : 0o100644,
              size: stat.size,
              uid: 1000,
              gid: 1000,
              atime: Math.floor(stat.atimeMs / 1000),
              mtime: Math.floor(stat.mtimeMs / 1000)
            }
          };
        });
        sftp.name(reqId, entries);
      } catch {
        sftp.status(reqId, 2);
      }
    });

    sftp.on('STAT', onStat);
    sftp.on('LSTAT', onStat);

    function onStat(reqId, filePath) {
      const result = getServerPath(filePath);
      if (!result) return sftp.status(reqId, 2);

      if (result.virtual) {
        return sftp.attrs(reqId, { mode: 0o40755, size: 0, uid: 1000, gid: 1000, atime: 0, mtime: 0 });
      }

      try {
        const stat = fs.statSync(result.serverPath);
        sftp.attrs(reqId, {
          mode: stat.isDirectory() ? 0o40755 : 0o100644,
          size: stat.size,
          uid: 1000,
          gid: 1000,
          atime: Math.floor(stat.atimeMs / 1000),
          mtime: Math.floor(stat.mtimeMs / 1000)
        });
      } catch {
        sftp.status(reqId, 2);
      }
    }

    const openFiles = new Map();
    let handleCounter = 0;

    sftp.on('OPEN', (reqId, filePath, flags) => {
      const result = getServerPath(filePath);
      if (!result || result.virtual) return sftp.status(reqId, 3);

      try {
        let fsFlags = 'r';
        if (flags & 0x0002) fsFlags = 'w';
        if (flags & 0x0008) fsFlags = 'a';
        if (flags & 0x0001 && flags & 0x0002) fsFlags = 'r+';

        const fd = fs.openSync(result.serverPath, fsFlags);
        const handle = Buffer.alloc(4);
        handle.writeUInt32BE(handleCounter++);
        openFiles.set(handle.toString('hex'), { fd, path: result.serverPath });
        sftp.handle(reqId, handle);
      } catch {
        sftp.status(reqId, 4);
      }
    });

    sftp.on('READ', (reqId, handle, offset, length) => {
      const entry = openFiles.get(handle.toString('hex'));
      if (!entry) return sftp.status(reqId, 2);

      const buf = Buffer.alloc(length);
      try {
        const bytesRead = fs.readSync(entry.fd, buf, 0, length, offset);
        if (bytesRead === 0) return sftp.status(reqId, 1);
        sftp.data(reqId, buf.slice(0, bytesRead));
      } catch {
        sftp.status(reqId, 4);
      }
    });

    sftp.on('WRITE', (reqId, handle, offset, data) => {
      const entry = openFiles.get(handle.toString('hex'));
      if (!entry) return sftp.status(reqId, 2);

      try {
        fs.writeSync(entry.fd, data, 0, data.length, offset);
        sftp.status(reqId, 0);
      } catch {
        sftp.status(reqId, 4);
      }
    });

    sftp.on('CLOSE', (reqId, handle) => {
      const entry = openFiles.get(handle.toString('hex'));
      if (entry) {
        fs.closeSync(entry.fd);
        openFiles.delete(handle.toString('hex'));
      }
      sftp.status(reqId, 0);
    });

    sftp.on('REMOVE', (reqId, filePath) => {
      const result = getServerPath(filePath);
      if (!result || result.virtual) return sftp.status(reqId, 3);

      try {
        fs.unlinkSync(result.serverPath);
        sftp.status(reqId, 0);
      } catch {
        sftp.status(reqId, 4);
      }
    });

    sftp.on('MKDIR', (reqId, dirPath) => {
      const result = getServerPath(dirPath);
      if (!result || result.virtual) return sftp.status(reqId, 3);

      try {
        fs.mkdirSync(result.serverPath, { recursive: true });
        sftp.status(reqId, 0);
      } catch {
        sftp.status(reqId, 4);
      }
    });

    sftp.on('RMDIR', (reqId, dirPath) => {
      const result = getServerPath(dirPath);
      if (!result || result.virtual) return sftp.status(reqId, 3);

      try {
        fs.rmdirSync(result.serverPath);
        sftp.status(reqId, 0);
      } catch {
        sftp.status(reqId, 4);
      }
    });
  }

  stop() {
    if (this.server) this.server.close();
  }
}

export const sftpService = new SftpService();
