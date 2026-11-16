import { memo } from 'react';

const W = 250;
const H = 350;
const CX = W / 2;
const CY = H / 2;
// The field inside the gilt frame.
const L = 24,
  R = W - 24,
  T = 24,
  B = H - 24;

/** Rays from the centre to the edge of the field, computed so no clip path is needed. */
const RAYS = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2;
  const dx = Math.cos(a),
    dy = Math.sin(a);
  const tx = dx > 0 ? (R - CX) / dx : dx < 0 ? (L - CX) / dx : Infinity;
  const ty = dy > 0 ? (B - CY) / dy : dy < 0 ? (T - CY) / dy : Infinity;
  const t = Math.min(tx, ty);
  return `M${CX + dx * 30} ${CY + dy * 30}L${(CX + dx * t).toFixed(1)} ${(CY + dy * t).toFixed(1)}`;
}).join('');

const diamond = (r: number) => `M${CX} ${CY - r}L${CX + r * 0.72} ${CY}L${CX} ${CY + r}L${CX - r * 0.72} ${CY}Z`;

/** Art-deco back: navy field, gilt sunburst, nested diamonds and a T monogram. */
export const CardBack = memo(function CardBack() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" aria-hidden>
      <rect
        x={1.5}
        y={1.5}
        width={W - 3}
        height={H - 3}
        rx={20}
        fill="var(--color-card-back)"
        stroke="rgb(0 0 0 / 0.5)"
        strokeWidth={3}
      />
      <rect
        x={12}
        y={12}
        width={W - 24}
        height={H - 24}
        rx={12}
        fill="none"
        stroke="var(--color-card-gilt)"
        strokeOpacity={0.75}
        strokeWidth={2}
      />
      <rect
        x={L}
        y={T}
        width={R - L}
        height={B - T}
        rx={6}
        fill="none"
        stroke="var(--color-card-gilt)"
        strokeOpacity={0.35}
        strokeWidth={1.2}
      />
      <path d={RAYS} stroke="var(--color-card-gilt)" strokeOpacity={0.26} strokeWidth={1.3} />
      <path d={diamond(96)} fill="var(--color-card-back)" stroke="var(--color-card-gilt)" strokeOpacity={0.5} strokeWidth={1.4} />
      <path d={diamond(80)} fill="none" stroke="var(--color-card-gilt)" strokeOpacity={0.8} strokeWidth={2} />
      <path d={diamond(40)} fill="var(--color-card-gilt)" fillOpacity={0.9} />
      <text
        x={CX}
        y={CY + 14}
        textAnchor="middle"
        fontFamily="var(--font-card)"
        fontStyle="italic"
        fontWeight={600}
        fontSize={42}
        fill="var(--color-card-back)"
      >
        T
      </text>
      {[
        [L + 14, T + 14],
        [R - 14, T + 14],
        [L + 14, B - 14],
        [R - 14, B - 14],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={x! - 4}
          y={y! - 4}
          width={8}
          height={8}
          fill="var(--color-card-gilt)"
          fillOpacity={0.8}
          transform={`rotate(45 ${x} ${y})`}
        />
      ))}
    </svg>
  );
});
