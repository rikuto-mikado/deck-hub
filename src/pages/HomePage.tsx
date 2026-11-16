import { motion } from 'motion/react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { href } from '@/app/router';
import type { GameMeta } from '@/core/types/game';
import { CATALOG, CATEGORY_LABEL, numeralOf, type CatalogEntry } from '@/games/registry';
import { Button } from '@/ui/common/Button';
import { ThemeToggle } from '@/ui/common/ThemeToggle';
import { IconArrow, IconBook, IconPlay } from '@/ui/common/icons';
import { GamePreview } from './home/GamePreview';
import { GuideDialog } from './home/GuideDialog';

type Filter = 'all' | GameMeta['category'];
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'solitaire', label: CATEGORY_LABEL.solitaire },
  { id: 'special', label: CATEGORY_LABEL.special },
  { id: 'cpu', label: CATEGORY_LABEL.cpu },
];
const DIFFICULTY = ['', 'Easy to learn', 'Takes some thought', 'Deep'] as const;

const players = (g: GameMeta) => (g.players === 1 ? '1 player' : `${g.players} players`);
const playable = CATALOG.filter((g) => g.load);

const FAN_W = 620;
const FAN_H = 440;

/**
 * Five plates fanned out with the featured game in front. The fan is drawn at a fixed size
 * and scaled to whatever width its column has, so it never overlaps the text beside it.
 */
