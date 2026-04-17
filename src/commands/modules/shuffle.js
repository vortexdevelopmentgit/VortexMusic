const { SlashCommandBuilder } = require('discord.js');
const { deferPanelReply, replyNotice } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the current queue'),
  async execute(interaction, client) {
    await deferPanelReply(interaction);
    client.music.ensureSameVoice(interaction);
    const state = await client.music.shuffle(interaction.guildId);
    await replyNotice(interaction, 'Queue', [`Shuffled **${state.queue.length}** queued track(s).`], 0x00cec9, { deferred: true });
  },
};
