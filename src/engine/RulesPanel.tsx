import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { OptionSpec, RuleOptions } from '@/core/types/game';
import { load, save } from '@/core/storage/storage';
import { Button } from '@/ui/common/Button';

const PREFS_VERSION = 1;

/** Defaults overlaid with the player's last choices for this game. */
export function preferredOptions(gameId: string, specs: readonly OptionSpec[] = []): RuleOptions {
  const stored = load<Record<string, string>>(`rules:${gameId}`, PREFS_VERSION) ?? {};
  return Object.fromEntries(
    specs.map((s) => {
      const v = stored[s.id];
      return [s.id, v !== undefined && s.choices.some((c) => c.value === v) ? v : s.default];
    }),
  );
}

export function RulesPanel({
  gameId,
  specs,
  current,
  open,
  onClose,
  onApply,
}: {
  gameId: string;
  specs: readonly OptionSpec[];
  current: RuleOptions;
  open: boolean;
  onClose: () => void;
  onApply: (options: RuleOptions) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({ ...current });
  const changed = specs.some((s) => draft[s.id] !== current[s.id]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-title"
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-panel p-5 shadow-2xl ring-1 ring-cream/10"
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="rules-title" className="font-display text-3xl font-semibold text-heading">
              Rules
            </h2>
            <p className="mt-1 text-xs text-cream/60">Changes start a new game.</p>
            <div className="mt-4 flex flex-col gap-4">
              {specs.map((spec) => (
                <fieldset key={spec.id}>
                  <legend className="text-sm font-semibold text-cream">{spec.label}</legend>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {spec.choices.map((c) => {
                      const on = draft[spec.id] === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setDraft((d) => ({ ...d, [spec.id]: c.value }))}
                          className={`min-h-9 rounded-lg px-3 text-sm transition ${
                            on
                              ? 'bg-accent font-semibold text-on-accent'
                              : 'bg-cream/6 text-cream ring-1 ring-cream/15 hover:bg-cream/12'
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  {spec.help && <p className="mt-1 text-xs leading-relaxed text-cream/55">{spec.help}</p>}
                </fieldset>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!changed}
                onClick={() => {
                  save(`rules:${gameId}`, PREFS_VERSION, draft);
                  onApply(draft);
                }}
              >
                Start new game
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
