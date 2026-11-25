/**
 * Telling a grindstone result apart from the same pickaxe coming back unchanged.
 *
 * The grindstone screen is not visible to scripts. When a player opens a grindstone, the add-on notes the
 * wear of every pickaxe they carry that has a custom enchantment (only those could be put in). A pickaxe
 * that later reappears in their inventory is a grindstone result when, compared with that note:
 *  - it has no non-curse vanilla enchantments left, and
 *  - it either had some before (the grindstone removed them) or it was repaired (two pickaxes combined).
 * A pickaxe that only went in and came back out has the same wear and keeps its enchantments.
 */

export interface WearNote {
  readonly damage: number;
  /** Vanilla enchantments other than curses. */
  readonly nonCurse: number;
}

/** Curses survive the grindstone. Ids without the minecraft: prefix. */
export const CURSES: ReadonlySet<string> = new Set(['binding', 'vanishing']);

export const stripNamespace = (id: string): string => (id.startsWith('minecraft:') ? id.slice(10) : id);

export function encodeNote(session: number, note: WearNote): string {
  return `${session}|${note.damage}|${note.nonCurse}`;
}

export function decodeNote(value: unknown): { session: number; note: WearNote } | undefined {
  if (typeof value !== 'string') return undefined;
  const parts = value.split('|');
  if (parts.length !== 3) return undefined;
  const [session, damage, nonCurse] = parts.map(Number) as [number, number, number];
  if (![session, damage, nonCurse].every(Number.isFinite)) return undefined;
  return { session, note: { damage, nonCurse } };
}

export function looksGround(before: WearNote, now: WearNote): boolean {
  return now.nonCurse === 0 && (before.nonCurse > 0 || now.damage < before.damage);
}
