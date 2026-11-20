import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { href } from '@/app/router';
import type { GameMeta } from '@/core/types/game';
import { CATALOG, CATEGORY_LABEL, type CatalogEntry } from '@/games/registry';
import { ThemeToggle } from '@/ui/common/ThemeToggle';
import { IconBook, IconPlay } from '@/ui/common/icons';
import { GamePreview } from './home/GamePreview';
import { GuideDialog } from './home/GuideDialog';

type Filter = 'all' | GameMeta['category'];
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'solitaire', label: CATEGORY_LABEL.solitaire },
  { id: 'special', label: CATEGORY_LABEL.special },
  { id: 'casino', label: CATEGORY_LABEL.casino },
  { id: 'trick-taking', label: CATEGORY_LABEL['trick-taking'] },
  { id: 'cpu', label: CATEGORY_LABEL.cpu },
];
const DIFFICULTY = ['', 'Easy to learn', 'Takes some thought', 'Deep'] as const;

const players = (g: GameMeta) => (g.players === 1 ? '1 player' : `${g.players} players`);
const playable = CATALOG.filter((g) => g.load);

/** Inner padding of a gallery card; the miniature table fills the rest of its width. */
const CARD_PAD = 10;

/**
 * One exhibition plate: everything about a game in one place, with Play to deal it and Rules
 * to read the guide right here. Memoised so opening a guide or filtering never redraws the
 * other plates' miniature tables.
 */
const GameCard = memo(function GameCard({
  game,
  previewWidth,
  onRules,
}: {
  game: CatalogEntry;
  previewWidth: number;
  onRules: (id: string) => void;
}) {
  return (
    <li className="collection-tile">
      <article
        aria-labelledby={`game-${game.id}`}
        className="keep-dark @container flex h-full flex-col gap-2 rounded-xl shadow-[inset_0_0_0_1px_rgb(201_164_92/0.32),0_12px_28px_rgb(0_0_0/0.35)] transition-[box-shadow] duration-300 hover:shadow-[inset_0_0_0_1px_rgb(201_164_92/0.7),0_18px_40px_rgb(0_0_0/0.45)]"
        style={{ padding: CARD_PAD, background: 'linear-gradient(160deg, #1a1b21 0%, #111216 100%)' }}
      >
        <div className="truncate text-[10px] font-medium tracking-[0.24em] whitespace-nowrap text-gold uppercase">
          {CATEGORY_LABEL[game.category]}
        </div>
        {previewWidth > 0 && (
          <GamePreview game={game} width={previewWidth} className="rounded-md shadow-[inset_0_0_0_1px_rgb(201_164_92/0.35)]" />
        )}
        <div className="flex flex-col gap-1">
          <h3
            id={`game-${game.id}`}
            className="m-0 truncate font-display text-lg leading-tight font-semibold text-heading @min-[200px]:text-xl @min-[260px]:text-2xl"
          >
            {game.name}
          </h3>
          <p className="m-0 line-clamp-2 min-h-[2lh] text-xs leading-4 text-body @min-[220px]:text-sm @min-[220px]:leading-5">
            {game.description}
          </p>
          <p className="m-0 truncate text-[10px] tracking-wide text-muted @min-[220px]:text-[11px]">
            {players(game)} · {DIFFICULTY[game.difficulty]}
          </p>
        </div>
        <div className="mt-auto flex gap-1.5 pt-1">
          <a
            href={href(`play/${game.id}`)}
            aria-label={`Play ${game.name}`}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-gold px-3 text-xs font-semibold text-ink no-underline transition hover:bg-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright @min-[220px]:min-h-10 @min-[220px]:text-sm"
          >
            Play <IconPlay />
          </a>
          <button
            type="button"
            onClick={() => onRules(game.id)}
            aria-haspopup="dialog"
            aria-label={`Rules for ${game.name}`}
            className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border-0 bg-transparent px-2.5 text-xs font-medium text-gold-bright ring-1 ring-gold/45 transition ring-inset hover:bg-gold/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright @min-[220px]:min-h-10 @min-[220px]:px-4 @min-[220px]:text-sm"
          >
            <IconBook /> <span className="hidden @min-[180px]:inline">Rules</span>
          </button>
        </div>
      </article>
    </li>
  );
});

/** Width of one gallery column, so every miniature table scales to fill its card exactly. */
function useColumnWidth() {
  const ref = useRef<HTMLUListElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const first = Number.parseFloat(getComputedStyle(el).gridTemplateColumns);
      if (Number.isFinite(first)) setWidth(Math.floor(first));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function HomePage() {
  const [filter, setFilter] = useState<Filter>('all');
  // The guide keeps its last game while it animates closed.
  const [guideGame, setGuideGame] = useState<CatalogEntry>(playable[0]!);
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const openGuide = useCallback((id: string) => {
    const g = playable.find((x) => x.id === id);
    if (!g) return;
    setGuideGame(g);
    setGuideOpen(true);
  }, []);
  const [grid, columnWidth] = useColumnWidth();
  const previewWidth = Math.max(0, columnWidth - CARD_PAD * 2);
  const games = useMemo(() => playable.filter((g) => filter === 'all' || g.category === filter), [filter]);

  return (
    <div className="-mx-4 flex flex-col gap-6 px-[var(--page-x)] pt-1 pb-10 [--page-x:16px] sm:-mx-6 sm:[--page-x:40px] lg:[--page-x:64px] short:gap-2">
      <header className="flex items-center justify-between pt-4 short:pt-2">
        <div className="flex items-center gap-3">
          <span className="block size-2.5 rotate-45 bg-gold" aria-hidden />
          <h1 className="m-0 text-[13px] font-semibold tracking-[0.34em] text-gold-bright">TALONBOX</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-[0.2em] text-muted">{playable.length} GAMES</span>
          <ThemeToggle className="ring-1 ring-cream/15 ring-inset" />
        </div>
      </header>

      <section className="flex flex-col gap-5 short:gap-2" aria-labelledby="collection-title">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-1">
          <div className="flex items-baseline gap-3.5">
            <h2 id="collection-title" className="m-0 font-display text-3xl font-semibold text-heading">
              The collection
            </h2>
            <span className="text-[11px] tracking-[0.24em] text-muted">{games.length} GAMES</span>
          </div>
          <div className="flex flex-wrap gap-x-6" role="group" aria-label="Filter by kind">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`h-11 border-0 bg-transparent px-0.5 text-[13px] font-medium tracking-wide whitespace-nowrap transition ${
                  filter === f.id ? 'text-heading shadow-[inset_0_-1px_0_var(--color-gold)]' : 'text-muted hover:text-cream'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <ul
          ref={grid}
          className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4 2xl:grid-cols-6 short:grid-cols-5 short:gap-2.5"
        >
          {games.map((g) => (
            <GameCard key={g.id} game={g} previewWidth={previewWidth} onRules={openGuide} />
          ))}
        </ul>
      </section>
      <GuideDialog game={guideGame} open={guideOpen} onClose={closeGuide} />
    </div>
  );
}
