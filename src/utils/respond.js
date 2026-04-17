const { MessageFlags } = require('discord.js');
const { createNoticePanel, toComponentsV2Message } = require('../components/playerPanel');

function componentFlags(ephemeral = false) {
  return MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0);
}

async function deferPanelReply(interaction, ephemeral = false) {
  return interaction.deferReply({ flags: componentFlags(ephemeral) });
}

async function replyPanel(interaction, panel, options = {}) {
  const { deferred = false, ephemeral = false } = options;

  if (deferred) {
    return interaction.editReply(toComponentsV2Message(panel));
  }

  return interaction.reply({ ...panel, flags: componentFlags(ephemeral) });
}

async function replyNotice(interaction, title, lines, color, options = {}) {
  const panel = createNoticePanel(title, lines, color);
  return replyPanel(interaction, panel, options);
}

module.exports = {
  deferPanelReply,
  replyNotice,
  replyPanel,
};
