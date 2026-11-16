import { describe, expect, it } from 'vitest';
import { createRng } from '@/core/deck/rng';
import { previewItems } from '@/pages/home/previews';
import { GUIDES } from './guides';
import { CATALOG } from './registry';

/**
 * Every game in the picker must be complete: loadable, with a guide and a table preview.
 * Adding a game without one of these fails here instead of showing an empty panel.
 */
const playable = CATALOG.filter((g) => g.load);

describe('catalog', () => {
  it('lists every game as playable', () => {
    expect(playable.length).toBe(CATALOG.length);
  });

  it.each(playable.map((g) => [g.id, g] as const))('%s loads and deals', async (id, entry) => {
    const def = await entry.load!();
    expect(def.id).toBe(id);
    const state = def.rules.setup(createRng(1), {});
    expect(def.rules.status(state)).toBe('playing');
    for (const spec of def.options ?? []) {
      expect(spec.choices.some((c) => c.value === spec.default)).toBe(true);
    }
  });

  it.each(playable.map((g) => g.id))('%s has a how-to-play guide', (id) => {
    const guide = GUIDES[id];
    expect(guide, `add a guide for "${id}" in src/games/guides.ts`).toBeDefined();
    expect(guide!.steps.length).toBeGreaterThan(0);
    expect(guide!.goal.length).toBeGreaterThan(0);
    for (const k of guide!.keyCards ?? []) for (const c of k.cards) expect(c).toMatch(/^(Joker|(A|[2-9]|10|J|Q|K)[♠♥♦♣])$/);
  });

  it.each(playable.map((g) => g.id))('%s has a table preview', (id) => {
    const items = previewItems(id);
    expect(items.length, `add a layout for "${id}" in src/pages/home/previews.ts`).toBeGreaterThan(0);
    for (const item of items) if (item.kind === 'face') expect(item.label).toMatch(/^(A|[2-9]|10|J|Q|K)[♠♥♦♣]$/);
  });

  it('has no guides for games that do not exist', () => {
    const ids = new Set(CATALOG.map((g) => g.id));
    expect(Object.keys(GUIDES).filter((k) => !ids.has(k))).toEqual([]);
  });
});
