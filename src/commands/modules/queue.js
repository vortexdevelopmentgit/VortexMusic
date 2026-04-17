const { SlashCommandBuilder } = require('discord.js');
const { replyPanel } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Show the current queue'),
  async execute(interaction, client) {
    await replyPanel(interaction, client.music.getQueuePanel(interaction.guildId));
  },
};
