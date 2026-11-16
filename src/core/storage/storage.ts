/** localStorage wrapper that never throws (private mode, quota, disabled storage). */
const PREFIX = 'talonbox:';

export function load<T>(key: string, version: number): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { v: number; data: T };
    return parsed.v === version ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function save<T>(key: string, version: number, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ v: version, data }));
  } catch {
    /* ignore */
  }
}

/**
 * Deletes every key that starts with `rawPrefix` (no app prefix added). Used to clear
 * data from the app's earlier name, "Deck Hub": old saved games and preferences.
 */
export function removeLegacy(rawPrefix: string): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(rawPrefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
