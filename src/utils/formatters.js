function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 'LIVE';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function progressBar(position, duration, size = 14) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return '`LIVE ' + '='.repeat(Math.max(1, Math.floor(size / 2))) + '`';
  }

  const safePosition = Math.max(0, Math.min(position, duration));
  const ratio = duration === 0 ? 0 : safePosition / duration;
  const cursor = Math.min(size - 1, Math.floor(ratio * size));
  const bar = Array.from({ length: size }, (_, index) => (index === cursor ? 'o' : '-')).join('');
  return '`' + bar + '`';
}

function truncate(value, max = 80) {
  if (!value || value.length <= max) return value || 'Sconosciuto';
  return `${value.slice(0, max - 1)}…`;
}

module.exports = {
  formatDuration,
  progressBar,
  truncate,
};
