const { SlashCommandBuilder } = require('discord.js');
const { replyPanel } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Show the player panel'),
  async execute(interaction, client) {
    await replyPanel(interaction, client.music.getPlayerPanel(interaction.guildId));
  },
};
