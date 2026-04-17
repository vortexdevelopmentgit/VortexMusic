const { SlashCommandBuilder } = require('discord.js');
const { deferPanelReply, replyNotice } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a track from the queue by its position')
    .addIntegerOption((option) =>
      option.setName('position').setDescription('Queue position starting at 1').setRequired(true).setMinValue(1),
    ),
  async execute(interaction, client) {
    await deferPanelReply(interaction);
    client.music.ensureSameVoice(interaction);
    const position = interaction.options.getInteger('position', true);
    const result = await client.music.removeTrack(interaction.guildId, position);
    await replyNotice(interaction, 'Queue', [`Removed **${result.removedTrack.info.title}** from position **${position}**.`], 0xfdcb6e, { deferred: true });
  },
};
