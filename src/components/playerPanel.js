const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} = require('discord.js');
const { formatDuration, progressBar, truncate } = require('../utils/formatters');

const PANEL_CUSTOM_IDS = {
  pause: 'player:pause',
  stop: 'player:stop',
  volume: 'player:volume',
};

function createText(content) {
  return new TextDisplayBuilder().setContent(content);
}

function toComponentsV2Message(payload, extra = {}) {
  return {
    content: null,
    embeds: [],
    poll: null,
    flags: MessageFlags.IsComponentsV2,
    components: payload.components,
    ...extra,
  };
}

function createNoticePanel(title, lines, accentColor = 0x2b2d31) {
  const container = new ContainerBuilder().setAccentColor(accentColor);
  container.addTextDisplayComponents(createText(`# ${title}`));

  for (const line of lines) {
    container.addTextDisplayComponents(createText(line));
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
}

function buildPlayerPanel(state) {
  const nowPlaying = state.currentTrack;
  const queuePreview = state.queue.slice(0, 5);
  const volume = state.player?.volume ?? state.volume;
  const paused = state.player?.paused ?? false;
  const position = paused ? state.lastPosition : state.player?.position ?? state.lastPosition;
  const loopLabel = state.loopMode === 'off' ? 'Off' : state.loopMode === 'track' ? 'Track' : 'Queue';

  const container = new ContainerBuilder().setAccentColor(0x1abc9c);

  if (!nowPlaying) {
    container
      .addTextDisplayComponents(createText('# VortexMusic'))
      .addTextDisplayComponents(createText('Nothing is playing right now. Use `/play` to start music.'))
      .addTextDisplayComponents(createText('Controls will appear here once a track starts.'));

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    };
  }

  const trackUrl = nowPlaying.info.uri || `https://www.google.com/search?q=${encodeURIComponent(`${nowPlaying.info.author} ${nowPlaying.info.title}`)}`;
  const duration = nowPlaying.info.isStream ? 0 : nowPlaying.info.length;
  const source = (nowPlaying.info.sourceName || 'unknown').toUpperCase();
  const thumbnailUrl = nowPlaying.info.artworkUrl || 'https://dummyimage.com/256x256/111827/ffffff&text=Vortex';

  container.addTextDisplayComponents(createText('# VortexMusic'));
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        createText(`## [${truncate(nowPlaying.info.title, 70)}](${trackUrl})`),
        createText(`Artist: **${truncate(nowPlaying.info.author, 48)}**\nSource: **${source}**\nNode: **${state.player?.node?.name || 'n/a'}**`),
        createText(`${formatDuration(position)} / ${formatDuration(duration)} ${progressBar(position, duration)}`),
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl)),
  );

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    createText(`Status: **${paused ? 'Paused' : 'Playing'}** | Volume: **${volume}%** | Loop: **${loopLabel}** | Queue: **${state.queue.length}**`),
  );

  if (queuePreview.length) {
    const queueLines = queuePreview
      .map((track, index) => `${index + 1}. **${truncate(track.info.title, 46)}** - ${truncate(track.info.author, 30)}`)
      .join('\n');
    container.addTextDisplayComponents(createText(`### Up Next\n${queueLines}`));
  } else {
    container.addTextDisplayComponents(createText('### Up Next\nQueue is empty.'));
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(PANEL_CUSTOM_IDS.pause).setLabel(paused ? 'Resume' : 'Pause').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(PANEL_CUSTOM_IDS.stop).setLabel('Stop').setStyle(ButtonStyle.Danger),
    ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(PANEL_CUSTOM_IDS.volume)
        .setPlaceholder('Set volume')
        .addOptions(
          [25, 50, 75, 100, 125].map((value) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`${value}%`)
              .setDescription(value === volume ? 'Current volume' : `Switch to ${value}% volume`)
              .setValue(String(value)),
          ),
        ),
    ),
  );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
}

module.exports = {
  PANEL_CUSTOM_IDS,
  buildPlayerPanel,
  createNoticePanel,
  toComponentsV2Message,
};
