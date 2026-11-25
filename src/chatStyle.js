export const chatColors = [
  { id: '#b85a28', label: 'Amber' },
  { id: '#a33b32', label: 'Rose' },
  { id: '#3f6b3a', label: 'Leaf' },
  { id: '#3d527f', label: 'Blue' },
  { id: '#7a3d68', label: 'Plum' },
  { id: '#7a5a08', label: 'Gold' },
  { id: '#2f6f6a', label: 'Teal' },
  { id: '#5c463b', label: 'Brown' }
];

export const wallpapers = [
  { id: 'cream', label: 'Cream' },
  { id: 'blush', label: 'Blush' },
  { id: 'sage', label: 'Sage' },
  { id: 'night', label: 'Night' },
  { id: 'ink', label: 'Ink' },
  { id: 'paper', label: 'Paper' }
];

export const storyColors = chatColors;

export function wallpaperClass(value) {
  if (value && value.startsWith('/uploads/')) return 'wall-photo';
  if (wallpapers.some((item) => item.id === value)) return `wall-${value}`;
  return 'wall-cream';
}
