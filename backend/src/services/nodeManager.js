import db from '../db.js';

class NodeManager {
  constructor() {
    this.checkInterval = null;
  }

  start() {
    this.checkInterval = setInterval(() => this.checkNodes(), 30000);
  }

  stop() {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  checkNodes() {
    const nodes = db.prepare('SELECT * FROM nodes WHERE is_primary = 0').all();
    const now = Date.now();

    nodes.forEach(node => {
      if (node.last_heartbeat) {
        const lastBeat = new Date(node.last_heartbeat).getTime();
        if (now - lastBeat > 60000) {
          db.prepare('UPDATE nodes SET status = ? WHERE id = ?').run('offline', node.id);
        }
      }
    });
  }

  getResources() {
    const nodes = db.prepare('SELECT * FROM nodes WHERE status = ?').all('online');
    return {
      totalCpu: nodes.reduce((sum, n) => sum + n.cpu_cores, 0),
      totalRam: nodes.reduce((sum, n) => sum + n.ram_total, 0),
      nodeCount: nodes.length
    };
  }
}

export const nodeManager = new NodeManager();
