/**
 * Miniature tables for the game picker: each game's opening layout drawn with tiny cards
 * on a 232×150 canvas. Pure data so the picker stays cheap to render.
 */
export interface PreviewItem {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'face' | 'back' | 'slot' | 'bar' | 'chip';
  label?: string;
  red?: boolean;
  fill?: string;
  lift?: number;
  rotate?: number;
  /** Highlighted like a selected card (held in Video Poker, just flipped in Concentration). */
  ring?: boolean;
}

export const PREVIEW_W = 232;
export const PREVIEW_H = 150;

const SEQ = [
  '7♥',
  'K♠',
  '3♦',
  '10♣',
  'A♠',
  '9♥',
  'Q♦',
  '5♣',
  'J♥',
  '2♠',
  '8♦',
  '4♣',
  '6♥',
  'K♦',
  'A♣',
  '9♠',
  'Q♥',
  '3♣',
  '8♠',
  '5♦',
];

function builder(seed: number) {
  let i = seed;
  const items: PreviewItem[] = [];
  const face = (x: number, y: number, w: number, h: number, extra: Partial<PreviewItem> = {}) => {
    const label = SEQ[i++ % SEQ.length]!;
    items.push({ x, y, w, h, kind: 'face', label, red: /[♥♦]/.test(label), ...extra });
  };
  const back = (x: number, y: number, w: number, h: number) => items.push({ x, y, w, h, kind: 'back' });
  const slot = (x: number, y: number, w: number, h: number) => items.push({ x, y, w, h, kind: 'slot' });
  const bar = (x: number, y: number, w: number, h: number, fill: string) => items.push({ x, y, w, h, kind: 'bar', fill });
  const chip = (x: number, y: number, d: number, fill: string) => items.push({ x, y, w: d, h: d, kind: 'chip', fill });
  return { items, face, back, slot, bar, chip };
}

type Builder = ReturnType<typeof builder>;

/** Left edge of column `i` for tables of 7, 8 and 10 columns. */
const col7 = (i: number) => 15 + i * 30;
const col8 = (i: number) => 15 + i * 26;
const col10 = (i: number) => 13 + i * 21;

