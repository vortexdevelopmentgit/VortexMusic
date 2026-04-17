const play = require('./modules/play');
const pause = require('./modules/pause');
const resume = require('./modules/resume');
const stop = require('./modules/stop');
const queue = require('./modules/queue');
const nowplaying = require('./modules/nowplaying');
const volume = require('./modules/volume');
const help = require('./modules/help');
const shuffle = require('./modules/shuffle');
const clear = require('./modules/clear');
const loop = require('./modules/loop');
const remove = require('./modules/remove');

const commands = [
  play,
  pause,
  resume,
  stop,
  queue,
  nowplaying,
  volume,
  help,
  shuffle,
  clear,
  loop,
  remove,
];

module.exports = {
  commands,
  json: commands.map((command) => command.data.toJSON()),
};
