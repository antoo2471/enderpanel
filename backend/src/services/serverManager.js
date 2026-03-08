import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';

class ServerManager extends EventEmitter {
  constructor() {
    super();
    this.processes = new Map();
    this.logs = new Map();
    this.playerLists = new Map();
  }

  getJarName(type) {
    return 'server.jar';
  }

  start(server) {
    if (this.processes.has(server.id)) return;

    const jarPath = path.join(server.path, this.getJarName(server.type));
    if (!fs.existsSync(jarPath)) {
      throw new Error(`Server JAR not found at ${jarPath}. Please upload a server.jar file.`);
    }

    const eulaPath = path.join(server.path, 'eula.txt');
    fs.writeFileSync(eulaPath, 'eula=true\n');

    const args = [
      `-Xmx${server.memory}M`,
      `-Xms${Math.floor(server.memory / 2)}M`,
    ];

    if (server.java_args) {
      args.push(...server.java_args.split(' ').filter(Boolean));
    }

    args.push('-jar', this.getJarName(server.type), 'nogui');

    const proc = spawn('java', args, {
      cwd: server.path,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.processes.set(server.id, proc);
    this.logs.set(server.id, []);
    this.playerLists.set(server.id, []);

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => {
        this.addLog(server.id, line);
        this.parseLogLine(server.id, line);
      });
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => this.addLog(server.id, line));
    });

    proc.on('close', (code) => {
      this.processes.delete(server.id);
      this.addLog(server.id, `[EnderPanel] Server process exited with code ${code}`);
      this.emit('stopped', server.id);
    });

    proc.on('error', (err) => {
      this.addLog(server.id, `[EnderPanel] Error: ${err.message}`);
      this.processes.delete(server.id);
      this.emit('error', server.id, err);
    });

    this.emit('started', server.id);
  }

  stop(serverId) {
    const proc = this.processes.get(serverId);
    if (!proc) return;
    this.sendCommand(serverId, 'stop');
    setTimeout(() => {
      if (this.processes.has(serverId)) {
        proc.kill('SIGTERM');
      }
    }, 30000);
  }

  kill(serverId) {
    const proc = this.processes.get(serverId);
    if (!proc) return;
    proc.kill('SIGKILL');
    this.processes.delete(serverId);
  }

  restart(server) {
    if (this.isRunning(server.id)) {
      const proc = this.processes.get(server.id);
      this.sendCommand(server.id, 'stop');

      const onClose = () => {
        setTimeout(() => this.start(server), 2000);
      };
      proc.once('close', onClose);
      setTimeout(() => {
        if (this.isRunning(server.id)) {
          proc.removeListener('close', onClose);
          proc.kill('SIGTERM');
          setTimeout(() => this.start(server), 2000);
        }
      }, 30000);
    } else {
      this.start(server);
    }
  }

  sendCommand(serverId, command) {
    const proc = this.processes.get(serverId);
    if (!proc) return;
    proc.stdin.write(command + '\n');
    this.addLog(serverId, `> ${command}`);
  }

  isRunning(serverId) {
    return this.processes.has(serverId);
  }

  addLog(serverId, line) {
    const logs = this.logs.get(serverId) || [];
    logs.push({ time: Date.now(), line });
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    this.logs.set(serverId, logs);
    this.emit('log', serverId, line);
  }

  getLogs(serverId) {
    return this.logs.get(serverId) || [];
  }

  parseLogLine(serverId, line) {
    const joinMatch = line.match(/(\w+) joined the game/);
    if (joinMatch) {
      const players = this.playerLists.get(serverId) || [];
      if (!players.includes(joinMatch[1])) {
        players.push(joinMatch[1]);
        this.playerLists.set(serverId, players);
      }
      this.emit('playerJoin', serverId, joinMatch[1]);
    }

    const leaveMatch = line.match(/(\w+) left the game/);
    if (leaveMatch) {
      const players = this.playerLists.get(serverId) || [];
      const idx = players.indexOf(leaveMatch[1]);
      if (idx !== -1) players.splice(idx, 1);
      this.playerLists.set(serverId, players);
      this.emit('playerLeave', serverId, leaveMatch[1]);
    }
  }

  getPlayerList(serverId) {
    return (this.playerLists.get(serverId) || []).map(name => ({ name }));
  }

  getProcess(serverId) {
    return this.processes.get(serverId);
  }
}

export const serverManager = new ServerManager();
