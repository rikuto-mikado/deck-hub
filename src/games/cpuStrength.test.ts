import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { HUMAN, cpuMove as daifugoMove, daifugoRules, setup as daifugoSetup } from './daifugo/logic';
import { cpuMove as sevensMove, placesOf, setup as sevensSetup, sevensRules } from './sevens/logic';
import type { CpuLevel } from './cpuLevel';

/**
 * The strength setting must mean something: seat one player at each level against three Normal
 * CPUs over many deals, and its average finishing place (0 = first) must improve with the level.
 */
const DEALS = 150;

function daifugoPlace(level: CpuLevel): number {
  let total = 0;
  for (let seed = 1; seed <= DEALS; seed++) {
    let s = daifugoSetup(createRng(seed), { rounds: '1' });
    for (let i = 0; i < 3000 && s.phase === 'play'; i++)
      s = daifugoRules.reduce(s, daifugoMove(s, s.turn, s.turn === HUMAN ? level : 'normal'));
    total += s.places![HUMAN]!;
  }
  return total / DEALS;
}

function sevensPlace(level: CpuLevel): number {
  let total = 0;
  for (let seed = 1; seed <= DEALS; seed++) {
    let s = sevensSetup(createRng(seed));
    for (let i = 0; i < 600 && s.finished.length + s.busted.length < 3; i++)
      s = sevensRules.reduce(s, sevensMove(s, s.turn, s.turn === 0 ? level : 'normal'));
    total += placesOf(s)[0]!;
  }
  return total / DEALS;
}

describe('CPU strength', () => {
  it('Daifugo: Hard beats Normal beats Easy', () => {
    const [easy, normal, hard] = (['easy', 'normal', 'hard'] as const).map(daifugoPlace);
    expect(hard).toBeLessThan(normal!);
    expect(normal).toBeLessThan(easy!);
  });

  it('Sevens: Hard beats Normal beats Easy', () => {
    const [easy, normal, hard] = (['easy', 'normal', 'hard'] as const).map(sevensPlace);
    expect(hard).toBeLessThan(normal!);
    expect(normal).toBeLessThan(easy!);
  });
});
