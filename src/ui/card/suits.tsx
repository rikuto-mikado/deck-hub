import type { Suit } from '@/core/types/card';

/**
 * Hand-drawn suit marks on a 100×100 box. Drawing them (instead of using ♠♥♦♣ glyphs)
 * keeps the shapes identical on every OS and font.
 */
const PATHS: Record<Suit, string[]> = {
  hearts: ['M50 90C22 70 4 53 4 32C4 16 16 6 29 6C39 6 46 12 50 21C54 12 61 6 71 6C84 6 96 16 96 32C96 53 78 70 50 90Z'],
  diamonds: ['M50 3C61 21 75 37 91 50C75 63 61 79 50 97C39 79 25 63 9 50C25 37 39 21 50 3Z'],
  spades: [
    'M50 4C64 22 96 40 96 62C96 76 86 84 74 84C64 84 57 79 53 72C54 82 58 90 66 96L34 96C42 90 46 82 47 72C43 79 36 84 26 84C14 84 4 76 4 62C4 40 36 22 50 4Z',
  ],
  clubs: [
    'M50 8a19 19 0 1 1 0 38a19 19 0 1 1 0-38Z',
    'M28 40a19 19 0 1 1 0 38a19 19 0 1 1 0-38Z',
    'M72 40a19 19 0 1 1 0 38a19 19 0 1 1 0-38Z',
    'M50 42a11 11 0 1 1 0 22a11 11 0 1 1 0-22Z',
    'M47 56C47 78 42 90 33 96L67 96C58 90 53 78 53 56Z',
  ],
};

/** A suit mark centred on (cx, cy), `size` units across, optionally upside down. */
export function SuitMark({
  suit,
  cx,
  cy,
  size,
  fill,
  flip = false,
}: {
  suit: Suit;
  cx: number;
  cy: number;
  size: number;
  fill: string;
  flip?: boolean;
}) {
  const s = size / 100;
  const transform = `translate(${cx} ${cy})${flip ? ' rotate(180)' : ''} scale(${s}) translate(-50 -50)`;
  return (
    <g transform={transform} fill={fill}>
      {PATHS[suit].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}
