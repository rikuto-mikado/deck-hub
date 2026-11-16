import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { href } from '@/app/router';
import type { GameMeta } from '@/core/types/game';
import { GUIDES, type KeyCard } from '@/games/guides';
import { CATEGORY_LABEL, numeralOf } from '@/games/registry';
import { IconButton } from '@/ui/common/Button';
import { IconPlay } from '@/ui/common/icons';
import type { Card, CardId, Rank, Suit } from '@/core/types/card';
import { CardFace } from '@/ui/card/CardFace';
import { GamePreview } from './GamePreview';

const DIFFICULTY = ['', 'Easy to learn', 'Takes some thought', 'Deep'] as const;

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="m-0 mb-3 text-[11px] font-semibold tracking-[0.26em] text-gold uppercase">{children}</h3>;
}

const SUIT_OF: Record<string, Suit> = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
const RANK_OF: Record<string, Rank> = { A: 1, J: 11, Q: 12, K: 13 };

/** "Q♥" or "Joker" → the same card model the game draws. */
function cardOf(spec: string): Card {
  if (spec === 'Joker') return { kind: 'joker', id: 'guide-joker' as CardId, faceUp: true };
  const suit = SUIT_OF[spec.slice(-1)] ?? 'spades';
  const r = spec.slice(0, -1);
  return { kind: 'standard', id: `guide-${spec}` as CardId, suit, rank: (RANK_OF[r] ?? Number(r)) as Rank, faceUp: true };
}

/** Key cards drawn with the real card faces, slightly fanned when there are several. */
function Chips({ cards }: { cards: string[] }) {
  return (
    <span className="flex shrink-0">
      {cards.map((c, i) => (
        <span key={i} className="card-preview block h-[45px] w-[32px]" style={{ marginLeft: i ? -14 : 0 }}>
          <CardFace card={cardOf(c)} />
        </span>
      ))}
    </span>
  );
}

function KeyCards({ items }: { items: KeyCard[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((k, i) => (
        <li key={i} className="flex items-center gap-3 text-sm leading-snug text-body">
          <Chips cards={k.cards} />
          <span>{k.text}</span>
        </li>
      ))}
    </ul>
  );
}

const Diamond = () => <span className="mt-[0.55em] block size-1.5 shrink-0 rotate-45 bg-gold" aria-hidden />;

/** The full how-to-play sheet for one game: a bottom sheet on phones, a centred card on larger screens. */
export function GuideDialog({ game, open, onClose }: { game: GameMeta; open: boolean; onClose: () => void }) {
  const guide = GUIDES[game.id];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && guide && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-[3px] sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-[820px] flex-col overflow-hidden rounded-t-[28px] bg-panel shadow-[inset_0_0_0_1px_rgb(201_164_92/0.28),0_40px_90px_rgb(0_0_0/0.55)] sm:max-h-[88dvh] sm:rounded-[28px]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            {/* Header */}
            <div className="relative flex items-start gap-6 border-b border-gold/20 px-6 pt-7 pb-6 sm:px-9 sm:pt-9">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.28em] text-gold uppercase">
                  <span>No. {numeralOf(game.id)}</span>
                  <span className="size-1 rotate-45 bg-gold/60" aria-hidden />
                  <span>{CATEGORY_LABEL[game.category]}</span>
                </div>
                <h2
                  id="guide-title"
                  className="m-0 mt-3 font-display text-5xl leading-[0.92] font-semibold text-heading sm:text-6xl"
                >
                  {game.name}
                </h2>
                <p className="m-0 mt-3 font-display text-xl text-body italic">{guide.tagline}</p>
              </div>
              <GamePreview
                game={game}
                width={232}
                className="hidden shrink-0 rounded-xl shadow-[0_0_0_1px_rgb(201_164_92/0.4),0_16px_32px_rgb(0_0_0/0.4)] sm:block"
              />
              <IconButton ref={closeRef} label="Close" onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </IconButton>
            </div>

            {/* Body */}
            <div className="grid min-h-0 flex-1 gap-x-10 gap-y-8 overflow-y-auto px-6 py-7 sm:grid-cols-[minmax(0,1fr)_250px] sm:px-9 sm:py-8">
              <div className="flex flex-col gap-8">
                <section>
                  <Label>The goal</Label>
                  <p className="m-0 font-display text-2xl leading-snug text-heading">{guide.goal}</p>
                </section>

                <section>
                  <Label>Setting up</Label>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {guide.setup.map((s, i) => (
                      <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-body">
                        <Diamond />
                        {s}
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <Label>How to play</Label>
                  <ol className="m-0 flex list-none flex-col gap-4 p-0">
                    {guide.steps.map((s, i) => (
                      <li key={i} className="flex gap-4 text-[15px] leading-relaxed text-cream">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold text-gold shadow-[inset_0_0_0_1px_rgb(201_164_92/0.5)]"
                          style={{ fontVariantNumeric: 'lining-nums' }}
                          aria-hidden
                        >
                          {i + 1}
                        </span>
                        <span className="pt-1">{s}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section>
                  <Label>Winning &amp; scoring</Label>
                  <p className="m-0 text-[15px] leading-relaxed text-body">{guide.winning}</p>
                </section>
              </div>

              <aside className="flex flex-col gap-7 sm:border-l sm:border-gold/15 sm:pl-8">
                <section>
                  <Label>At a glance</Label>
                  <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted">Players</dt>
                    <dd className="m-0 text-cream">{game.players === 1 ? 'Solo' : `${game.players}`}</dd>
                    <dt className="text-muted">Cards</dt>
                    <dd className="m-0 text-cream">{guide.glance.deck}</dd>
                    <dt className="text-muted">Length</dt>
                    <dd className="m-0 text-cream">{guide.glance.time}</dd>
                    <dt className="text-muted">Feel</dt>
                    <dd className="m-0 text-cream">{DIFFICULTY[game.difficulty]}</dd>
                  </dl>
                </section>

                {guide.keyCards && (
                  <section>
                    <Label>Key cards</Label>
                    <KeyCards items={guide.keyCards} />
                  </section>
                )}

                {guide.options && (
                  <section>
                    <Label>House rules</Label>
                    <p className="m-0 mb-2 text-xs text-muted">Change these from Rules while playing.</p>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {guide.options.map((o, i) => (
                        <li key={i} className="flex gap-2.5 text-sm leading-snug text-body">
                          <Diamond />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section>
                  <Label>Tips</Label>
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                    {guide.tips.map((t, i) => (
                      <li key={i} className="font-display text-[17px] leading-snug text-heading italic">
                        “{t}”
                      </li>
                    ))}
                  </ul>
                </section>

                {guide.credit && <p className="m-0 text-xs leading-relaxed text-muted">{guide.credit}</p>}
              </aside>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gold/20 px-6 py-4 sm:px-9">
              <a
                href={href(`play/${game.id}`)}
                className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-accent px-7 text-[15px] font-semibold text-on-accent no-underline shadow-[0_10px_30px_rgb(201_164_92/0.25)] transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
              >
                Deal the cards <IconPlay />
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
