const { Connectors, Shoukaku } = require('shoukaku');
const { warn, info, error } = require('../utils/logger');

function createNodeResolver(nodes) {
  const available = [...nodes.values()];
  if (!available.length) return undefined;

  return available
    .filter((node) => node.state === 2 || node.state === 'CONNECTED' || node.state === 1)
    .sort((left, right) => scoreNode(left) - scoreNode(right))[0] || available[0];
}

function scoreNode(node) {
  const players = node.stats?.players ?? 0;
  const cpu = node.stats?.cpu?.systemLoad ?? 0;
  const frameDeficit = (node.stats?.frameStats?.deficit ?? 0) + (node.stats?.frameStats?.nulled ?? 0);
  return players * 10 + cpu * 100 + frameDeficit;
}

function createNodes(client, nodes) {
  const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
    resume: true,
    resumeTimeout: 30,
    reconnectTries: 3,
    restTimeout: 10_000,
    nodeResolver: createNodeResolver,
  });

  shoukaku.on('ready', (name, resumed) => info(`Lavalink node ready: ${name} | resumed=${Boolean(resumed)}`));
  shoukaku.on('error', (name, err) => error(`Lavalink node error: ${name}`, err));
  shoukaku.on('close', (name, code, reason) => warn(`Lavalink node closed: ${name} | ${code} | ${reason}`));
  shoukaku.on('disconnect', (name, players, moved) => warn(`Lavalink node disconnected: ${name} | players=${players.length} | moved=${moved}`));
  shoukaku.on('debug', (name, message) => info(`Lavalink debug [${name}] ${message}`));

  return shoukaku;
}

module.exports = {
  createNodes,
};
