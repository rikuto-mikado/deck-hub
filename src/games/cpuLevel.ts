import type { Rng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import type { OptionSpec, RuleOptions } from '@/core/types/game';

/**
 * How strongly the CPU players play. Shared by every game with computer opponents.
 * Skill governs calculation depth, memory and mistake rate — and how well a CPU hides its timing.
 */
export type CpuLevel = 'easy' | 'normal' | 'hard';

export const CPU_OPTION: OptionSpec = {
  id: 'cpu',
  label: 'CPU strength',
  choices: [
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
  ],
  default: 'normal',
};

export function readLevel(options: RuleOptions = {}): CpuLevel {
  const v = options.cpu;
  return v === 'easy' || v === 'hard' ? v : 'normal';
}

/** A stable pseudo-random index from a string, so CPU choices stay pure functions of the state. */
export function pick(key: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) % Math.max(1, n);
}

/** A stable pseudo-random number in [0, 1) from a string key. */
export const chance = (key: string) => pick(key, 10007) / 10007;

// ── Opponents: names, hidden personalities and timing tells ─────────────────────────────

/**
 * Hidden playing style, orthogonal to skill. It only biases choices between reasonable plays
 * (risk, bluffing, suspicion). It is drawn per match from the deal's seed and never shown.
 */
export type CpuPersonality = 'ambitious' | 'conservative' | 'skeptical' | 'tricky';
export const PERSONALITIES: readonly CpuPersonality[] = ['ambitious', 'conservative', 'skeptical', 'tricky'];

/** The salon's regulars. Who sits where is drawn per match. */
export const SEAT_NAMES = ['Arthur', 'Elena', 'Viktor', 'Chloe', 'Julian', 'Clara', 'Marcus', 'Sora'] as const;

export interface CpuSeat {
  name: string;
  personality: CpuPersonality;
}

/**
 * Seats `count` named opponents with hidden personalities, drawn from the setup rng. Call it
 * after dealing so the cards of a seed stay the same whoever sits at the table.
 */
export function drawSeats(rng: Rng, count: number): CpuSeat[] {
  const names = shuffle(SEAT_NAMES, rng);
  return Array.from({ length: count }, (_, i) => ({
    name: names[i % names.length]!,
    personality: PERSONALITIES[rng.int(PERSONALITIES.length)]!,
  }));
}

/** Display name for seat `p`, where seat 0 is the human and `seats[p - 1]` the CPUs. */
export function seatName(seats: readonly CpuSeat[], p: number, human = 0): string {
  if (p === human) return 'You';
  const i = p > human ? p - 1 : p;
  return seats[i]?.name ?? `CPU ${p}`;
}

/** The personality of seat `p` (seat 0 being the human), defaulting to conservative. */
export function personalityOf(seats: readonly CpuSeat[], p: number, human = 0): CpuPersonality {
  const i = p > human ? p - 1 : p;
  return seats[i]?.personality ?? 'conservative';
}

export interface Traits {
  /** Willingness to take risks: bid high, raise, hold out for big scores. 0…1. */
  risk: number;
  /** How often it lies or misrepresents its hand. 0…1. */
  bluff: number;
  /** How readily it challenges or calls others' claims. 0…1. */
  suspicion: number;
}

export const TRAITS: Record<CpuPersonality, Traits> = {
  ambitious: { risk: 0.8, bluff: 0.45, suspicion: 0.45 },
  conservative: { risk: 0.2, bluff: 0.1, suspicion: 0.3 },
  skeptical: { risk: 0.45, bluff: 0.2, suspicion: 0.8 },
  tricky: { risk: 0.55, bluff: 0.75, suspicion: 0.5 },
};

const BASE_TEMPO: Record<CpuPersonality, number> = { ambitious: 340, conservative: 520, skeptical: 460, tricky: 400 };

/**
 * How long a CPU takes to act. Each personality has its own rhythm; a tense decision (a bluff,
 * a heavy bet, a painful forced play) adds a hesitation on Easy and Normal. Hard keeps a
 * disciplined poker face: one uniform tempo that gives nothing away.
 */
export function tempo(personality: CpuPersonality, level: CpuLevel, tense = false, key = ''): number {
  if (level === 'hard') return 480;
  const jitter = key ? pick(key, 60) - 30 : 0;
  const hesitation = tense ? (level === 'easy' ? 350 : 250) : 0;
  return BASE_TEMPO[personality] + hesitation + jitter;
}
