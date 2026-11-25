export function describeLink(url = '') {
  const rules = [
    [/netflix\.com/i, 'Netflix'],
    [/primevideo\.com|amazon\.[^/]+\/(?:gp\/video|video|Prime-Video)/i, 'Prime Video'],
    [/hotstar\.com|disneyplus\.com/i, 'Disney+'],
    [/hulu\.com/i, 'Hulu'],
    [/max\.com|hbomax\.com/i, 'Max'],
    [/crunchyroll\.com/i, 'Crunchyroll'],
    [/youtube\.com|youtu\.be/i, 'YouTube']
  ];
  for (const [pattern, name] of rules) {
    if (pattern.test(url)) return name;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Link';
  }
}

export function mediaLabel(media) {
  if (!media || media.kind === 'none' || !media.url) return 'Nothing on';
  if (media.kind === 'youtube') return 'YouTube';
  if (media.kind === 'file') return 'Video file';
  return describeLink(media.url);
}

export function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  );
}

export function kindLabel(kind) {
  if (kind === 'couple') return 'Couple';
  if (kind === 'family') return 'Family';
  if (kind === 'call') return 'Call';
  return 'Friends';
}

export function readableText(hex = '#2a1d17') {
  const raw = String(hex).replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return '#2a1d17';
  const channels = [0, 2, 4].map((start) => parseInt(raw.slice(start, start + 2), 16));
  const luminance = (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255;
  if (luminance < 0.42) return `#${raw}`;
  return `#${channels.map((channel) => Math.round(channel * 0.42).toString(16).padStart(2, '0')).join('')}`;
}
