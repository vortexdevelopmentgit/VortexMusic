const { ChannelType, Collection } = require('discord.js');
const { buildPlayerPanel, createNoticePanel, toComponentsV2Message } = require('../components/playerPanel');
const { defaultSearchSource, defaultVolume } = require('../config');
const { info, warn } = require('../utils/logger');

class GuildQueueState {
  constructor(guildId) {
    this.guildId = guildId;
    this.player = null;
    this.textChannelId = null;
    this.voiceChannelId = null;
    this.controllerMessageId = null;
    this.queue = [];
    this.currentTrack = null;
    this.lastPosition = 0;
    this.volume = defaultVolume;
    this.loopMode = 'off';
  }
}

class MusicManager {
  constructor(client) {
    this.client = client;
    this.states = new Collection();
  }

  getState(guildId) {
    if (!this.states.has(guildId)) {
      this.states.set(guildId, new GuildQueueState(guildId));
    }

    return this.states.get(guildId);
  }

  getExistingState(guildId) {
    return this.states.get(guildId) || null;
  }

  ensureVoiceContext(interaction) {
    const memberChannel = interaction.member?.voice?.channel;
    const allowedTypes = [ChannelType.GuildVoice, ChannelType.GuildStageVoice];

    if (!memberChannel || !allowedTypes.includes(memberChannel.type)) {
      throw new Error('You need to be in a voice channel to use the player.');
    }

    return memberChannel;
  }

  requireActiveState(guildId) {
    const state = this.getExistingState(guildId);
    if (!state?.player) {
      throw new Error('There is no active player in this server.');
    }

    return state;
  }

  ensureSameVoice(interaction) {
    const state = this.requireActiveState(interaction.guildId);
    const memberChannelId = interaction.member?.voice?.channelId;

    if (!memberChannelId || memberChannelId !== state.voiceChannelId) {
      throw new Error('You must be in the same voice channel as the bot to use these controls.');
    }

    return state;
  }

  getSearchQuery(query) {
    return /^https?:\/\//i.test(query) ? query : `${defaultSearchSource}:${query}`;
  }

  async resolveQuery(query, preferredNode = null) {
    const node = preferredNode || this.client.shoukaku.getIdealNode();
    if (!node) throw new Error('No Lavalink node is available right now.');

    const result = await node.rest.resolve(this.getSearchQuery(query));
    const loadType = String(result?.loadType || '').toLowerCase();

    if (!result || loadType === 'empty') {
      throw new Error('No results were found for that query.');
    }

    if (loadType === 'error') {
      throw new Error(result.data?.message || 'Lavalink returned an error while resolving the query.');
    }

    if (loadType === 'track') {
      return { tracks: result.data ? [result.data] : [], loadType, playlistInfo: null };
    }

    if (loadType === 'search') {
      return { tracks: Array.isArray(result.data) ? result.data : [], loadType, playlistInfo: null };
    }

    if (loadType === 'playlist') {
      return {
        tracks: Array.isArray(result.data?.tracks) ? result.data.tracks : [],
        loadType,
        playlistInfo: result.data?.info || null,
      };
    }

    warn(`Unhandled Lavalink loadType "${result.loadType}" on node ${node.name}`, result);
    return { tracks: [], loadType, playlistInfo: null };
  }

  async connect(interaction) {
    const voiceChannel = this.ensureVoiceContext(interaction);
    const state = this.getState(interaction.guildId);

    if (state.player && state.voiceChannelId && state.voiceChannelId !== voiceChannel.id) {
      throw new Error('The player is already active in another voice channel.');
    }

    if (!state.player) {
      state.player = await this.client.shoukaku.joinVoiceChannel({
        guildId: interaction.guildId,
        channelId: voiceChannel.id,
        shardId: interaction.guild.shardId,
      });
      await state.player.setGlobalVolume(state.volume);
      this.attachPlayerEvents(state);
      info(`Player connected | guild=${interaction.guildId} | channel=${voiceChannel.id} | node=${state.player.node?.name || 'unknown'}`);
    }

    state.textChannelId = interaction.channelId;
    state.voiceChannelId = voiceChannel.id;
    return state;
  }

