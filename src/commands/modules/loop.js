const { SlashCommandBuilder } = require('discord.js');
const { deferPanelReply, replyNotice } = require('../../utils/respond');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode')
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' },
        ),
    ),
  async execute(interaction, client) {
    await deferPanelReply(interaction);
    client.music.ensureSameVoice(interaction);
    const mode = interaction.options.getString('mode', true);
    await client.music.setLoopMode(interaction.guildId, mode);
    await replyNotice(interaction, 'Loop', [`Loop mode set to **${mode}**.`], 0xa29bfe, { deferred: true });
  },
};
