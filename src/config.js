const { GatewayIntentBits } = require('discord.js');
const lavalinkNodes = require('../config/nodes');

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  testGuildId: process.env.DISCORD_TEST_GUILD_ID,
  defaultSearchSource: process.env.DEFAULT_SEARCH_SOURCE || 'ytsearch',
  defaultVolume: Number(process.env.DEFAULT_VOLUME || 70),
  lavalinkNodes,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
};
