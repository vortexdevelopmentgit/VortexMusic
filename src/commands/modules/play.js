const { SlashCommandBuilder } = require('discord.js');
const { deferPanelReply, replyNotice } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or add a playlist to the queue')
    .addStringOption((option) =>
      option.setName('query').setDescription('Song name or direct URL').setRequired(true),
    ),
  async execute(interaction, client) {
    await deferPanelReply(interaction);
    const query = interaction.options.getString('query', true);
    const result = await client.music.play(interaction, query);

    if (result.started) {
      await client.music.sendOrUpdateController(interaction, result.state);
      return;
    }

    await client.music.refreshController(interaction.guildId);
    await replyNotice(interaction, 'Queued', [`Added **${result.added}** track(s) to the queue.`], 0x0984e3, { deferred: true });
  },
};