function Fan({ featured, onPick }: { featured: number; onPick: (i: number) => void }) {
  const n = playable.length;
  const slots = [-2, -1, 0, 1, 2].map((offset) => ({ offset, game: playable[(featured + offset + n) % n]! }));
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    // The outer plates lean out past the 620px box, so leave room for them.
    const fit = () => setScale(Math.min(1, el.clientWidth / (FAN_W + 90)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="w-full" style={{ height: FAN_H * scale }}>
      <div
        className="relative"
        style={{
          width: FAN_W,
          height: FAN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginLeft: `calc((100% - ${FAN_W * scale}px) / 2)`,
        }}
        aria-label="Featured games"
      >
        {slots.map(({ offset, game }) => {
          const front = offset === 0;
          return (
            <motion.button
              key={game.id}
              type="button"
              layout
              onClick={() => onPick((featured + offset + n) % n)}
              aria-label={front ? `${game.name}, featured` : `Feature ${game.name}`}
              aria-current={front || undefined}
              className="keep-dark absolute flex h-[296px] w-[200px] flex-col items-center rounded-[14px] px-[18px] pt-6 pb-5 text-left focus-visible:outline-2 focus-visible:outline-gold-bright"
              style={{
                left: 210 + offset * 102,
                top: 40 + Math.abs(offset) * 32 + (Math.abs(offset) === 2 ? 26 : 0),
                zIndex: 10 - Math.abs(offset),
                transformOrigin: '50% 120%',
                background: 'linear-gradient(160deg, #1a1b21 0%, #111216 100%)',
                boxShadow:
                  'inset 0 0 0 1px rgb(201 164 92 / 0.55), inset 0 0 0 9px #14151a, inset 0 0 0 10px rgb(201 164 92 / 0.28), 0 30px 60px rgb(0 0 0 / 0.55), 0 6px 14px rgb(0 0 0 / 0.4)',
              }}
              initial={false}
              // Dim the plates behind with brightness, not opacity, so they stay solid on a light page.
              animate={{ rotate: offset * 8.5, filter: `brightness(${front ? 1 : Math.abs(offset) === 1 ? 0.78 : 0.6})` }}
              whileHover={front ? { y: -4 } : { y: -10, filter: 'brightness(1)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            >
              <span className="font-display text-[15px] tracking-[0.3em] text-gold">{numeralOf(game.id)}</span>
              <GamePreview game={game} width={164} className="mt-4 rounded-md shadow-[inset_0_0_0_1px_rgb(201_164_92/0.35)]" />
              <span className="mt-auto w-full text-center font-display text-[27px] leading-none font-semibold text-[#f2ebdb]">
                {game.name}
              </span>
              <span className="mt-2 w-full text-center text-[10px] tracking-[0.24em] text-muted uppercase">
                {CATEGORY_LABEL[game.category]}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/** Picking a tile puts that game on the table above; "Deal the cards" starts it. */
function Tile({ game, selected, onSelect }: { game: CatalogEntry; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Show ${game.name}`}
      className="group flex w-[232px] flex-none snap-start flex-col gap-3.5 border-0 bg-transparent p-0 text-left focus-visible:outline-none"
    >
      <div
        className={`overflow-hidden rounded-xl transition duration-400 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:-translate-y-1.5 group-focus-visible:shadow-[0_0_0_2px_var(--color-gold-bright)] ${
          selected
            ? '-translate-y-1.5 shadow-[0_0_0_1.5px_var(--color-gold),0_26px_46px_rgb(0_0_0/0.55)]'
            : 'shadow-[inset_0_0_0_1px_rgb(237_230_214/0.08),0_18px_36px_rgb(0_0_0/0.45)] group-hover:shadow-[0_0_0_1px_rgb(201_164_92/0.55),0_26px_46px_rgb(0_0_0/0.55)]'
        }`}
      >
        <GamePreview game={game} />
      </div>
      <div>
        <div className={`font-display text-2xl leading-none font-semibold ${selected ? 'text-gold-bright' : 'text-heading'}`}>
          {game.name}
        </div>
        <div className="mt-1.5 text-xs tracking-wide text-muted">
          {CATEGORY_LABEL[game.category]} · {players(game)}
        </div>
      </div>
    </button>
  );
}

export function HomePage() {
  // Start on the first game in the collection (No. I).
  const [featured, setFeatured] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const track = useRef<HTMLDivElement>(null);
  const game = playable[featured]!;
  const games = useMemo(() => playable.filter((g) => filter === 'all' || g.category === filter), [filter]);
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * 504, behavior: 'smooth' });
  const select = (id: string) => {
    setFeatured(playable.findIndex((g) => g.id === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="-mx-4 flex flex-col pb-10 [--page-x:16px] sm:-mx-6 sm:[--page-x:40px] lg:[--page-x:64px]"
      style={{ paddingTop: 4 }}
    >
      <header className="flex items-center justify-between px-[var(--page-x)] pt-4">
        <div className="flex items-center gap-3">
          <span className="block size-2.5 rotate-45 bg-gold" aria-hidden />
          <span className="text-[13px] font-semibold tracking-[0.34em] text-gold-bright">TALONBOX</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-[0.2em] text-muted">{playable.length} GAMES</span>
          <ThemeToggle className="ring-1 ring-cream/15 ring-inset" />
        </div>
      </header>

      <section
        className="hero grid items-center gap-8 px-[var(--page-x)] pt-8 sm:pt-12 short:pt-4"
        aria-labelledby="featured-title"
      >
        {/*
          Every row here has a fixed height so switching games never moves the buttons:
          the title shrinks to stay on one line, the description always takes two lines.
        */}
        <div
          className="flex w-full max-w-[480px] flex-col gap-5 [--title-max:60px] sm:[--title-max:96px] lg:[--title-max:112px] short:gap-3 short:[--title-max:56px]"
          style={{ containerType: 'inline-size' }}
        >
          <span className="text-xs font-medium tracking-[0.3em] text-gold uppercase">No. {numeralOf(game.id)}</span>
          <div className="flex h-[calc(var(--title-max)*0.96)] items-end">
            <motion.h1
              key={game.id}
              id="featured-title"
              initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="m-0 font-display leading-[0.88] font-semibold tracking-[-0.01em] whitespace-nowrap text-heading"
              // Fit the name on one line: about 0.5em per character, capped at the design size.
              style={{ fontSize: `min(var(--title-max), calc(100cqw / ${(game.name.length * 0.5).toFixed(2)}))` }}
            >
              {game.name}
            </motion.h1>
          </div>
          <motion.p
            key={`${game.id}-desc`}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="m-0 line-clamp-2 h-[3.25rem] max-w-[400px] text-base leading-[1.625rem] text-body"
          >
            {game.description}
          </motion.p>
          {/* Phones have no fan, so show the picked game's table here. */}
          <GamePreview
            key={`${game.id}-preview`}
            game={game}
            width={320}
            className="rounded-xl shadow-[0_0_0_1px_rgb(201_164_92/0.4),0_18px_36px_rgb(0_0_0/0.45)] min-[600px]:hidden"
          />
          <motion.div
            key={`${game.id}-meta`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="flex h-4 items-center gap-x-3 overflow-hidden text-xs tracking-[0.08em] whitespace-nowrap text-muted"
          >
            <span>{CATEGORY_LABEL[game.category]}</span>
            <span className="size-1 rotate-45 bg-gold/60" aria-hidden />
            <span>{players(game)}</span>
            <span className="size-1 rotate-45 bg-gold/60" aria-hidden />
            <span>{DIFFICULTY[game.difficulty]}</span>
          </motion.div>
          <div className="mt-2 flex gap-3">
            <a
              href={href(`play/${game.id}`)}
              className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-accent px-6 text-[15px] font-semibold whitespace-nowrap text-on-accent no-underline shadow-[0_10px_30px_rgb(201_164_92/0.25)] transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright sm:px-7"
            >
              Deal the cards <IconPlay />
            </a>
            <Button
              className="min-h-[52px] px-5 text-[15px] whitespace-nowrap sm:px-6"
              onClick={() => setGuideOpen(true)}
              aria-haspopup="dialog"
            >
              <IconBook /> How to play
            </Button>
          </div>
        </div>
        <div className="hidden min-[600px]:block">
          <Fan featured={featured} onPick={setFeatured} />
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-1 md:mt-4" aria-labelledby="collection-title">
        <div className="flex flex-wrap items-center justify-between gap-3 px-[var(--page-x)]">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-1">
            <div className="flex items-baseline gap-3.5">
              <h2 id="collection-title" className="m-0 font-display text-3xl font-semibold text-heading">
                The collection
              </h2>
              <span className="text-[11px] tracking-[0.24em] text-muted">{games.length} GAMES</span>
            </div>
            <div className="flex gap-6" role="group" aria-label="Filter by kind">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`h-11 border-0 bg-transparent px-0.5 text-[13px] font-medium tracking-wide transition ${
                    filter === f.id ? 'text-heading shadow-[inset_0_-1px_0_var(--color-gold)]' : 'text-muted hover:text-cream'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden gap-2.5 sm:flex pointer-coarse:hidden">
            {([-1, 1] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-label={d < 0 ? 'Scroll left' : 'Scroll right'}
                onClick={() => scroll(d)}
                className="inline-flex size-11 items-center justify-center rounded-full bg-panel/60 text-gold-bright ring-1 ring-gold/35 transition ring-inset hover:bg-gold/12"
              >
                <IconArrow dir={d < 0 ? 'left' : 'right'} />
              </button>
            ))}
          </div>
        </div>
        <div ref={track} className="collection-track">
          {games.map((g) => (
            <Tile key={g.id} game={g} selected={g.id === game.id} onSelect={() => select(g.id)} />
          ))}
        </div>
      </section>
      <GuideDialog game={game} open={guideOpen} onClose={closeGuide} />
    </div>
  );
}
