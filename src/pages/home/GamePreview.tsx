import { memo } from 'react';
import type { Rank, StandardCard, Suit, CardId } from '@/core/types/card';
import type { GameMeta } from '@/core/types/game';
import { toneOf } from '@/games/registry';
import { CardBack } from '@/ui/card/CardBack';
import { CardFace } from '@/ui/card/CardFace';
import { PREVIEW_H, PREVIEW_W, previewItems, type PreviewItem } from './previews';

const SUIT_OF: Record<string, Suit> = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
const RANK_OF: Record<string, Rank> = { A: 1, J: 11, Q: 12, K: 13 };

/** Turns a preview label like "10♣" into the same card model the game uses. */
function cardOf(label: string): StandardCard {
  const suit = SUIT_OF[label.slice(-1)] ?? 'spades';
  const r = label.slice(0, -1);
  const rank = (RANK_OF[r] ?? Number(r)) as Rank;
  return { kind: 'standard', id: `preview-${label}` as CardId, suit, rank, faceUp: true };
}

function place(it: PreviewItem): React.CSSProperties {
  return {
    position: 'absolute',
    left: it.x,
    top: it.y,
    width: it.w,
    height: it.h,
    transform: it.lift || it.rotate ? `translateY(${it.lift ?? 0}px) rotate(${it.rotate ?? 0}deg)` : undefined,
  };
}

/** Table furniture that isn't a card: empty slots, bars (paytables, health) and chips. */
function furnitureStyle(it: PreviewItem): React.CSSProperties {
  switch (it.kind) {
    case 'slot':
      return {
        borderRadius: Math.max(2, Math.round(it.w / 8)),
        background: 'rgb(0 0 0 / 0.18)',
        boxShadow: 'inset 0 0 0 1px rgb(201 164 92 / 0.28)',
      };
    case 'bar':
      return { borderRadius: it.h / 2, background: it.fill };
    case 'chip':
      return {
        borderRadius: it.h / 2,
        background: it.fill,
        boxShadow: `inset 0 0 0 2px ${it.fill}, inset 0 0 0 3px rgb(243 236 220 / 0.8)`,
      };
    default:
      return {};
  }
}

/**
 * A tiny rendering of the game's table. Cards are drawn with the very same CardFace and
 * CardBack the game uses, so the picker always matches what you'll play with.
 * `width` scales the 232×150 drawing.
 */
export const GamePreview = memo(function GamePreview({
  game,
  width = PREVIEW_W,
  className = '',
}: {
  game: Pick<GameMeta, 'id' | 'category'>;
  width?: number;
  className?: string;
}) {
  const scale = width / PREVIEW_W;
  const items = previewItems(game.id);
  return (
    <div
      className={`tone-${toneOf(game)} relative overflow-hidden ${className}`}
      style={{ width, height: PREVIEW_H * scale }}
      aria-hidden
    >
      <div
        style={{
          width: PREVIEW_W,
          height: PREVIEW_H,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          position: 'relative',
        }}
      >
        {items.map((it, i) =>
          it.kind === 'face' || it.kind === 'back' ? (
            // `card-preview`, not `card`: previews always show the full design. Only cards in play switch
            // to the large-index face when small, because there they have to be read, not admired.
            <span key={i} className={`card-preview ${it.ring ? 'card-selected' : ''}`} style={place(it)}>
              {it.kind === 'face' ? <CardFace card={cardOf(it.label ?? 'A♠')} /> : <CardBack />}
            </span>
          ) : (
            <span key={i} style={{ ...place(it), ...furnitureStyle(it) }} />
          ),
        )}
      </div>
    </div>
  );
});
