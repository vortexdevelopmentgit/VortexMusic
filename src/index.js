require('dotenv').config();
const { Client, Collection, Events, MessageFlags } = require('discord.js');
const config = require('./config');
const { commands } = require('./commands');
const { PANEL_CUSTOM_IDS, createNoticePanel, toComponentsV2Message } = require('./components/playerPanel');
const { deployCommands } = require('./deploy-commands');
const { createNodes } = require('./lavalink/nodes');
const { MusicManager } = require('./lavalink/musicManager');
const { error, info, warn } = require('./utils/logger');

if (!config.token || !config.clientId) {
  throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be configured.');
}

if (!config.lavalinkNodes.length) {
  warn('No Lavalink nodes configured. Add at least one node in config/nodes.js before starting the bot.');
}

const client = new Client({ intents: config.intents });
client.commands = new Collection(commands.map((command) => [command.data.name, command]));
client.shoukaku = createNodes(client, config.lavalinkNodes);
client.music = new MusicManager(client);

client.once(Events.ClientReady, async (readyClient) => {
  info(`Logged in as ${readyClient.user.tag}`);
  try {
    const message = await deployCommands();
    info(message);
  } catch (err) {
    error('Automatic command deployment failed', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        throw new Error(`Command not found: ${interaction.commandName}`);
      }

      await command.execute(interaction, client);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    }
  } catch (err) {
    error('Unhandled interaction error', err);
    await handleInteractionError(interaction, err);
  }
});

async function handleButton(interaction) {
  const controlIds = new Set([
    PANEL_CUSTOM_IDS.pause,
    PANEL_CUSTOM_IDS.stop,
  ]);

  if (!controlIds.has(interaction.customId)) return;

  await interaction.deferUpdate();

  const actionMap = {
    [PANEL_CUSTOM_IDS.pause]: 'pause',
    [PANEL_CUSTOM_IDS.stop]: 'stop',
  };

  await client.music.handleControl(interaction, actionMap[interaction.customId]);
  await client.music.refreshController(interaction.guildId);
}

async function handleSelect(interaction) {
  if (interaction.customId !== PANEL_CUSTOM_IDS.volume) return;

  await interaction.deferUpdate();
  await client.music.handleVolumeSelect(interaction, interaction.values[0]);
  await client.music.refreshController(interaction.guildId);
}

async function handleInteractionError(interaction, err) {
  const message = err?.message || 'An unexpected error occurred.';
  const payload = createNoticePanel('Error', [message], 0xd63031);

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(toComponentsV2Message(payload)).catch(() => null);
    return;
  }

  await interaction.reply({
    ...payload,
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
  }).catch(() => null);
}

client.on(Events.Error, (err) => error('Discord client error', err));
process.on('unhandledRejection', (reason) => error('Unhandled rejection', reason));
process.on('uncaughtException', (err) => error('Uncaught exception', err));

client.login(config.token);
