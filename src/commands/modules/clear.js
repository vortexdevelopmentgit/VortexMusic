const { SlashCommandBuilder } = require('discord.js');
const { deferPanelReply, replyNotice } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder().setName('clear').setDescription('Clear the queue but keep the current track'),
  async execute(interaction, client) {
    await deferPanelReply(interaction);
    client.music.ensureSameVoice(interaction);
    await client.music.clearQueue(interaction.guildId);
    await replyNotice(interaction, 'Queue', ['Queue cleared.'], 0x74b9ff, { deferred: true });
  },
};
