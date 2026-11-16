import { describe, expect, it } from 'vitest';
import { makeCard } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import { SLOTS, canPlay, isOpen, setup, triPeaksRules } from './logic';

describe('tripeaks', () => {
  it('has 28 slots with bottom row open and face-up', () => {
    const s = setup(createRng(5));
    expect(SLOTS).toHaveLength(28);
    const open = s.peaks.map((_, i) => isOpen(s, i));
    expect(open.filter(Boolean)).toHaveLength(10);
    expect(s.peaks.slice(18).every((c) => c?.faceUp)).toBe(true);
    expect(s.peaks.slice(0, 18).every((c) => !c?.faceUp)).toBe(true);
  });

  it('wraps K↔A and reveals uncovered cards', () => {
    const s0 = setup(createRng(5));
    const peaks = s0.peaks.slice();
    peaks[18] = makeCard('spades', 1, 0, true);
    peaks[19] = makeCard('hearts', 2, 0, true);
    const s = { ...s0, peaks, waste: [makeCard('clubs', 13, 0, true)] };
    expect(canPlay(s, 18)).toBe(true);
    const a = triPeaksRules.reduce(s, { type: 'play', slot: 18 });
    const b = triPeaksRules.reduce(a, { type: 'play', slot: 19 });
    expect(b.streak).toBe(2);
    expect(b.peaks[9]?.faceUp).toBe(true); // row-2 slot covered only by 18 and 19
  });
});
