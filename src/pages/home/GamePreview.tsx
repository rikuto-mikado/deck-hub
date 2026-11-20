import { memo } from 'react';
import type { GameMeta } from '@/core/types/game';
import { toneOf } from '@/games/registry';
import { PREVIEW_H, PREVIEW_W, previewItems, type PreviewItem } from './previews';

const RED = 'var(--color-card-red)';
const BLACK = 'var(--color-card-black)';
const GILT = 'var(--color-card-gilt)';

/** Where an item sits: its corner, nudged by `lift` and turned about its centre by `rotate`. */
function placement(it: PreviewItem): string {
  const move = `translate(${it.x} ${it.y + (it.lift ?? 0)})`;
  return it.rotate ? `${move} rotate(${it.rotate} ${it.w / 2} ${it.h / 2})` : move;
}

/** A miniature face: ivory paper, the rank in the corner and one suit pip in the middle. */
function Face({ it }: { it: PreviewItem }) {
  const label = it.label ?? 'A♠';
  const suit = label.slice(-1);
  const rank = label.slice(0, -1);
  const ink = it.red ? RED : BLACK;
  const r = it.w * 0.1;
  return (
    <g transform={placement(it)}>
      <rect y={0.8} width={it.w} height={it.h} rx={r} fill="rgb(0 0 0 / 0.35)" />
      <rect
        width={it.w}
        height={it.h}
        rx={r}
        fill="var(--color-card-face)"
        stroke={it.ring ? 'var(--color-gold-bright)' : 'var(--color-card-edge)'}
        strokeWidth={it.ring ? 1.4 : 0.4}
      />
      <text
        x={it.w * 0.1}
        y={it.w * 0.36}
        fontSize={it.w * (rank.length > 1 ? 0.3 : 0.36)}
        fontWeight={700}
        fontFamily="var(--font-card)"
        fill={ink}
      >
        {rank}
      </text>
      <text x={it.w / 2} y={it.h * 0.66} fontSize={it.w * 0.5} textAnchor="middle" fill={ink}>
        {suit}
      </text>
    </g>
  );
}

/** A miniature back: navy with a gilt inner border and a small diamond. */
function Back({ it }: { it: PreviewItem }) {
  const inset = Math.max(1, it.w * 0.12);
  const cx = it.w / 2;
  const cy = it.h / 2;
  const d = it.w * 0.18;
  return (
    <g transform={placement(it)}>
      <rect y={0.8} width={it.w} height={it.h} rx={it.w * 0.1} fill="rgb(0 0 0 / 0.35)" />
      <rect width={it.w} height={it.h} rx={it.w * 0.1} fill="var(--color-card-back)" />
      <rect
        x={inset}
        y={inset}
        width={it.w - inset * 2}
        height={it.h - inset * 2}
        rx={it.w * 0.05}
        fill="none"
        stroke={GILT}
        strokeOpacity={0.55}
        strokeWidth={0.5}
      />
      <path
        d={`M${cx} ${cy - d}L${cx + d * 0.75} ${cy}L${cx} ${cy + d}L${cx - d * 0.75} ${cy}Z`}
        fill={GILT}
        fillOpacity={0.85}
      />
    </g>
  );
}

/** Table furniture that isn't a card: empty slots, bars (paytables, health) and chips. */
function Furniture({ it }: { it: PreviewItem }) {
  switch (it.kind) {
    case 'slot':
      return (
        <rect
          x={it.x}
          y={it.y}
          width={it.w}
          height={it.h}
          rx={Math.max(2, it.w / 8)}
          fill="rgb(0 0 0 / 0.18)"
          stroke="rgb(201 164 92 / 0.28)"
          strokeWidth={0.6}
        />
      );
    case 'bar':
      return <rect x={it.x} y={it.y} width={it.w} height={it.h} rx={it.h / 2} fill={it.fill} />;
    case 'chip': {
      const r = it.w / 2;
      return (
        <g>
          <circle cx={it.x + r} cy={it.y + r} r={r} fill={it.fill} />
          <circle cx={it.x + r} cy={it.y + r} r={r - 2.5} fill="none" stroke="rgb(243 236 220 / 0.8)" strokeWidth={1} />
        </g>
      );
    }
    default:
      return null;
  }
}

/**
 * A tiny rendering of the game's table as one flat SVG: simple faces, backs and furniture
 * instead of the full card artwork, so a gallery of 54 stays light. It fills its container's
 * width at the 232×150 aspect ratio.
 */
export const GamePreview = memo(function GamePreview({
  game,
  className = '',
}: {
  game: Pick<GameMeta, 'id' | 'category'>;
  className?: string;
}) {
  return (
    <div className={`tone-${toneOf(game)} aspect-[232/150] w-full overflow-hidden ${className}`} aria-hidden>
      <svg viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`} className="block h-auto w-full">
        {previewItems(game.id).map((it, i) =>
          it.kind === 'face' ? (
            <Face key={i} it={it} />
          ) : it.kind === 'back' ? (
            <Back key={i} it={it} />
          ) : (
            <Furniture key={i} it={it} />
          ),
        )}
      </svg>
    </div>
  );
});
