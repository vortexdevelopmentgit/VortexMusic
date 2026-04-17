require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { clientId, testGuildId, token } = require('./config');
const { json } = require('./commands');

async function deployCommands() {
  if (!token || !clientId) {
    throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.');
  }

  const rest = new REST({ version: '10' }).setToken(token);

  if (testGuildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, testGuildId), { body: json });
    return `Registered ${json.length} test guild commands to ${testGuildId}`;
  }

  await rest.put(Routes.applicationCommands(clientId), { body: json });
  return `Registered ${json.length} global commands for all servers`;
}

module.exports = {
  deployCommands,
};

if (require.main === module) {
  deployCommands()
    .then((message) => {
      console.log(message);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
