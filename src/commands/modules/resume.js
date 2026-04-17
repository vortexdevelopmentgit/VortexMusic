const { SlashCommandBuilder } = require('discord.js');
const { deferPanelReply, replyNotice } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume the current track'),
  async execute(interaction, client) {
    await deferPanelReply(interaction);
    client.music.ensureSameVoice(interaction);
    await client.music.resume(interaction.guildId);
    await replyNotice(interaction, 'Player', ['Playback resumed.'], 0x1abc9c, { deferred: true });
  },
};