const LAYOUTS: Record<string, (b: Builder) => void> = {
  klondike: ({ face, back, slot }) => {
    const X = col7;
    back(X(0), 10, 22, 31);
    face(X(1), 10, 22, 31);
    slot(X(3), 10, 22, 31);
    face(X(4), 10, 22, 31);
    slot(X(5), 10, 22, 31);
    slot(X(6), 10, 22, 31);
    for (let i = 0; i < 7; i++) {
      let y = 50;
      for (let d = 0; d < i; d++, y += 4) back(X(i), y, 22, 31);
      face(X(i), y, 22, 31);
      if (i % 3 === 0) face(X(i), y + 10, 22, 31);
    }
  },
  freecell: ({ face, slot }) => {
    const X = col8;
    for (let i = 0; i < 8; i++) (i === 1 || i === 5 ? face : slot)(X(i), 8, 20, 28);
    for (let c = 0; c < 8; c++) for (let r = 0; r < (c < 4 ? 7 : 6); r++) face(X(c), 44 + r * 10, 20, 28);
  },
  spider: ({ face, back }) => {
    const X = col10;
    back(X(0), 8, 17, 24);
    back(X(0) + 3, 8, 17, 24);
    back(X(0) + 6, 8, 17, 24);
    for (let i = 0; i < 10; i++) {
      let y = 40;
      for (let d = 0; d < (i < 4 ? 5 : 4); d++, y += 4) back(X(i), y, 17, 24);
      face(X(i), y, 17, 24);
      if (i % 4 === 1) face(X(i), y + 8, 17, 24);
    }
  },
  pyramid: ({ face, back }) => {
    for (let r = 0; r < 7; r++) for (let c = 0; c <= r; c++) face(116 - (r + 1) * 12 + c * 24, 6 + r * 11, 20, 28);
    back(92, 112, 20, 28);
    face(118, 112, 20, 28);
  },
  tripeaks: ({ face, back }) => {
    const U = 19,
      L = 21;
    for (let p = 0; p < 3; p++) back(L + (p * 3 + 1.5) * U, 10, 18, 25);
    for (let i = 0; i < 6; i++) back(L + (Math.floor(i / 2) * 3 + (i % 2) + 1) * U, 22, 18, 25);
    for (let j = 0; j < 9; j++) back(L + (j + 0.5) * U, 34, 18, 25);
    for (let k = 0; k < 10; k++) face(L + k * U, 46, 18, 25);
    back(90, 104, 18, 25);
    face(114, 104, 18, 25);
  },
  golf: ({ face, back }) => {
    const X = col7;
    for (let i = 0; i < 7; i++) for (let r = 0; r < 5; r++) face(X(i), 8 + r * 9, 22, 31);
    back(X(0), 104, 22, 31);
    face(X(1), 104, 22, 31);
    face(X(1) + 9, 104, 22, 31);
  },
  scoundrel: ({ face, bar }) => {
    bar(16, 14, 200, 6, 'rgb(0 0 0 / 0.35)');
    bar(16, 14, 140, 6, '#d9772f');
    for (let i = 0; i < 4; i++) face(16 + i * 52, 34, 46, 64);
    face(16, 108, 22, 31);
    face(30, 110, 22, 31);
  },
  'video-poker': ({ face, bar }) => {
    for (let l = 0; l < 4; l++)
      bar(24, 12 + l * 9, 184 - l * 22, 3, l === 1 ? 'rgb(201 164 92 / 0.75)' : 'rgb(201 164 92 / 0.25)');
    for (let i = 0; i < 5; i++) face(17 + i * 41, i === 1 || i === 3 ? 56 : 62, 34, 48, { ring: i === 1 || i === 3 });
  },
  'high-low': ({ face, back, bar }) => {
    back(64, 26, 44, 62);
    back(66, 24, 44, 62);
    face(124, 24, 44, 62);
    bar(76, 108, 36, 22, 'rgb(201 164 92 / 0.85)');
    bar(120, 108, 36, 22, 'rgb(237 230 214 / 0.16)');
  },
  blackjack: ({ face, back, chip }) => {
    face(88, 12, 28, 40);
    back(108, 14, 28, 40);
    face(80, 72, 28, 40);
    face(96, 74, 28, 40);
    face(112, 76, 28, 40);
    chip(26, 112, 18, '#a3202e');
    chip(48, 112, 18, '#1f4e3a');
    chip(186, 112, 18, '#17171a');
  },
  concentration: ({ face, back }) => {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 8; c++) {
        const up = (r === 1 && c === 2) || (r === 2 && c === 5);
        if (up) face(23 + c * 24, 14 + r * 31, 18, 25, { ring: true });
        else back(23 + c * 24, 14 + r * 31, 18, 25);
      }
  },
  'old-maid': ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 5; k++) back(x + k * 6, 10, 14, 20);
    face(104, 46, 20, 28);
    face(110, 48, 20, 28);
    for (let i = 0; i < 6; i++) face(60 + i * 18, 100, 24, 34);
  },
  sevens: ({ face, slot }) => {
    const spans: [number, number][] = [
      [3, 9],
      [5, 11],
      [2, 8],
      [4, 8],
    ];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 13; c++) {
        const [a, b] = spans[r]!;
        (c >= a && c <= b ? face : slot)(26 + c * 14, 8 + r * 20, 12, 17);
      }
    for (let i = 0; i < 7; i++) face(64 + i * 14, 98, 22, 31);
  },
  daifugo: ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 5; k++) back(x + k * 6, 8, 14, 20);
    face(92, 42, 26, 36, { rotate: -6 });
    face(110, 44, 26, 36, { rotate: 6 });
    for (let i = 0; i < 9; i++) face(46 + i * 15, 104, 22, 31, { lift: i === 3 || i === 4 ? -7 : 0 });
  },
  speed: ({ face, back }) => {
    back(26, 8, 24, 34);
    for (let i = 0; i < 4; i++) face(62 + i * 34, 8, 24, 34);
    face(88, 58, 24, 34);
    face(122, 58, 24, 34);
    for (let j = 0; j < 4; j++) face(62 + j * 34, 108, 24, 34);
    back(206, 108, 24, 34);
  },
};

export function previewItems(gameId: string): PreviewItem[] {
  const b = builder(gameId.length * 3);
  LAYOUTS[gameId]?.(b);
  return b.items;
}
