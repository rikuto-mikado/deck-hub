import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

/** Same key the inline script in index.html reads before first paint. */
const KEY = 'talonbox:theme';
const EVENT = 'talonbox:theme';
const media = () => window.matchMedia('(prefers-color-scheme: light)');

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function currentTheme(): Theme {
  return stored() ?? (media().matches ? 'light' : 'dark');
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3eee3' : '#08090b');
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: still switch for this visit */
  }
  apply(theme);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  // Follow the OS setting until the player picks a theme themselves.
  const onSystem = () => {
    if (!stored()) {
      apply(currentTheme());
      cb();
    }
  };
  const m = media();
  m.addEventListener('change', onSystem);
  window.addEventListener(EVENT, cb);
  return () => {
    m.removeEventListener('change', onSystem);
    window.removeEventListener(EVENT, cb);
  };
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'dark' as Theme);
  return [theme, setTheme];
}
