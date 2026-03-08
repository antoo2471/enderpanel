import rconPkg from 'rcon-client';
const { Rcon } = rconPkg;

class RconClient {
  async execute(server, command) {
    const rcon = new Rcon({
      host: '127.0.0.1',
      port: server.rcon_port,
      password: server.rcon_password,
      timeout: 5000
    });

    try {
      await rcon.connect();
      const response = await rcon.send(command);
      await rcon.end();
      return response;
    } catch (err) {
      try { await rcon.end(); } catch {}
      throw err;
    }
  }

  async listPlayers(server) {
    try {
      const response = await this.execute(server, 'list');
      const match = response.match(/There are (\d+) of a max of (\d+) players online:(.*)/);
      if (match) {
        const names = match[3].trim().split(',').map(n => n.trim()).filter(Boolean);
        return names.map(name => ({ name, online: true }));
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const rconClient = new RconClient();
