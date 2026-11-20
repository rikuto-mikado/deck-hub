import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useSyncExternalStore } from 'react';

/** Phones and tablets held upright; mice and trackpads never see the overlay. */
const QUERY = '(pointer: coarse) and (orientation: portrait)';

function subscribe(cb: () => void) {
  const m = window.matchMedia(QUERY);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}
const isPortraitTouch = () => window.matchMedia(QUERY).matches;

/**
 * Talonbox is laid out for landscape only, the home gallery as much as the tables: touch players
 * holding the device upright must turn it sideways. There is deliberately no portrait bypass.
 */
export function RotateHint() {
  const portrait = useSyncExternalStore(subscribe, isPortraitTouch, () => false);

  // Keep the page behind the overlay from scrolling under the player's thumb.
  useEffect(() => {
    if (!portrait) return;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = overflow;
    };
  }, [portrait]);

  return (
    <AnimatePresence>
      {portrait && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rotate-title"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-ink/92 px-8 text-center backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            aria-hidden
            animate={{ rotate: [0, 0, -90, -90, 0] }}
            transition={{ duration: 3.2, times: [0, 0.2, 0.45, 0.8, 1], repeat: Infinity, ease: [0.45, 0, 0.2, 1] }}
          >
            <rect x="30" y="12" width="36" height="72" rx="7" stroke="var(--color-gold)" strokeWidth="2.5" />
            <rect x="35" y="20" width="26" height="54" rx="2" fill="var(--color-gold)" fillOpacity="0.14" />
            <rect x="44" y="78" width="8" height="2" rx="1" fill="var(--color-gold)" />
            <rect x="42" y="38" width="12" height="17" rx="2" fill="var(--color-gold)" fillOpacity="0.8" />
          </motion.svg>
          <div className="flex flex-col gap-2">
            <h2 id="rotate-title" className="m-0 font-display text-4xl font-semibold text-heading">
              Turn your device sideways
            </h2>
            <p className="m-0 text-sm leading-relaxed text-body">
              Talonbox is laid out for landscape — every card stays large and readable.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
