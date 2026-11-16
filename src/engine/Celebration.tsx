import { motion } from 'motion/react';
import { useMemo } from 'react';
import { createStandardDeck } from '@/core/deck/createDeck';
import { createRng } from '@/core/deck/rng';
import { shuffle } from '@/core/deck/shuffle';
import { CardFace } from '@/ui/card/CardFace';

/** The classic solitaire send-off: a shower of cards tumbling across the screen. */
export function Celebration({ seed }: { seed: number }) {
  const cards = useMemo(() => {
    const rng = createRng(seed);
    return shuffle(createStandardDeck({ faceUp: true }), rng)
      .slice(0, 26)
      .map((card, i) => ({
        card,
        left: rng.next() * 100,
        delay: i * 0.06 + rng.next() * 0.2,
        drift: (rng.next() - 0.5) * 240,
        spin: (rng.next() - 0.5) * 540,
        duration: 2.2 + rng.next() * 1.2,
      }));
  }, [seed]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {cards.map(({ card, left, delay, drift, spin, duration }) => (
        <motion.div
          key={card.id}
          className="card-preview absolute w-[clamp(44px,7vw,84px)]"
          style={{ left: `${left}%`, top: -140, aspectRatio: '5 / 7' }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '115vh', x: drift, rotate: spin, opacity: [1, 1, 0.9] }}
          transition={{ duration, delay, ease: [0.3, 0.1, 0.6, 1] }}
        >
          <CardFace card={card} />
        </motion.div>
      ))}
    </div>
  );
}
