import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng, nextSeed, type Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { SUIT_SYMBOL, cardLabel, type CardId, type StandardCard, type Suit } from '@/core/types/card';
import type { GameRules, Hint } from '@/core/types/game';

export const MAX_HAND = 8;
export const JESTERS = 2;
export const HP: Record<number, number> = { 11: 20, 12: 30, 13: 40 };
export const ATK: Record<number, number> = { 11: 10, 12: 15, 13: 20 };

export interface RegicideState {
  /** Bosses still to fight; the last is the current one. */
  castle: StandardCard[];
  damage: number;
  shield: number;
  /** Cards played against the current boss (they leave when it falls). */
  played: StandardCard[];
  tavern: StandardCard[];
  hand: StandardCard[];
  discard: StandardCard[];
  jesters: number;
  phase: 'attack' | 'defend';
  seed: number;
  defeated: number;
  log: string;
}

export type RegicideAction =
  { type: 'attack'; ids: CardId[] } | { type: 'yield' } | { type: 'defend'; ids: CardId[] } | { type: 'jester' };

/** A 1, number cards face value, Jacks 10, Queens 15, Kings 20 (captured royals in hand). */
export const valueOf = (c: StandardCard) => (c.rank === 11 ? 10 : c.rank === 12 ? 15 : c.rank === 13 ? 20 : c.rank);
const sum = (cards: readonly StandardCard[]) => cards.reduce((n, c) => n + valueOf(c), 0);
const up = (c: StandardCard) => ({ ...c, faceUp: true });

export function setup(rng: Rng): RegicideState {
  const deck = createStandardDeck();
  const royals = (r: number) =>
    shuffle(
      deck.filter((c) => c.rank === r),
      rng,
    );
  // Kings at the bottom, Queens, then Jacks on top (the end of the array).
  const castle = [...royals(13), ...royals(12), ...royals(11)].map(up);
  const tavern = shuffle(
    deck.filter((c) => c.rank <= 10),
    rng,
  );
  const hand = tavern.splice(-MAX_HAND).map(up);
  return {
    castle,
    damage: 0,
    shield: 0,
    played: [],
    tavern,
    hand,
    discard: [],
    jesters: JESTERS,
    phase: 'attack',
    seed: nextSeed(rng),
    defeated: 0,
    log: `The ${cardLabel(castle.at(-1)!)} awaits. Attack!`,
  };
}

export const boss = (s: RegicideState) => s.castle.at(-1) ?? null;
export const bossHp = (s: RegicideState) => (boss(s) ? HP[boss(s)!.rank]! : 0);
export const bossAtk = (s: RegicideState) => (boss(s) ? Math.max(0, ATK[boss(s)!.rank]! - s.shield) : 0);

/** Single card; an Ace (animal companion) with one other card; or 2–4 equal number cards totalling 10 or less. */
export function isValidAttack(cards: readonly StandardCard[]): boolean {
  if (cards.length === 1) return true;
  if (cards.length === 2 && cards.some((c) => c.rank === 1)) return true;
  if (cards.length < 2 || cards.length > 4) return false;
  return cards.every((c) => c.rank === cards[0]!.rank && c.rank <= 10) && sum(cards) <= 10;
}

function drawCards(hand: StandardCard[], tavern: StandardCard[], n: number) {
  const h = hand.slice(),
    t = tavern.slice();
  for (let i = 0; i < n && h.length < MAX_HAND && t.length; i++) h.push(up(t.pop()!));
  return { hand: h, tavern: t };
}

function attack(s: RegicideState, ids: CardId[]): RegicideState {
  const cards = s.hand.filter((c) => ids.includes(c.id));
  if (cards.length !== ids.length || !isValidAttack(cards)) return s;
  const target = boss(s)!;
  const immune = target.suit;
  const n = sum(cards);
  const suits = new Set<Suit>(cards.map((c) => c.suit));
  const active = (suit: Suit) => suits.has(suit) && suit !== immune;
  let next: RegicideState = { ...s, hand: s.hand.filter((c) => !ids.includes(c.id)), played: [...s.played, ...cards] };
  const notes: string[] = [];
  if (active('hearts')) {
    // Heal: shuffle the discard pile and slide n cards under the tavern deck.
    const rng = createRng(s.seed);
    const pile = shuffle(next.discard, rng);
    const healed = pile.slice(0, n).map((c) => ({ ...c, faceUp: false }));
    next = { ...next, discard: pile.slice(n), tavern: [...healed, ...next.tavern], seed: nextSeed(rng) };
    notes.push(`♥ healed ${healed.length}`);
  }
  if (active('diamonds')) {
    const before = next.hand.length;
    next = { ...next, ...drawCards(next.hand, next.tavern, n) };
    notes.push(`♦ drew ${next.hand.length - before}`);
  }
  if (active('spades')) {
    next = { ...next, shield: next.shield + n };
    notes.push(`♠ shield ${next.shield}`);
  }
  const dmg = active('clubs') ? n * 2 : n;
  if (active('clubs')) notes.push('♣ double damage');
  const damage = next.damage + dmg;
  const hp = HP[target.rank]!;
  const head = `You hit the ${cardLabel(target)} for ${dmg}${notes.length ? ` (${notes.join(', ')})` : ''}.`;
  if (damage >= hp) {
    const exact = damage === hp;
    const castle = next.castle.slice(0, -1);
    const fallen = { ...target, faceUp: false };
    next = {
      ...next,
      castle,
      damage: 0,
      shield: 0,
      played: [],
      discard: [...next.discard, ...next.played, ...(exact ? [] : [target])],
      tavern: exact ? [...next.tavern, fallen] : next.tavern,
      defeated: s.defeated + 1,
      phase: 'attack',
    };
    const nextBoss = castle.at(-1);
    return {
      ...next,
      log: `${head} The ${cardLabel(target)} falls${exact ? ' — exact kill! It joins your tavern deck' : ''}.${nextBoss ? ` Next: ${cardLabel(nextBoss)}.` : ''}`,
    };
  }
  next = { ...next, damage };
  return toDefense(next, head);
}

