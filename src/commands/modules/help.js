const { SlashCommandBuilder } = require('discord.js');
const { replyPanel } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Show all music commands'),
  async execute(interaction, client) {
    await replyPanel(interaction, client.music.getHelpPanel());
  },
};
