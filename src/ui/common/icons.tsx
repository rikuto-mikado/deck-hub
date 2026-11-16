/** Stroke icons (24px grid). Decorative: the button carries the label. */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const IconBack = () => (
  <svg {...base}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);
export const IconUndo = () => (
  <svg {...base}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </svg>
);
export const IconRestart = () => (
  <svg {...base}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
export const IconDeal = () => (
  <svg {...base}>
    <rect x="3" y="6" width="11" height="15" rx="2" />
    <path d="M8 3h11a2 2 0 0 1 2 2v13" />
  </svg>
);
export const IconRules = () => (
  <svg {...base}>
    <path d="M4 6h10" />
    <path d="M18 6h2" />
    <circle cx="16" cy="6" r="2" />
    <path d="M4 18h4" />
    <path d="M12 18h8" />
    <circle cx="10" cy="18" r="2" />
    <path d="M4 12h2" />
    <path d="M10 12h10" />
    <circle cx="8" cy="12" r="2" />
  </svg>
);
export const IconArrow = ({ dir = 'right' }: { dir?: 'left' | 'right' }) => (
  <svg {...base}>{dir === 'right' ? <path d="m9 18 6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}</svg>
);
export const IconPlay = () => (
  <svg {...base} strokeWidth={2}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);
export const IconSun = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const IconMoon = () => (
  <svg {...base}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </svg>
);
export const IconBook = () => (
  <svg {...base}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    <path d="M9 8h7M9 12h5" />
  </svg>
);
export const IconHint = () => (
  <svg {...base}>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" />
  </svg>
);
export const IconMore = () => (
  <svg {...base} strokeWidth={2.4}>
    <path d="M5 12h.01M12 12h.01M19 12h.01" />
  </svg>
);
export const IconSound = () => (
  <svg {...base}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
export const IconMute = () => (
  <svg {...base}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </svg>
);