function toDefense(s: RegicideState, head: string): RegicideState {
  const atk = bossAtk(s);
  if (atk === 0) return { ...s, phase: 'attack', log: `${head} Your shield absorbs the counterattack.` };
  return { ...s, phase: 'defend', log: `${head} It strikes back for ${atk}: discard cards worth at least ${atk}.` };
}

function reduce(s: RegicideState, a: RegicideAction): RegicideState {
  if (!boss(s)) return s;
  switch (a.type) {
    case 'attack':
      return s.phase === 'attack' ? attack(s, a.ids) : s;
    case 'yield':
      return s.phase === 'attack' ? toDefense(s, 'You hold back.') : s;
    case 'defend': {
      if (s.phase !== 'defend') return s;
      const cards = s.hand.filter((c) => a.ids.includes(c.id));
      if (cards.length !== a.ids.length || sum(cards) < bossAtk(s)) return s;
      return {
        ...s,
        hand: s.hand.filter((c) => !a.ids.includes(c.id)),
        discard: [...s.discard, ...cards],
        phase: 'attack',
        log: `You weather the blow. Attack the ${cardLabel(boss(s)!)} (${bossHp(s) - s.damage} HP left).`,
      };
    }
    case 'jester': {
      if (!s.jesters) return s;
      const flushed = { ...s, discard: [...s.discard, ...s.hand], hand: [] as StandardCard[] };
      return {
        ...flushed,
        ...drawCards([], flushed.tavern, MAX_HAND),
        jesters: s.jesters - 1,
        log: 'The Jester shuffles your fortunes: a fresh hand of eight.',
      };
    }
  }
}

/** Smallest set of hand cards worth at least `need` (used to check survival and to hint defence). */
export function cheapestCover(hand: readonly StandardCard[], need: number): StandardCard[] | null {
  if (sum(hand) < need) return null;
  let best: StandardCard[] | null = null;
  const n = hand.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const pick = hand.filter((_, i) => mask & (1 << i));
    const v = sum(pick);
    if (v >= need && (!best || v < sum(best) || (v === sum(best) && pick.length < best.length))) best = pick;
  }
  return best;
}

function hint(s: RegicideState): Hint | null {
  const b = boss(s);
  if (!b) return null;
  if (s.phase === 'defend') {
    const cover = cheapestCover(s.hand, bossAtk(s));
    return cover
      ? { cards: cover.map((c) => c.id) }
      : s.jesters
        ? { message: 'You cannot cover the blow — play a Jester.' }
        : null;
  }
  // Prefer an exact kill, then any kill, then the attack that leaves the cheapest defence.
  const left = bossHp(s) - s.damage;
  const options: StandardCard[][] = s.hand.map((c) => [c]);
  for (let i = 0; i < s.hand.length; i++)
    for (let j = i + 1; j < s.hand.length; j++)
      if (isValidAttack([s.hand[i]!, s.hand[j]!])) options.push([s.hand[i]!, s.hand[j]!]);
  const dmgOf = (cards: StandardCard[]) => {
    const n = sum(cards);
    return cards.some((c) => c.suit === 'clubs') && b.suit !== 'clubs' ? n * 2 : n;
  };
  const exact = options.find((o) => dmgOf(o) === left);
  if (exact) return { cards: exact.map((c) => c.id), message: 'An exact kill sends the royal into your deck.' };
  const kill = options.filter((o) => dmgOf(o) > left).toSorted((x, y) => sum(x) - sum(y))[0];
  if (kill) return { cards: kill.map((c) => c.id) };
  const best = options.toSorted((x, y) => dmgOf(y) - dmgOf(x))[0];
  return best ? { cards: best.map((c) => c.id) } : null;
}

export const regicideRules: GameRules<RegicideState, RegicideAction> = {
  setup,
  reduce,
  hint,
  status: (s) => {
    if (!boss(s)) return 'won';
    if (s.jesters) return 'playing';
    if (s.phase === 'defend' && sum(s.hand) < bossAtk(s)) return 'lost';
    if (s.phase === 'attack' && !s.hand.length && sum(s.hand) < bossAtk(s)) return 'lost';
    return 'playing';
  },
  score: (s) => s.defeated,
  summary: (s) => {
    if (!boss(s)) {
      const medal = s.jesters === 2 ? 'Gold' : s.jesters === 1 ? 'Silver' : 'Bronze';
      return `All twelve royals defeated — a ${medal} victory (${JESTERS - s.jesters} Jester${JESTERS - s.jesters === 1 ? '' : 's'} used).`;
    }
    return `Defeated ${s.defeated} of 12 royals. The ${cardLabel(boss(s)!)} (${SUIT_SYMBOL[boss(s)!.suit]}) was too strong.`;
  },
};
