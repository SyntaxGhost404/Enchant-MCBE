/**
 * Experience helpers. All XP the add-on gives is spawned as orbs, so Mending on the pickaxe and on
 * armor repairs from it exactly as it does from vanilla orbs.
 */

import type { Rng } from './durability';

/** Vanilla orb values, largest first. A total is split into these, highest first. */
export const ORB_VALUES: readonly number[] = [2477, 1237, 617, 307, 149, 73, 37, 17, 7, 3, 1];

/** Splits an XP total into orb values. Several orbs let Mending spread repairs over several items. */
export function splitIntoOrbs(total: number): number[] {
  const orbs: number[] = [];
  let left = Math.max(0, Math.floor(total));
  for (const value of ORB_VALUES) {
    while (left >= value) {
      orbs.push(value);
      left -= value;
    }
  }
  return orbs;
}

/** Uniform whole number in [min, max]. */
export function randomInt(min: number, max: number, rng: Rng): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * Furnace rule for fractional XP: the whole part is given, and the fraction is the chance of one more
 * point. Input is in tenths of a point so that 0.7 + 0.7 + 0.7 is exactly 2.1.
 */
export function wholeXpFromTenths(tenths: number, rng: Rng): number {
  const t = Math.max(0, Math.floor(tenths));
  const whole = Math.floor(t / 10);
  const fraction = (t % 10) / 10;
  return whole + (fraction > 0 && rng() < fraction ? 1 : 0);
}
