import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'enderpanel.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db = null;

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

export async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'vanilla',
      version TEXT NOT NULL DEFAULT '1.21.4',
      port INTEGER NOT NULL DEFAULT 25565,
      memory INTEGER NOT NULL DEFAULT 1024,
      path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'stopped',
      node_id TEXT,
      rcon_port INTEGER NOT NULL DEFAULT 25575,
      rcon_password TEXT NOT NULL DEFAULT 'enderpanel',
      auto_start INTEGER NOT NULL DEFAULT 0,
      java_args TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      can_console INTEGER NOT NULL DEFAULT 0,
      can_files INTEGER NOT NULL DEFAULT 0,
      can_players INTEGER NOT NULL DEFAULT 0,
      can_settings INTEGER NOT NULL DEFAULT 0,
      can_backups INTEGER NOT NULL DEFAULT 0,
      can_schedule INTEGER NOT NULL DEFAULT 0,
      can_sftp INTEGER NOT NULL DEFAULT 0,
      can_start INTEGER NOT NULL DEFAULT 0,
      can_stop INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, server_id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      cron TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'command',
      payload TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 31357,
      token TEXT NOT NULL,
      cpu_cores INTEGER NOT NULL DEFAULT 0,
      ram_total INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'offline',
      is_primary INTEGER NOT NULL DEFAULT 0,
      last_heartbeat TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const result = db.exec("SELECT id FROM users WHERE username = 'admin'");
  if (result.length === 0 || result[0].values.length === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    db.run('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [uuidv4(), 'admin', hash, 'admin']);
    console.log('[DB] Default admin user created (admin/admin)');
  }

  saveDb();
  setInterval(saveDb, 10000);
}

const dbProxy = {
  prepare(stmt) {
    return {
      get: (...params) => {
        if (!db) throw new Error('Database not initialized');
        try {
          const result = db.exec(stmt, params);
          if (result.length === 0 || result[0].values.length === 0) return undefined;
          const cols = result[0].columns;
          const row = result[0].values[0];
          const obj = {};
          cols.forEach((c, i) => { obj[c] = row[i]; });
          return obj;
        } catch (err) {
          console.error(`[DB] prepare().get() error: ${err.message}`, { stmt, params });
          return undefined;
        }
      },
      all: (...params) => {
        if (!db) throw new Error('Database not initialized');
        try {
          const result = db.exec(stmt, params);
          if (result.length === 0) return [];
          const cols = result[0].columns;
          return result[0].values.map(row => {
            const obj = {};
            cols.forEach((c, i) => { obj[c] = row[i]; });
            return obj;
          });
        } catch (err) {
          console.error(`[DB] prepare().all() error: ${err.message}`, { stmt, params });
          return [];
        }
      },
      run: (...params) => {
        if (!db) throw new Error('Database not initialized');
        try {
          db.run(stmt, params);
          saveDb();
          return { changes: db.getRowsModified() };
        } catch (err) {
          console.error(`[DB] prepare().run() error: ${err.message}`, { stmt, params });
          return { changes: 0 };
        }
      }
    };
  },
  exec(sql) {
    if (!db) throw new Error('Database not initialized');
    db.run(sql);
    saveDb();
  }
};

export default dbProxy;