  attachPlayerEvents(state) {
    if (!state.player || state.player.__vortexBound) return;
    state.player.__vortexBound = true;

    state.player.on('start', async () => {
      info(`Track started | guild=${state.guildId} | node=${state.player.node?.name || 'unknown'} | title=${state.currentTrack?.info?.title || 'unknown'}`);
      state.lastPosition = 0;
      await this.refreshController(state.guildId).catch(() => null);
    });

    state.player.on('update', (payload) => {
      state.lastPosition = payload?.state?.position ?? state.player.position ?? 0;
    });

    state.player.on('end', async (event) => {
      const reason = event?.reason || 'finished';
      if (String(reason).toUpperCase() === 'REPLACED') return;
      await this.advanceQueue(state.guildId, reason).catch((err) => warn('Unable to advance queue', err));
    });

    state.player.on('exception', async (event) => {
      warn('Player exception', event);
      await this.advanceQueue(state.guildId, 'exception').catch(() => null);
    });

    state.player.on('stuck', async (event) => {
      warn('Player stuck', event);
      await this.advanceQueue(state.guildId, 'stuck').catch(() => null);
    });

    state.player.on('closed', async () => {
      await this.destroy(state.guildId, false).catch(() => null);
    });
  }

  async play(interaction, query) {
    const state = await this.connect(interaction);
    const resolution = await this.resolveQuery(query, state.player?.node);
    const tracks = resolution.tracks;

    if (!tracks.length) {
      throw new Error('No playable tracks were returned by Lavalink.');
    }

    const wasIdle = !state.currentTrack;
    if (wasIdle) {
      const [firstTrack, ...restTracks] = tracks;
      state.currentTrack = firstTrack;
      state.queue.push(...restTracks);
      await state.player.playTrack({ track: { encoded: firstTrack.encoded } });
      info(`Track requested | guild=${interaction.guildId} | node=${state.player.node?.name || 'unknown'} | title=${firstTrack.info?.title || 'unknown'}`);
    } else {
      state.queue.push(...tracks);
      info(`Tracks queued | guild=${interaction.guildId} | node=${state.player.node?.name || 'unknown'} | count=${tracks.length}`);
    }

    return {
      state,
      added: tracks.length,
      started: wasIdle,
      playlistInfo: resolution.playlistInfo,
      track: tracks[0],
    };
  }

  async advanceQueue(guildId, reason = 'finished') {
    const state = this.requireActiveState(guildId);
    const previousTrack = state.currentTrack;

    if (state.loopMode === 'track' && previousTrack && reason !== 'stop') {
      await state.player.playTrack({ track: { encoded: previousTrack.encoded } });
      return previousTrack;
    }

    if (state.loopMode === 'queue' && previousTrack && reason !== 'stop') {
      state.queue.push(previousTrack);
    }

    const nextTrack = state.queue.shift() || null;
    state.currentTrack = nextTrack;
    state.lastPosition = 0;

    if (!nextTrack) {
      await this.refreshController(guildId).catch(() => null);
      return null;
    }

    await state.player.playTrack({ track: { encoded: nextTrack.encoded } });
    await this.refreshController(guildId).catch(() => null);
    return nextTrack;
  }

  async pause(guildId) {
    const state = this.requireActiveState(guildId);
    await state.player.setPaused(true);
    await this.refreshController(guildId);
    return state;
  }

  async resume(guildId) {
    const state = this.requireActiveState(guildId);
    await state.player.setPaused(false);
    await this.refreshController(guildId);
    return state;
  }

  async stop(guildId) {
    const state = this.requireActiveState(guildId);
    await this.destroy(guildId, true);
    return state;
  }

  async setVolume(guildId, volume) {
    const state = this.requireActiveState(guildId);
    const normalized = Math.max(0, Math.min(150, Number(volume)));
    state.volume = normalized;
    await state.player.setGlobalVolume(normalized);
    await this.refreshController(guildId);
    return state;
  }

  async shuffle(guildId) {
    const state = this.requireActiveState(guildId);

    for (let index = state.queue.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [state.queue[index], state.queue[swapIndex]] = [state.queue[swapIndex], state.queue[index]];
    }

    await this.refreshController(guildId);
    return state;
  }

