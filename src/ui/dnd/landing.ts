/**
 * Release positions of cards that were just dropped, keyed by card ID.
 * A dropped card remounts in its new pile; it reads this once to animate from
 * the pointer's release point instead of from its old slot.
 */
export const landing = new Map<string, { left: number; top: number }>();
