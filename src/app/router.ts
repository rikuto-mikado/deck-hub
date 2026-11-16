import { useSyncExternalStore } from 'react';

/** Minimal hash router: works on any static host with no server rewrites. */
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

const getPath = () => window.location.hash.replace(/^#\/?/, '');

export function usePath(): string {
  return useSyncExternalStore(subscribe, getPath, () => '');
}

/** Query parameters after the hash path: "#/play/golf?seed=42". */
export function useQuery(): URLSearchParams {
  const path = usePath();
  return new URLSearchParams(path.split('?')[1] ?? '');
}

export function href(path: string): string {
  return `#/${path}`;
}

export function navigate(path: string): void {
  window.location.hash = `/${path}`;
}
