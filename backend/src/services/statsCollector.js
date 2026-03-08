import pidusage from 'pidusage';
import fs from 'fs';
import path from 'path';
import db from '../db.js';
import { serverManager } from './serverManager.js';

class StatsCollector {
  constructor() {
    this.history = new Map();
    this.current = new Map();
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => this.collect(), 2000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async collect() {
    for (const [serverId] of serverManager.processes) {
      const proc = serverManager.getProcess(serverId);
      if (!proc || !proc.pid) continue;

      try {
        const usage = await pidusage(proc.pid);
        const serverPath = this.getServerPath(serverId);
        const diskUsage = serverPath ? this.getDiskUsage(serverPath) : 0;
        const players = serverManager.getPlayerList(serverId);

        const stats = {
          cpu: Math.round(usage.cpu * 100) / 100,
          memory: Math.round(usage.memory / 1024 / 1024),
          disk: diskUsage,
          players: players.length,
          tps: this.getTps(serverId),
          timestamp: Date.now()
        };

        this.current.set(serverId, stats);

        const history = this.history.get(serverId) || [];
        history.push(stats);
        if (history.length > 60) history.shift();
        this.history.set(serverId, history);
      } catch {
        // process may have exited
      }
    }
  }

  getServerPath(serverId) {
    try {
      const server = db.prepare('SELECT path FROM servers WHERE id = ?').get(serverId);
      return server?.path;
    } catch {
      return null;
    }
  }

  getDiskUsage(dirPath) {
    try {
      let total = 0;
      const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isFile()) {
            total += fs.statSync(full).size;
          } else if (entry.isDirectory()) {
            walk(full);
          }
        }
      };
      walk(dirPath);
      return Math.round(total / 1024 / 1024);
    } catch {
      return 0;
    }
  }

  getTps(serverId) {
    const logs = serverManager.getLogs(serverId);
    for (let i = logs.length - 1; i >= Math.max(0, logs.length - 50); i--) {
      const match = logs[i]?.line?.match(/TPS.*?(\d+\.?\d*)/i);
      if (match) return parseFloat(match[1]);
    }
    return 20.0;
  }

  getStats(serverId) {
    return this.current.get(serverId) || { cpu: 0, memory: 0, disk: 0, players: 0, tps: 20.0, timestamp: Date.now() };
  }

  getHistory(serverId) {
    return this.history.get(serverId) || [];
  }
}

export const statsCollector = new StatsCollector();
