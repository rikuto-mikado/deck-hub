import { memo, useId } from 'react';
import { rankLabel, suitColor, type Card, type Rank, type StandardCard } from '@/core/types/card';
import { PIP_LAYOUT } from './pips';
import { SuitMark } from './suits';

const W = 250;
const H = 350;
const RED = 'var(--color-card-red)';
const BLACK = 'var(--color-card-black)';
const GILT = 'var(--color-card-gilt)';

/** Rank and suit in the top-left corner (drawn again, rotated, bottom-right). */
function Corner({ card, fill }: { card: StandardCard; fill: string }) {
  const ten = card.rank === 10;
  return (
    <g>
      <text
        x={32}
        y={60}
        fill={fill}
        textAnchor="middle"
        fontFamily="var(--font-card)"
        fontSize={ten ? 44 : 52}
        fontWeight={700}
        letterSpacing={ten ? -4 : 0}
      >
        {rankLabel(card.rank)}
      </text>
      <SuitMark suit={card.suit} cx={32} cy={84} size={24} fill={fill} />
    </g>
  );
}

// ── Court ornaments, drawn around (0, 0) roughly 60 wide ─────────────────────────────

function Crown() {
  return (
    <g fill={GILT}>
      <path d="M-27 10L-27-5L-13 4L0-15L13 4L27-5L27 10Z" />
      <rect x={-29} y={11} width={58} height={5} rx={1.5} />
      <circle cx={-27} cy={-8} r={3.6} />
      <circle cx={0} cy={-18.5} r={4} />
      <circle cx={27} cy={-8} r={3.6} />
    </g>
  );
}

function Coronet() {
  return (
    <g fill={GILT}>
      <path d="M-25 10Q-27-6-12 2Q0-20 12 2Q27-6 25 10Z" />
      <rect x={-27} y={11} width={54} height={5} rx={1.5} />
      <circle cx={0} cy={-15} r={3.6} />
      <circle cx={-14} cy={-1} r={2.4} />
      <circle cx={14} cy={-1} r={2.4} />
    </g>
  );
}

function Fleur() {
  return (
    <g fill={GILT}>
      <path d="M0-20C8-8 7 3 0 11C-7 3-8-8 0-20Z" />
      <path d="M-4 7C-12-6-26-2-21 9C-17 3-11 5-5 10Z" />
      <path d="M4 7C12-6 26-2 21 9C17 3 11 5 5 10Z" />
      <rect x={-17} y={11} width={34} height={4.5} rx={1.5} />
    </g>
  );
}

const ORNAMENT: Partial<Record<Rank, () => React.JSX.Element>> = { 11: Fleur, 12: Coronet, 13: Crown };

/** One half of a double-ended court card: ornament above an italic letter. */
function CourtHalf({ card, fill }: { card: StandardCard; fill: string }) {
  const Ornament = ORNAMENT[card.rank]!;
  return (
    <g>
      <g transform="translate(125 92)">
        <Ornament />
      </g>
      <text
        x={W / 2}
        y={152}
        fill={fill}
        textAnchor="middle"
        fontFamily="var(--font-card)"
        fontStyle="italic"
        fontWeight={600}
        fontSize={52}
      >
        {rankLabel(card.rank)}
      </text>
    </g>
  );
}

/** Court cards are double-ended, like a real deck: the top half mirrored below a gilt rule. */
function Court({ card, fill }: { card: StandardCard; fill: string }) {
  return (
    <g>
      <rect
        x={54}
        y={60}
        width={142}
        height={230}
        rx={8}
        fill={GILT}
        fillOpacity={0.07}
        stroke={GILT}
        strokeOpacity={0.85}
        strokeWidth={2.2}
      />
      <rect x={61} y={67} width={128} height={216} rx={5} fill="none" stroke={GILT} strokeOpacity={0.4} strokeWidth={1.2} />
      <CourtHalf card={card} fill={fill} />
      <g transform={`rotate(180 ${W / 2} ${H / 2})`}>
        <CourtHalf card={card} fill={fill} />
      </g>
      <path d={`M66 ${H / 2}H108M142 ${H / 2}H184`} stroke={GILT} strokeOpacity={0.7} strokeWidth={1.2} />
      <SuitMark suit={card.suit} cx={W / 2} cy={H / 2} size={22} fill={fill} />
    </g>
  );
}

/** Aces: one large mark inside a double gilt ring. The Ace of Spades carries the maker's mark. */
function Ace({ card, fill }: { card: StandardCard; fill: string }) {
  const spade = card.suit === 'spades';
  return (
    <g>
      <circle cx={W / 2} cy={H / 2} r={84} fill="none" stroke={GILT} strokeOpacity={0.7} strokeWidth={2} />
      <circle cx={W / 2} cy={H / 2} r={77} fill="none" stroke={GILT} strokeOpacity={0.35} strokeWidth={1.2} />
      {spade &&
        Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const x = W / 2 + Math.cos(a) * 92,
            y = H / 2 + Math.sin(a) * 92;
          return (
            <rect
              key={i}
              x={x - 2.6}
              y={y - 2.6}
              width={5.2}
              height={5.2}
              fill={GILT}
              fillOpacity={0.75}
              transform={`rotate(45 ${x} ${y})`}
            />
          );
        })}
      <SuitMark suit={card.suit} cx={W / 2} cy={H / 2} size={spade ? 104 : 96} fill={fill} />
      {spade && (
        <text
          x={W / 2}
          y={H / 2 + 120}
          textAnchor="middle"
          fontFamily="var(--font-card)"
          fontSize={13}
          fontWeight={600}
          letterSpacing={4}
          fill={GILT}
        >
          TALONBOX
        </text>
      )}
    </g>
  );
}

