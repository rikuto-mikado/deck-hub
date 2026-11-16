import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { href } from '@/app/router';
import { useSoundEnabled } from '@/app/sound';
import { useTheme } from '@/app/theme';
import { IconButton } from '@/ui/common/Button';
import {
  IconBack,
  IconDeal,
  IconHint,
  IconMoon,
  IconMore,
  IconRestart,
  IconRules,
  IconSound,
  IconMute,
  IconSun,
  IconUndo,
} from '@/ui/common/icons';

const Divider = () => <span className="hidden h-7 w-px bg-gold/30 sm:block" aria-hidden />;

function Stat({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center leading-tight ${className}`}>
      <span className="text-[9px] font-medium tracking-[0.24em] text-muted uppercase">{label}</span>
      <span className="text-[15px] font-semibold text-cream tabular-nums">{value}</span>
    </div>
  );
}

/** mm:ss since the deal, frozen once the game ends. */
function Clock({ startedAt, endedAt }: { startedAt: number; endedAt: number | null }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (endedAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [endedAt]);
  const secs = Math.max(0, Math.floor(((endedAt ?? now) - startedAt) / 1000));
  const text = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return <Stat label="Time" value={<time dateTime={`PT${secs}S`}>{text}</time>} />;
}

interface Action {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

/** Secondary actions; inline on wide screens, behind a "More" button on phones. */
function Overflow({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <>
      <div className="hidden sm:flex">
        {actions.map((a) => (
          <IconButton key={a.label} label={a.label} onClick={a.onClick} disabled={a.disabled}>
            {a.icon}
          </IconButton>
        ))}
      </div>
      <div ref={ref} className="relative sm:hidden">
        <IconButton label="More" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
          <IconMore />
        </IconButton>
        <AnimatePresence>
          {open && (
            <motion.div
              role="menu"
              className="absolute top-12 right-0 z-40 flex min-w-48 flex-col rounded-2xl bg-panel p-1.5 shadow-[inset_0_0_0_1px_rgb(201_164_92/0.25),0_20px_40px_rgb(0_0_0/0.4)]"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  role="menuitem"
                  disabled={a.disabled}
                  onClick={() => {
                    setOpen(false);
                    a.onClick();
                  }}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm text-cream transition hover:bg-cream/8 disabled:opacity-35"
                >
                  <span className="text-gold">{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export interface ControlBarProps {
  title: string;
  score?: { label: string; value: number } | undefined;
  /** Moves and clock, for games where speed and efficiency mean something. */
  stats?: { moves: number; startedAt: number; endedAt: number | null } | undefined;
  onUndo?: (() => void) | undefined;
  canUndo: boolean;
  onHint?: (() => void) | undefined;
  onRestart?: (() => void) | undefined;
  onNewGame: () => void;
  onRules?: (() => void) | undefined;
}

/** The floating pill above the table: back, title, live stats, and the table's controls. */
export function ControlBar({ title, score, stats, onUndo, canUndo, onHint, onRestart, onNewGame, onRules }: ControlBarProps) {
  const [sound, setSound] = useSoundEnabled();
  const [theme, setTheme] = useTheme();
  const secondary: Action[] = [
    ...(onRestart ? [{ label: 'Restart this deal', icon: <IconRestart />, onClick: onRestart }] : []),
    { label: 'New game', icon: <IconDeal />, onClick: onNewGame },
    ...(onRules ? [{ label: 'Rules', icon: <IconRules />, onClick: onRules }] : []),
    { label: sound ? 'Sound off' : 'Sound on', icon: sound ? <IconSound /> : <IconMute />, onClick: () => setSound(!sound) },
    {
      label: theme === 'dark' ? 'Light mode' : 'Dark mode',
      icon: theme === 'dark' ? <IconSun /> : <IconMoon />,
      onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
  ];

  return (
    <div className="sticky top-3 z-30 mx-auto flex w-full max-w-max items-center gap-x-3 rounded-[30px] bg-bar px-2 py-1.5 shadow-[inset_0_0_0_1px_rgb(201_164_92/0.22),0_12px_30px_rgb(0_0_0/0.35)] backdrop-blur-md sm:gap-x-4 short:top-1">
      <a
        href={href('')}
        aria-label="Back to all games"
        title="All games"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-cream/85 transition hover:bg-cream/8 hover:text-cream"
      >
        <IconBack />
      </a>
      <h1 className="-ml-2 truncate font-display text-xl leading-none font-semibold text-heading sm:text-2xl">{title}</h1>
      {(score || stats) && <Divider />}
      <div className="flex items-center gap-3 sm:gap-4">
        {score && <Stat label={score.label} value={score.value} />}
        {stats && <Stat label="Moves" value={stats.moves} className="hidden min-[440px]:flex" />}
        {stats && <Clock startedAt={stats.startedAt} endedAt={stats.endedAt} />}
      </div>
      <Divider />
      <div className="flex items-center">
        {onUndo && (
          <IconButton label="Undo" onClick={onUndo} disabled={!canUndo}>
            <IconUndo />
          </IconButton>
        )}
        {onHint && (
          <IconButton label="Hint" onClick={onHint}>
            <IconHint />
          </IconButton>
        )}
        <Overflow actions={secondary} />
      </div>
    </div>
  );
}
