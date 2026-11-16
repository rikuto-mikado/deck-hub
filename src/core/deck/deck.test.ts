import { describe, expect, it } from 'vitest';
import { createDeck } from './createDeck';
import { createRng } from './rng';
import { shuffle } from './shuffle';

describe('createDeck', () => {
  it('builds 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('keeps ids unique across multiple decks and jokers', () => {
    const deck = createDeck({ decks: 2, jokers: 2 });
    expect(deck).toHaveLength(108);
    expect(new Set(deck.map((c) => c.id)).size).toBe(108);
  });

  it('supports one-suit Spider (104 spades)', () => {
    const deck = createDeck({ decks: 2, suits: ['spades'] });
    expect(deck).toHaveLength(104);
    expect(deck.every((c) => c.kind === 'standard' && c.suit === 'spades')).toBe(true);
    expect(new Set(deck.map((c) => c.id)).size).toBe(104);
  });
});

describe('shuffle', () => {
  it('is deterministic for a seed and preserves cards', () => {
    const deck = createDeck();
    const a = shuffle(deck, createRng(42));
    const b = shuffle(deck, createRng(42));
    const c = shuffle(deck, createRng(43));
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(a.map((x) => x.id)).not.toEqual(c.map((x) => x.id));
    expect(a.map((x) => x.id).toSorted()).toEqual(deck.map((x) => x.id).toSorted());
    expect(deck[0]?.id).toBe('S1-0'); // input untouched
  });
});
