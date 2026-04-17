const { SlashCommandBuilder } = require('discord.js');
const { deferPanelReply, replyNotice } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the player volume')
    .addIntegerOption((option) =>
      option.setName('value').setDescription('Volume between 0 and 150').setRequired(true).setMinValue(0).setMaxValue(150),
    ),
  async execute(interaction, client) {
    await deferPanelReply(interaction);
    client.music.ensureSameVoice(interaction);
    const value = interaction.options.getInteger('value', true);
    await client.music.setVolume(interaction.guildId, value);
    await replyNotice(interaction, 'Volume', [`Volume set to **${value}%**.`], 0x0984e3, { deferred: true });
  },
};
