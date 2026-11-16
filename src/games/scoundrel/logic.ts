import { createStandardDeck } from '@/core/deck/createDeck';
import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { CardId, StandardCard } from '@/core/types/card';
import type { GameRules, RuleOptions } from '@/core/types/game';

export const MAX_HEALTH = 20;

export type Kind = 'monster' | 'weapon' | 'potion';

export const kindOf = (c: StandardCard): Kind => (c.suit === 'diamonds' ? 'weapon' : c.suit === 'hearts' ? 'potion' : 'monster');
/** Ace counts as 14. */
export const valueOf = (c: StandardCard) => (c.rank === 1 ? 14 : c.rank);

export interface ScoundrelState {
  dungeon: StandardCard[]; // top = end
  room: StandardCard[];
  health: number;
  weapon: StandardCard | null;
  slain: StandardCard[]; // monsters stacked on the current weapon
  discard: StandardCard[];
  resolvedInRoom: number;
  potionUsed: boolean;
  avoidedLast: boolean;
  lastTaken: StandardCard | null;
  log: string;
  /** After a kill, the weapon also works on a monster of the same value (otherwise only lower). */
  weaponAllowsEqual: boolean;
}

export type ScoundrelAction = { type: 'avoid' } | { type: 'take'; id: CardId; barehanded?: boolean };

export function setup(rng: Rng, options: RuleOptions = {}): ScoundrelState {
  const deck = createStandardDeck().filter(
    (c) => !((c.suit === 'hearts' || c.suit === 'diamonds') && (c.rank === 1 || c.rank >= 11)),
  );
  const dungeon = shuffle(deck, rng);
  return {
    dungeon: dungeon.slice(0, -4),
    room: dungeon.slice(-4).map((c) => ({ ...c, faceUp: true })),
    health: MAX_HEALTH,
    weapon: null,
    slain: [],
    discard: [],
    resolvedInRoom: 0,
    potionUsed: false,
    avoidedLast: false,
    lastTaken: null,
    log: 'You enter the dungeon.',
    weaponAllowsEqual: options.weapon !== 'lower',
  };
}

export const canAvoid = (s: ScoundrelState) =>
  !s.avoidedLast && s.resolvedInRoom === 0 && s.room.length === 4 && s.dungeon.length > 0;

/** Can the equipped weapon be used on this monster? */
export function weaponUsable(s: ScoundrelState, monster: StandardCard): boolean {
  if (!s.weapon) return false;
  const last = s.slain.at(-1);
  if (!last) return true;
  return s.weaponAllowsEqual ? valueOf(monster) <= valueOf(last) : valueOf(monster) < valueOf(last);
}

export function damageFrom(s: ScoundrelState, monster: StandardCard, barehanded: boolean): number {
  const v = valueOf(monster);
  return barehanded || !weaponUsable(s, monster) ? v : Math.max(0, v - valueOf(s.weapon!));
}

function draw(s: ScoundrelState, n: number): ScoundrelState {
  const take = s.dungeon
    .slice(-n)
    .toReversed()
    .map((c) => ({ ...c, faceUp: true }));
  return { ...s, dungeon: s.dungeon.slice(0, Math.max(0, s.dungeon.length - n)), room: [...s.room, ...take] };
}

function reduce(s: ScoundrelState, a: ScoundrelAction): ScoundrelState {
  if (s.health <= 0) return s;
  if (a.type === 'avoid') {
    if (!canAvoid(s)) return s;
    const back = s.room.map((c) => ({ ...c, faceUp: false }));
    return draw({ ...s, dungeon: [...back, ...s.dungeon], room: [], avoidedLast: true, log: 'You slip past the room.' }, 4);
  }
  const card = s.room.find((c) => c.id === a.id);
  if (!card) return s;
  let next: ScoundrelState = { ...s, room: s.room.filter((c) => c.id !== a.id), lastTaken: card };
  const v = valueOf(card);
  switch (kindOf(card)) {
    case 'weapon':
      next = {
        ...next,
        weapon: card,
        slain: [],
        discard: [...next.discard, ...(s.weapon ? [s.weapon] : []), ...s.slain],
        log: `You equip a ${v} weapon.`,
      };
      break;
    case 'potion':
      if (s.potionUsed) next = { ...next, discard: [...next.discard, card], log: 'Only one potion works per room.' };
      else {
        const health = Math.min(MAX_HEALTH, s.health + v);
        next = { ...next, health, potionUsed: true, discard: [...next.discard, card], log: `You heal ${health - s.health}.` };
      }
      break;
    case 'monster': {
      const bare = !!a.barehanded || !weaponUsable(s, card);
      const dmg = damageFrom(s, card, bare);
      next = {
        ...next,
        health: s.health - dmg,
        ...(bare ? { discard: [...next.discard, card] } : { slain: [...s.slain, card] }),
        log: dmg ? `The monster hits you for ${dmg}.` : 'You slay it unharmed.',
      };
    }
  }
  next.resolvedInRoom = s.resolvedInRoom + 1;
  if (next.health > 0 && next.room.length === 1 && next.dungeon.length) {
    next = draw({ ...next, resolvedInRoom: 0, potionUsed: false, avoidedLast: false }, 3);
  }
  return next;
}

const cleared = (s: ScoundrelState) => !s.dungeon.length && !s.room.length;

export function finalScore(s: ScoundrelState): number {
  if (s.health <= 0) {
    const rest = [...s.dungeon, ...s.room].filter((c) => kindOf(c) === 'monster');
    return s.health - rest.reduce((n, c) => n + valueOf(c), 0);
  }
  const bonus = s.health === MAX_HEALTH && s.lastTaken && kindOf(s.lastTaken) === 'potion' ? valueOf(s.lastTaken) : 0;
  return s.health + bonus;
}

export const scoundrelRules: GameRules<ScoundrelState, ScoundrelAction> = {
  setup,
  reduce,
  status: (s) => (s.health <= 0 ? 'lost' : cleared(s) ? 'won' : 'playing'),
  score: finalScore,
  summary: (s) => (s.health <= 0 ? `Slain in the dungeon. Score ${finalScore(s)}` : `You escaped! Score ${finalScore(s)}`),
};
