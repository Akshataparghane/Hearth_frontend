export function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  const paths = {
    rooms: (
      <>
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6.5 9.5V20h11V9.5" />
      </>
    ),
    friends: (
      <>
        <circle cx="9" cy="9" r="2.4" />
        <circle cx="16" cy="10" r="2" />
        <path d="M4.5 18.5c.6-2.4 2.4-3.7 4.5-3.7s3.9 1.3 4.5 3.7" />
        <path d="M13.5 14.8c1.5-.4 3.2.2 4.2 2.2" />
      </>
    ),
    logout: (
      <>
        <path d="M10 6H6.5A1.5 1.5 0 0 0 5 7.5v9A1.5 1.5 0 0 0 6.5 18H10" />
        <path d="M10 12h9" />
        <path d="m16 8.5 3.5 3.5L16 15.5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 19c1.2-3 3.2-4.5 6-4.5S16.8 16 18 19" />
      </>
    ),
    id: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <circle cx="9" cy="11" r="1.6" />
        <path d="M13 10h5M13 13.5h4" />
      </>
    ),
    mail: (
      <>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m5 8 7 5 7-5" />
      </>
    ),
    lock: (
      <>
        <rect x="6" y="11" width="12" height="8" rx="2" />
        <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" />
      </>
    ),
    eye: (
      <>
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
        <circle cx="12" cy="12" r="2.2" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M4 5 20 19" />
        <path d="M9.5 9.8A3 3 0 0 0 14.2 14" />
        <path d="M7 8.2C4.8 9.6 3.4 12 3.4 12S7 18 12 18c1.3 0 2.5-.3 3.6-.8" />
        <path d="M10 6.2A9.2 9.2 0 0 1 12 6c5.5 0 9 6 9 6a16 16 0 0 1-2.2 2.8" />
      </>
    ),
    heart: <path d="M12 19s-7-4.2-7-8.2A3.4 3.4 0 0 1 12 8a3.4 3.4 0 0 1 7 2.8C19 14.8 12 19 12 19Z" />,
    home: (
      <>
        <path d="M5 11.5 12 6l7 5.5" />
        <path d="M8 11v7h8v-7" />
      </>
    ),
    camera: (
      <>
        <rect x="3.5" y="7" width="12" height="10" rx="2" />
        <path d="m15.5 11 5-2.5v7L15.5 13" />
      </>
    ),
    chat: (
      <>
        <path d="M5 6.5h14a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4 3v-3.2A1 1 0 0 1 5 15V6.5Z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="5.5" />
        <path d="m15.5 15.5 4 4" />
      </>
    )
  };

  return <svg {...common}>{paths[name]}</svg>;
}
