import { LayoutGroup } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';

export type TableTone = 'navy' | 'ember' | 'wine' | 'forest';

/** Space above and around the table: control bar, page padding, table padding. */
const CHROME_H = '170px';

/**
 * Card width that fits `columns` cards side by side, and — when `tall` is given — also keeps
 * a layout `tall` card-heights high inside the viewport. The height cap is what makes a phone
 * held sideways (≈390px tall) show the whole table without scrolling.
 */
export function columnsStyle(columns: number, max = 100, tall?: number): CSSProperties {
  const byWidth = `calc((min(100vw, 1024px) - 72px - ${columns - 1} * var(--gap)) / ${columns})`;
  const byHeight = tall ? `calc((100dvh - ${CHROME_H}) / ${(tall * 1.4).toFixed(2)})` : null;
  return {
    '--card-w': `clamp(24px, ${byHeight ? `min(${byWidth}, ${byHeight})` : byWidth}, ${max}px)`,
  } as CSSProperties;
}

/** The playing surface: a lit table in the game's tone. One LayoutGroup so cards can fly between piles. */
export function Table({
  children,
  tone = 'navy',
  groupId,
  className = '',
}: {
  children: ReactNode;
  tone?: TableTone;
  /** A new id per deal keeps cards from flying over from the previous deal. */
  groupId?: string;
  className?: string;
}) {
  return (
    // LayoutGroup reads its id only once, so a new deal needs a fresh group (hence the key).
    <LayoutGroup key={groupId} {...(groupId ? { id: groupId } : {})}>
      <div
        className={`table-surface tone-${tone} mx-auto w-full max-w-5xl rounded-[28px] p-3 sm:p-6 short:rounded-[20px] short:p-3 ${className}`}
      >
        {children}
      </div>
    </LayoutGroup>
  );
}
