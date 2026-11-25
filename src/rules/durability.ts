/**
 * Tool wear, the way vanilla applies it to the block a player mines.
 *
 * - Each mined block may cost 1 durability. The tool's damage chance range (100% for vanilla tools) is
 *   divided by Unbreaking level + 1, the vanilla rule for tools (not armor).
 * - Bedrock tools break when their damage would go above maxDurability, so damage == maxDurability is the
 *   last usable point (an iron pickaxe has 250 max durability and 251 uses).
 * - Vein Miner never breaks a tool: when a block would cost the last point it stops before mining that
 *   block, so the final, breaking use is always an ordinary vanilla mining action.
 */

export interface Wear {
  /** Damage on the tool before the vein (after vanilla charged the first block). */
  readonly damage: number;
  readonly maxDurability: number;
  /** No durability component, the unbreakable flag, or Creative mode: nothing is charged. */
  readonly unbreakable: boolean;
  /** Unbreaking level from the tool's enchantments, any whole number from 0. */
  readonly unbreaking: number;
  /** The tool's damage chance range in percent, from ItemDurabilityComponent.getDamageChanceRange(). */
  readonly chance: { readonly min: number; readonly max: number };
}

export type Rng = () => number;

/** Probability (0..1) that one mined block costs durability. */
export function damageProbability(chancePercent: number, unbreaking: number): number {
  const level = Math.max(0, Math.floor(unbreaking));
  const p = chancePercent / 100 / (level + 1);
  return Math.min(1, Math.max(0, p));
}

/** Rolls the chance for one block. Draws a chance from the tool's range first, as the engine does. */
export function rollsDamage(wear: Wear, rng: Rng): boolean {
  if (wear.unbreakable) return false;
  const lo = Math.min(wear.chance.min, wear.chance.max);
  const hi = Math.max(wear.chance.min, wear.chance.max);
  const chance = lo === hi ? lo : lo + Math.floor(rng() * (hi - lo + 1));
  return rng() < damageProbability(chance, wear.unbreaking);
}

/** True when one more point of damage would break the tool. */
export function wouldBreak(damage: number, maxDurability: number): boolean {
  return damage + 1 > maxDurability;
}