  async clearQueue(guildId) {
    const state = this.requireActiveState(guildId);
    state.queue = [];
    await this.refreshController(guildId);
    return state;
  }

  async removeTrack(guildId, position) {
    const state = this.requireActiveState(guildId);
    const index = Number(position) - 1;

    if (!Number.isInteger(index) || index < 0 || index >= state.queue.length) {
      throw new Error('That queue position does not exist.');
    }

    const [removedTrack] = state.queue.splice(index, 1);
    await this.refreshController(guildId);
    return { state, removedTrack, index };
  }

  async setLoopMode(guildId, mode) {
    const state = this.requireActiveState(guildId);
    const allowedModes = ['off', 'track', 'queue'];

    if (!allowedModes.includes(mode)) {
      throw new Error('Loop mode must be off, track, or queue.');
    }

    state.loopMode = mode;
    await this.refreshController(guildId);
    return state;
  }

  async destroy(guildId, updatePanel = true) {
    const state = this.getExistingState(guildId);
    if (!state) return null;

    if (state.player) {
      try {
        await state.player.destroy();
      } catch {
        // Ignore remote cleanup errors.
      }
    }

    try {
      await this.client.shoukaku.leaveVoiceChannel(guildId);
    } catch {
      // Ignore voice cleanup errors.
    }

    state.player = null;
    state.voiceChannelId = null;
    state.queue = [];
    state.currentTrack = null;
    state.lastPosition = 0;
    state.loopMode = 'off';

    if (updatePanel) {
      await this.refreshController(guildId).catch(() => null);
    }

    return state;
  }

  getQueueSummary(guildId) {
    return this.requireActiveState(guildId);
  }

  getPlayerPanel(guildId) {
    const state = this.getExistingState(guildId) || this.getState(guildId);
    return buildPlayerPanel(state);
  }

  getQueuePanel(guildId) {
    const state = this.requireActiveState(guildId);
    const lines = [];

    if (state.currentTrack) {
      lines.push(`Now playing: **${state.currentTrack.info.title}** by **${state.currentTrack.info.author}**`);
    }

    if (!state.queue.length) {
      lines.push('Queue is empty.');
    } else {
      lines.push(
        state.queue
          .slice(0, 10)
          .map((track, index) => `${index + 1}. ${track.info.title} - ${track.info.author}`)
          .join('\n'),
      );
    }

    return createNoticePanel('Queue', lines, 0x0984e3);
  }

  getHelpPanel() {
    return createNoticePanel('Help', [
      '`/play <query>` Start playback or add to the queue.',
      '`/pause`, `/resume`, `/stop` Control playback.',
      '`/queue`, `/nowplaying`, `/volume`, `/loop`, `/shuffle`, `/clear`, `/remove` Manage the queue.',
      '`/help` Show this command summary.',
    ], 0x6c5ce7);
  }

  async sendOrUpdateController(target, state) {
    const panel = buildPlayerPanel(state);

    if ('editReply' in target && typeof target.editReply === 'function') {
      const response = await target.editReply(toComponentsV2Message(panel));
      state.controllerMessageId = response.id;
      return response;
    }

    const channel = await this.client.channels.fetch(state.textChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return null;

    let message = null;
    if (state.controllerMessageId) {
      message = await channel.messages.fetch(state.controllerMessageId).catch(() => null);
    }

    if (message) {
      await message.edit(toComponentsV2Message(panel));
      return message;
    }

    message = await channel.send(panel);
    state.controllerMessageId = message.id;
    return message;
  }

  async refreshController(guildId) {
    const state = this.getExistingState(guildId);
    if (!state?.textChannelId) return null;
    return this.sendOrUpdateController({ reply: null }, state);
  }

  async handleControl(interaction, action) {
    const state = this.ensureSameVoice(interaction);

    if (action === 'pause') {
      if (state.player.paused) return this.resume(interaction.guildId);
      return this.pause(interaction.guildId);
    }

    if (action === 'stop') return this.stop(interaction.guildId);

    throw new Error('Unknown player action.');
  }

  async handleVolumeSelect(interaction, value) {
    this.ensureSameVoice(interaction);
    return this.setVolume(interaction.guildId, value);
  }
}

module.exports = {
  MusicManager,
};
