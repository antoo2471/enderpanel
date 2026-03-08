import cron from 'node-cron';
import { serverManager } from './serverManager.js';
import { backupService } from './backupService.js';
import db from '../db.js';

class Scheduler {
  constructor() {
    this.jobs = new Map();
  }

  init() {
    const schedules = db.prepare('SELECT * FROM schedules WHERE enabled = 1').all();
    schedules.forEach(s => this.register(s));
    console.log(`[Scheduler] Loaded ${schedules.length} scheduled tasks`);
  }

  register(schedule) {
    if (this.jobs.has(schedule.id)) this.unregister(schedule.id);
    if (!cron.validate(schedule.cron)) return;

    const job = cron.schedule(schedule.cron, () => this.execute(schedule));
    this.jobs.set(schedule.id, job);
  }

  unregister(id) {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
    }
  }

  async execute(schedule) {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(schedule.server_id);
    if (!server) return;

    switch (schedule.action) {
      case 'command':
        if (serverManager.isRunning(server.id)) {
          serverManager.sendCommand(server.id, schedule.payload);
        }
        break;
      case 'start':
        if (!serverManager.isRunning(server.id)) {
          serverManager.start(server);
        }
        break;
      case 'stop':
        if (serverManager.isRunning(server.id)) {
          serverManager.stop(server.id);
        }
        break;
      case 'restart':
        serverManager.restart(server);
        break;
      case 'backup':
        try {
          await backupService.create(server);
        } catch (err) {
          console.error(`[Scheduler] Backup failed for ${server.name}:`, err.message);
        }
        break;
    }
  }
}

export const scheduler = new Scheduler();
