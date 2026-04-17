const { SlashCommandBuilder } = require('discord.js');
const { deferPanelReply, replyNotice } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause the current track'),
  async execute(interaction, client) {
    await deferPanelReply(interaction);
    client.music.ensureSameVoice(interaction);
    await client.music.pause(interaction.guildId);
    await replyNotice(interaction, 'Player', ['Playback paused.'], 0xf39c12, { deferred: true });
  },
};
