const { SlashCommandBuilder } = require('discord.js');
const { deferPanelReply, replyNotice } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback and disconnect from voice'),
  async execute(interaction, client) {
    await deferPanelReply(interaction);
    client.music.ensureSameVoice(interaction);
    await client.music.stop(interaction.guildId);
    await replyNotice(interaction, 'Player', ['Playback stopped and the bot disconnected from voice.'], 0xe17055, { deferred: true });
  },
};
