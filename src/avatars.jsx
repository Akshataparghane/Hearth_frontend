function Eyes({ left = 31, right = 49, y = 46, iris = '#3d2a22', wink = false }) {
  return (
    <>
      <ellipse cx={left} cy={y} rx="5.2" ry={wink ? 1.2 : 6.2} fill="#fff" />
      <ellipse cx={right} cy={y} rx="5.2" ry="6.2" fill="#fff" />
      {!wink ? <circle cx={left + 0.6} cy={y + 0.4} r="2.5" fill={iris} /> : null}
      <circle cx={right + 0.6} cy={y + 0.4} r="2.5" fill={iris} />
      <circle cx={left + 1.4} cy={y - 1} r="0.9" fill="#fff" />
      <circle cx={right + 1.4} cy={y - 1} r="0.9" fill="#fff" />
    </>
  );
}

function Smile({ y = 58 }) {
  return <path d={`M34 ${y}q6 5 12 0`} stroke="#c56b6b" fill="none" strokeWidth="1.6" strokeLinecap="round" />;
}

const art = {
  mira: () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" fill="#f6b7c4" />
      <path d="M16 50c1 20 10 24 24 24s23-4 24-24C66 28 56 14 40 14S14 28 16 50z" fill="#3a241c" />
      <path d="M58 58c8 2 12 10 8 16" stroke="#3a241c" strokeWidth="7" fill="none" strokeLinecap="round" />
      <ellipse cx="40" cy="46" rx="16" ry="18" fill="#f8d4b8" />
      <path d="M22 42c3-18 33-20 40-2-8-10-30-12-40 2z" fill="#3a241c" />
      <circle cx="60" cy="28" r="5" fill="#ef6d86" />
      <circle cx="60" cy="28" r="2" fill="#ffe08a" />
      <Eyes iris="#5b3a78" />
      <Smile />
      <ellipse cx="26" cy="54" rx="3" ry="1.6" fill="#f0a0a0" />
      <ellipse cx="54" cy="54" rx="3" ry="1.6" fill="#f0a0a0" />
    </svg>
  ),
  hana: () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" fill="#f3d48a" />
      <path d="M18 36h44v22c0 14-10 20-22 20S18 72 18 58z" fill="#1c140f" />
      <ellipse cx="40" cy="48" rx="16" ry="17" fill="#f4c7a6" />
      <path d="M20 44c6-16 34-16 40 0-8-6-32-6-40 0z" fill="#1c140f" />
      <circle cx="31" cy="46" r="7" fill="none" stroke="#243044" strokeWidth="1.4" />
      <circle cx="49" cy="46" r="7" fill="none" stroke="#243044" strokeWidth="1.4" />
      <path d="M38 46h4" stroke="#243044" strokeWidth="1.4" />
      <Eyes y={46} iris="#2c4d3a" />
      <Smile y={59} />
    </svg>
  ),
  lina: () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" fill="#f3b4cf" />
      <path d="M24 22c8-8 28-6 32 6 8 2 12 10 8 16-6 2-10-2-12-6-2 18-8 28-20 28S20 58 22 38c-4 4-8 4-10-2 2-8 6-12 12-14z" fill="#8a3e2a" />
      <ellipse cx="40" cy="48" rx="15" ry="17" fill="#f8d2b4" />
      <path d="M24 40c4-12 28-14 34 0-8-8-26-8-34 0z" fill="#8a3e2a" />
      <path d="M54 18c6 2 8 8 4 12-4-2-8-2-10-6 2-4 4-6 6-6z" fill="#e23b5a" />
      <Eyes wink iris="#6a3418" />
      <Smile />
    </svg>
  ),
  ken: () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" fill="#b9c9ef" />
      <path d="M22 34h36l4 16H18z" fill="#2a3348" />
      <path d="M18 28l8 14 8-16 8 16 8-16 10 18c-4-14-14-20-24-18S20 20 18 28z" fill="#1b2230" />
      <ellipse cx="40" cy="50" rx="15" ry="16" fill="#e7c09e" />
      <path d="M24 46c2-10 30-12 34 0-8-4-24-6-34 0z" fill="#1b2230" />
      <path d="M22 64h36v8H22z" fill="#31456e" />
      <Eyes y={48} iris="#24324e" />
      <path d="M34 60h12" stroke="#a86858" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  rio: () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" fill="#cfe6c4" />
      <path d="M18 34c2-12 14-18 22-18s20 6 22 18v8H18z" fill="#c45a3a" />
      <path d="M24 40h32v6H24z" fill="#8d341c" />
      <ellipse cx="40" cy="52" rx="15" ry="15" fill="#f0c8a8" />
      <path d="M26 48c4-6 24-6 28 0-6-4-22-4-28 0z" fill="#5c3a28" />
      <Eyes y={50} iris="#3e6b3a" />
      <path d="M32 62c2 3 6 4 8 4s6-1 8-4" stroke="#5c3a28" strokeWidth="1.3" fill="none" />
      <Smile y={58} />
    </svg>
  ),
  nori: () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" fill="#d5d0f2" />
      <path d="M16 42c0-8 6-14 14-14h20c8 0 14 6 14 14v6H16z" fill="#2b2f3a" />
      <circle cx="22" cy="46" r="7" fill="#8fd0ea" />
      <circle cx="58" cy="46" r="7" fill="#8fd0ea" />
      <path d="M20 34h40v8H20z" fill="#e7ebf4" />
      <ellipse cx="40" cy="52" rx="14" ry="15" fill="#f3d0b4" />
      <path d="M26 46c4-8 24-8 28 0-6-4-22-4-28 0z" fill="#d5dbe8" />
      <Eyes y={51} iris="#4a6788" />
      <Smile y={60} />
    </svg>
  ),
  sol: () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" fill="#b7e4d2" />
      <path d="M18 46c2-20 12-30 22-30 14 0 22 12 22 30 0 16-8 24-22 24S16 62 18 46z" fill="#1f7a64" />
      <path d="M44 18c10 2 16 12 16 26 0 4-14-6-16-16 2-6 2-10 0-10z" fill="#f6d3b6" />
      <ellipse cx="38" cy="48" rx="15" ry="17" fill="#f6d3b6" />
      <path d="M22 42c6-14 22-16 30-2-8-8-22-8-30 2z" fill="#1f7a64" />
      <path d="M62 40l4 2-4 2-1-2z" fill="#f2c14e" />
      <Eyes left={32} right={46} iris="#176b58" />
      <Smile />
    </svg>
  ),
  aoki: () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" fill="#e4c6f6" />
      <path d="M22 28c-8-10-2-18 4-14 4-8 16-8 20 0 8-4 14 6 6 14-2 16-4 28-14 32S24 50 22 28z" fill="#6a4584" />
      <path d="M24 18l6 10M56 18l-6 10" stroke="#6a4584" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="40" cy="48" rx="15" ry="17" fill="#f4cdb0" />
      <path d="M24 42c4-14 28-16 34 0-8-8-24-8-34 0z" fill="#6a4584" />
      <Eyes iris="#5a2d78" />
      <path d="M36 57q4 2 8 0" stroke="#c56b6b" fill="none" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="27" cy="54" r="1.2" fill="#e07a9a" />
      <circle cx="53" cy="54" r="1.2" fill="#e07a9a" />
    </svg>
  )
};

export const portraits = [
  { id: 'mira', name: 'Mira', gender: 'female' },
  { id: 'hana', name: 'Hana', gender: 'female' },
  { id: 'lina', name: 'Lina', gender: 'female' },
  { id: 'ken', name: 'Ken', gender: 'male' },
  { id: 'rio', name: 'Rio', gender: 'male' },
  { id: 'nori', name: 'Nori', gender: 'male' },
  { id: 'sol', name: 'Sol', gender: 'other' },
  { id: 'aoki', name: 'Aoki', gender: 'other' }
];

export const portraitIds = new Set(portraits.map((item) => item.id));

export function suggestedPortraits(gender) {
  if (gender === 'male') return portraits.filter((item) => item.gender !== 'female');
  if (gender === 'female') return portraits.filter((item) => item.gender !== 'male');
  return portraits;
}

export function Portrait({ id }) {
  const draw = art[id];
  if (!draw) return null;
  return draw();
}