function Pips({ card, fill }: { card: StandardCard; fill: string }) {
  const layout = PIP_LAYOUT[card.rank as keyof typeof PIP_LAYOUT];
  // Pip area inside the corner indices.
  const x0 = 82,
    x1 = 168,
    y0 = 80,
    y1 = 270;
  const size = card.rank >= 9 ? 40 : 44;
  return (
    <g>
      {layout.map(([px, py], i) => (
        <SuitMark
          key={i}
          suit={card.suit}
          cx={x0 + ((x1 - x0) * px) / 100}
          cy={y0 + ((y1 - y0) * py) / 100}
          size={size}
          fill={fill}
          flip={py > 50}
        />
      ))}
    </g>
  );
}

function JokerFace() {
  return (
    <g textAnchor="middle" fontFamily="var(--font-card)">
      <rect
        x={40}
        y={52}
        width={170}
        height={246}
        rx={8}
        fill={GILT}
        fillOpacity={0.07}
        stroke={GILT}
        strokeOpacity={0.85}
        strokeWidth={2.2}
      />
      <rect x={47} y={59} width={156} height={232} rx={5} fill="none" stroke={GILT} strokeOpacity={0.4} strokeWidth={1.2} />
      <path d="M125 112l11 23 25 3-18 17 5 25-23-12-23 12 5-25-18-17 25-3z" fill={GILT} />
      <text x={W / 2} y={232} fontSize={54} fontStyle="italic" fontWeight={600} fill={BLACK}>
        Joker
      </text>
      <text x={W / 2} y={262} fontSize={12} fontWeight={600} letterSpacing={4} fill={GILT}>
        TALONBOX
      </text>
    </g>
  );
}

/**
 * Small-card face: a large rank and suit that stay readable at 25–50px wide, the way
 * mobile solitaire apps draw them. CSS swaps it in via a container query on `.card`.
 */
function Compact({ card, fill }: { card: Card; fill: string }) {
  if (card.kind === 'joker') {
    return (
      <g>
        <path d="M125 70l22 46 50 6-36 34 10 50-46-24-46 24 10-50-36-34 50-6z" fill={GILT} />
        <text
          x={W / 2}
          y={300}
          textAnchor="middle"
          fontFamily="var(--font-card)"
          fontSize={64}
          fontStyle="italic"
          fontWeight={700}
          fill={BLACK}
        >
          Joker
        </text>
      </g>
    );
  }
  const ten = card.rank === 10;
  return (
    <g>
      <text
        x={22}
        y={124}
        fill={fill}
        fontFamily="var(--font-card)"
        fontWeight={700}
        fontSize={ten ? 108 : 128}
        letterSpacing={ten ? -10 : 0}
      >
        {rankLabel(card.rank)}
      </text>
      <SuitMark suit={card.suit} cx={192} cy={74} size={78} fill={fill} />
      <SuitMark suit={card.suit} cx={W / 2} cy={250} size={140} fill={fill} />
    </g>
  );
}

export const CardFace = memo(function CardFace({ card }: { card: Card }) {
  const fill = card.kind === 'joker' ? BLACK : suitColor(card.suit) === 'red' ? RED : BLACK;
  // Gradient ids must be unique per card: with a shared id, every card's paper depends on the
  // first definition in the page, and Chrome draws nothing if that one sits under display:none.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const paper = `paper-${uid}`;
  const sheen = `sheen-${uid}`;
  // Lining figures: Cormorant's default old-style numerals would drop the 3, 9 and 10 below the line.
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" style={{ fontVariantNumeric: 'lining-nums' }} aria-hidden>
      <defs>
        <linearGradient id={paper} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="var(--color-card-face)" />
          <stop offset="1" stopColor="var(--color-card-face-2)" />
        </linearGradient>
        <radialGradient id={sheen} cx="0.3" cy="0.15" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity={0.55} />
          <stop offset="0.6" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect
        x={1.5}
        y={1.5}
        width={W - 3}
        height={H - 3}
        rx={20}
        fill={`url(#${paper})`}
        stroke="var(--color-card-edge)"
        strokeWidth={3}
      />
      <rect x={1.5} y={1.5} width={W - 3} height={H - 3} rx={20} fill={`url(#${sheen})`} />
      {/* A gilt hairline just inside the edge, on every card. */}
      <rect
        x={10}
        y={10}
        width={W - 20}
        height={H - 20}
        rx={13}
        fill="none"
        stroke={GILT}
        strokeOpacity={0.5}
        strokeWidth={1.4}
      />
      <g className="cf-full">
        {card.kind === 'joker' ? (
          <JokerFace />
        ) : (
          <>
            <Corner card={card} fill={fill} />
            <g transform={`rotate(180 ${W / 2} ${H / 2})`}>
              <Corner card={card} fill={fill} />
            </g>
            {card.rank >= 11 ? (
              <Court card={card} fill={fill} />
            ) : card.rank === 1 ? (
              <Ace card={card} fill={fill} />
            ) : (
              <Pips card={card} fill={fill} />
            )}
          </>
        )}
      </g>
      <g className="cf-compact">
        <Compact card={card} fill={fill} />
      </g>
    </svg>
  );
});
