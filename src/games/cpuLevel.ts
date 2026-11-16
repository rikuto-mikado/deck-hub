import type { OptionSpec, RuleOptions } from '@/core/types/game';

/** How strongly the CPU players play. Shared by every game with computer opponents. */
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
