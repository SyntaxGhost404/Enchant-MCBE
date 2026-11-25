/**
 * Behavior pack settings (Settings > Behavior Packs > this pack > gear icon). The world owner sets them
 * per world; they are read when a vein starts, so a change applies to the next vein.
 */

import { world } from '@minecraft/server';
import { clampVeinLimit } from '../rules/vein';

export const VEIN_LIMIT_SETTING = 'vmos:vein_limit';
/** Must match the slider in the behavior pack manifest. */
export const VEIN_LIMIT = { min: 8, max: 128, fallback: 64 } as const;
/** Furthest a vein reaches from the first block on any axis. */
export const VEIN_RADIUS = 16;

/** Blocks in one vein, counting the block the player broke. */
export function veinLimit(): number {
  let raw: unknown;
  try {
    raw = world.getPackSettings()[VEIN_LIMIT_SETTING];
  } catch {
    raw = undefined;
  }
  return clampVeinLimit(raw, VEIN_LIMIT.min, VEIN_LIMIT.max, VEIN_LIMIT.fallback);
}
