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
/** Seven narrow columns with room for foundations on the right (Yukon). */
const col7n = (i: number) => 12 + i * 27;

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
  // ── Expansion: solitaire ──
  yukon: ({ face, back, slot }) => {
    const X = col7n;
    for (let i = 0; i < 7; i++) {
      let y = 8;
      for (let d = 0; d < i; d++, y += 3) back(X(i), y, 20, 28);
      for (let u = 0; u < (i ? 5 : 1); u++, y += 8) face(X(i), y, 20, 28);
    }
    for (let f = 0; f < 4; f++) slot(204, 8 + f * 34, 20, 28);
  },
  'aces-up': ({ face, back, slot }) => {
    back(20, 20, 30, 42);
    for (let i = 0; i < 4; i++) for (let k = 0; k <= (i % 3) + 1; k++) face(66 + i * 36, 20 + k * 12, 30, 42);
    slot(196, 20, 30, 42);
  },
  'forty-thieves': ({ face, back, slot }) => {
    for (let i = 0; i < 8; i++) (i === 2 || i === 5 ? face : slot)(13 + i * 21, 6, 17, 24);
    back(181, 6, 17, 24);
    face(202, 6, 17, 24);
    for (let c = 0; c < 10; c++) for (let r = 0; r < 4; r++) face(13 + c * 21, 40 + r * 9, 17, 24);
  },
  'clock-solitaire': ({ face, back }) => {
    for (let i = 0; i < 12; i++) {
      const a = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;
      const x = 116 + Math.cos(a) * 82 - 9,
        y = 75 + Math.sin(a) * 54 - 12;
      (i % 4 === 1 ? face : back)(x, y, 18, 25);
    }
    back(107, 63, 18, 25);
    face(110, 61, 18, 25);
  },
  'poker-squares': ({ face, slot, bar }) => {
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) ((r * 5 + c) % 3 === 2 ? slot : face)(52 + c * 24, 6 + r * 28, 20, 26);
    for (let r = 0; r < 5; r++) bar(176, 16 + r * 28, 12, 4, r === 1 ? 'rgb(201 164 92 / 0.8)' : 'rgb(201 164 92 / 0.3)');
    face(196, 60, 24, 34);
  },
  canfield: ({ face, back, slot }) => {
    back(12, 10, 22, 31);
    face(40, 10, 22, 31);
    face(98, 10, 22, 31);
    for (let f = 1; f < 4; f++) slot(98 + f * 30, 10, 22, 31);
    for (let k = 0; k < 6; k++) back(12, 52 + k * 3, 22, 31);
    face(12, 70, 22, 31);
    for (let i = 0; i < 4; i++) for (let r = 0; r <= i % 2; r++) face(98 + i * 30, 54 + r * 10, 22, 31);
  },
  'monte-carlo': ({ face, slot }) => {
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) ((r === 1 && c === 2) || (r === 3 && c === 0) ? slot : face)(54 + c * 25, 4 + r * 29, 21, 27);
  },
  calculation: ({ face, back, slot }) => {
    for (let f = 0; f < 4; f++) face(14 + f * 32, 8, 24, 34);
    back(160, 8, 24, 34);
    face(190, 8, 24, 34, { ring: true });
    for (let w = 0; w < 4; w++) {
      if (w === 3) slot(14 + w * 32, 56, 24, 34);
      for (let k = 0; k < (w === 3 ? 0 : 3 - w); k++) face(14 + w * 32, 56 + k * 12, 24, 34);
    }
  },
  accordion: ({ face }) => {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < (r === 3 ? 6 : 13); c++) face(8 + c * 17, 8 + r * 34, 15, 21, { lift: r === 3 && c === 5 ? -4 : 0 });
  },
  'crazy-quilt': ({ face, slot }) => {
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 8; c++) {
        const upright = (r + c) % 2 === 0;
        if (upright) face(64 + c * 18, 4 + r * 24, 13, 18);
        else face(61 + c * 18, 7 + r * 24, 18, 13);
      }
    for (let f = 0; f < 8; f++) (f % 3 ? slot : face)(14 + (f % 2) * 20, 6 + Math.floor(f / 2) * 34, 16, 22);
  },
  'beleaguered-castle': ({ face }) => {
    for (let f = 0; f < 4; f++) face(106, 6 + f * 35, 20, 28);
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 6; k++) {
        face(10 + k * 14, 6 + r * 35, 20, 28);
        face(202 - k * 14, 6 + r * 35, 20, 28);
      }
  },
  elevens: ({ face, back }) => {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) face(56 + c * 36, 6 + r * 46, 30, 42, { ring: (r === 0 && c === 1) || (r === 2 && c === 2) });
    back(176, 50, 30, 42);
  },
  osmosis: ({ face, back }) => {
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 3; k++) back(8 + k * 4, 6 + r * 35, 20, 28);
      face(20, 6 + r * 35, 20, 28);
      for (let k = 0; k < 4 - r; k++) face(62 + k * 14, 6 + r * 35, 20, 28);
    }
    back(196, 20, 20, 28);
    face(196, 60, 20, 28);
  },
  // ── Expansion: solo & casino ──
  regicide: ({ face, back, bar }) => {
    back(20, 14, 34, 48);
    face(24, 12, 34, 48);
    bar(70, 20, 120, 6, 'rgb(0 0 0 / 0.35)');
    bar(70, 20, 70, 6, '#c8402f');
    bar(70, 34, 50, 6, '#c9a45c');
    for (let i = 0; i < 8; i++) face(30 + i * 22, 100, 26, 36, { lift: i === 2 ? -8 : 0 });
  },
  baccarat: ({ face, chip }) => {
    face(46, 18, 30, 42);
    face(62, 20, 30, 42);
    face(140, 18, 30, 42);
    face(156, 20, 30, 42);
    chip(56, 108, 20, '#2f5fb3');
    chip(106, 108, 20, '#3c8a5a');
    chip(156, 108, 20, '#b3362f');
  },
  'card-capture': ({ face, back }) => {
    back(12, 14, 26, 36);
    for (let i = 0; i < 4; i++) face(52 + i * 40, 12, 32, 44);
    for (let i = 0; i < 4; i++) face(62 + i * 28, 92, 30, 42, { lift: i === 1 ? -8 : 0 });
  },
  gridcannon: ({ face, back }) => {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) face(80 + c * 26, 30 + r * 31, 22, 29);
    for (const [x, y] of [
      [106, 0],
      [158, 61],
      [80, 122],
      [54, 30],
    ] as [number, number][])
      face(x, y, 22, 28);
    back(190, 100, 22, 30);
  },
  'the-emissary': ({ face }) => {
    for (let i = 0; i < 4; i++) face(36 + i * 44, 8, 26, 36, { ring: i === 1 });
    face(96, 58, 26, 36);
    face(112, 60, 26, 36);
    for (let i = 0; i < 8; i++) face(36 + i * 20, 106, 24, 33);
  },
  'red-dog': ({ face, chip }) => {
    face(50, 30, 38, 54);
    face(97, 30, 38, 54, { ring: true });
    face(144, 30, 38, 54);
    chip(84, 112, 20, '#a3202e');
    chip(128, 112, 20, '#17171a');
  },
  // ── Expansion: vs CPU ──
  'texas-holdem': ({ face, back, chip }) => {
    for (const x of [24, 98, 172]) {
      back(x, 6, 16, 22);
      back(x + 12, 6, 16, 22);
    }
    for (let i = 0; i < 5; i++) face(50 + i * 27, 50, 23, 32);
    chip(196, 58, 16, '#a3202e');
    face(92, 108, 24, 34);
    face(112, 110, 24, 34);
  },
  hearts: ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 5; k++) back(x + k * 6, 6, 14, 20);
    face(104, 38, 22, 30);
    face(80, 52, 22, 30);
    face(128, 52, 22, 30);
    for (let i = 0; i < 10; i++) face(36 + i * 16, 104, 22, 31);
  },
  spades: ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 5; k++) back(x + k * 6, 6, 14, 20);
    face(104, 40, 22, 30);
    face(128, 54, 22, 30);
    for (let i = 0; i < 10; i++) face(36 + i * 16, 104, 22, 31, { lift: i === 6 ? -6 : 0 });
  },
  napoleon: ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 5; k++) back(x + k * 6, 6, 14, 20);
    face(64, 46, 22, 30, { ring: true });
    face(104, 44, 22, 30);
    face(128, 52, 22, 30);
    for (let i = 0; i < 9; i++) face(44 + i * 17, 104, 22, 31);
  },
  'page-one': ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 5; k++) back(x + k * 6, 6, 14, 20);
    back(84, 46, 24, 34);
    face(118, 46, 24, 34);
    for (let i = 0; i < 7; i++) face(60 + i * 17, 104, 22, 31);
  },
  doubt: ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 5; k++) back(x + k * 6, 6, 14, 20);
    for (let k = 0; k < 5; k++) back(92 + k * 3, 46 - k, 24, 34);
    for (let i = 0; i < 10; i++) face(36 + i * 16, 104, 22, 31, { lift: i === 4 || i === 5 ? -7 : 0 });
  },
  'gin-rummy': ({ face, back }) => {
    for (let k = 0; k < 10; k++) back(70 + k * 9, 6, 16, 22);
    back(86, 46, 24, 34);
    face(120, 46, 24, 34);
    for (let i = 0; i < 10; i++) face(36 + i * 16, 104, 22, 31);
  },
  war: ({ face, back }) => {
    back(48, 12, 30, 42);
    face(116, 12, 30, 42);
    back(48, 92, 30, 42);
    face(116, 92, 30, 42);
    face(150, 52, 30, 42, { rotate: 8 });
  },
  cribbage: ({ face, back, bar }) => {
    bar(20, 10, 90, 4, 'rgb(201 164 92 / 0.8)');
    bar(20, 20, 70, 4, 'rgb(201 164 92 / 0.45)');
    for (let k = 0; k < 4; k++) back(140 + k * 9, 6, 16, 22);
    face(36, 52, 24, 34);
    for (let k = 0; k < 4; k++) face(90 + k * 14, 52, 24, 34);
    for (let i = 0; i < 6; i++) face(64 + i * 18, 104, 24, 33);
  },
  euchre: ({ face, back }) => {
    for (const x of [30, 100, 170]) for (let k = 0; k < 4; k++) back(x + k * 6, 6, 14, 20);
    face(102, 44, 24, 34, { ring: true });
    for (let i = 0; i < 5; i++) face(70 + i * 20, 104, 24, 33);
  },
  schnapsen: ({ face, back }) => {
    for (let k = 0; k < 5; k++) back(80 + k * 12, 6, 16, 22);
    face(52, 52, 34, 24);
    back(66, 46, 24, 34);
    face(128, 46, 24, 34);
    face(146, 48, 24, 34);
    for (let i = 0; i < 5; i++) face(70 + i * 20, 104, 24, 33);
  },
  'six-card-golf': ({ face, back }) => {
    for (const x of [16, 88, 160])
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) ((r + c) % 3 ? back : face)(x + c * 18, 6 + r * 22, 16, 21);
    back(90, 56, 22, 30);
    face(118, 56, 22, 30);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) (r === 0 && c === 1 ? back : face)(86 + c * 22, 94 + r * 28, 20, 26);
  },
  cuttle: ({ face, back }) => {
    for (let k = 0; k < 5; k++) back(80 + k * 10, 4, 14, 20);
    face(40, 30, 20, 28);
    face(64, 30, 20, 28);
    face(160, 30, 20, 28);
    back(102, 62, 20, 28);
    face(128, 62, 20, 28);
    face(40, 92, 20, 28);
    face(170, 92, 20, 28);
    for (let i = 0; i < 6; i++) face(70 + i * 16, 120, 18, 26);
  },
  gops: ({ face, back }) => {
    for (let k = 0; k < 12; k++) back(50 + k * 10, 4, 14, 20);
    face(64, 46, 26, 36);
    face(104, 44, 26, 36, { ring: true });
    face(144, 46, 26, 36);
    for (let i = 0; i < 12; i++) face(30 + i * 14, 108, 20, 28);
  },
  yaniv: ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 5; k++) back(x + k * 6, 6, 14, 20);
    back(80, 46, 24, 34);
    face(114, 46, 24, 34);
    face(128, 46, 24, 34);
    for (let i = 0; i < 5; i++) face(70 + i * 20, 104, 24, 33);
  },
  palace: ({ face, back }) => {
    for (const x of [16, 88, 160])
      for (let k = 0; k < 3; k++) {
        back(x + k * 18, 6, 16, 22);
        face(x + k * 18, 10, 16, 22);
      }
    face(98, 50, 24, 34);
    face(108, 52, 24, 34);
    for (let k = 0; k < 3; k++) {
      back(34 + k * 22, 100, 20, 28);
      face(34 + k * 22, 106, 20, 28);
    }
    for (let i = 0; i < 3; i++) face(128 + i * 20, 104, 24, 33);
  },
  durak: ({ face, back }) => {
    for (const x of [30, 150]) for (let k = 0; k < 6; k++) back(x + k * 7, 6, 14, 20);
    face(24, 50, 34, 24);
    back(30, 46, 22, 30);
    for (let i = 0; i < 3; i++) {
      face(84 + i * 36, 44, 22, 30);
      if (i < 2) face(92 + i * 36, 52, 22, 30);
    }
    for (let i = 0; i < 6; i++) face(66 + i * 18, 104, 24, 33);
  },
  'big-two': ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 5; k++) back(x + k * 6, 6, 14, 20);
    for (let i = 0; i < 5; i++) face(70 + i * 16, 46, 22, 30);
    for (let i = 0; i < 10; i++) face(36 + i * 16, 104, 22, 31, { lift: i === 2 || i === 3 ? -7 : 0 });
  },
  'ninety-nine': ({ face, back, bar }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 3; k++) back(x + k * 8, 6, 14, 20);
    back(62, 46, 24, 34);
    face(96, 46, 24, 34);
    bar(140, 54, 44, 20, 'rgb(201 164 92 / 0.85)');
    for (let i = 0; i < 3; i++) face(86 + i * 22, 104, 24, 33);
  },
  'oh-hell': ({ face, back }) => {
    for (const x of [22, 94, 166]) for (let k = 0; k < 4; k++) back(x + k * 6, 6, 14, 20);
    face(150, 46, 24, 34, { ring: true });
    face(90, 46, 24, 34);
    face(108, 50, 24, 34);
    for (let i = 0; i < 7; i++) face(60 + i * 17, 104, 22, 31);
  },
};

export function previewItems(gameId: string): PreviewItem[] {
  const b = builder(gameId.length * 3);
  LAYOUTS[gameId]?.(b);
  return b.items;
}
