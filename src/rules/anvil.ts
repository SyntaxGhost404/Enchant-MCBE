/**
 * Anvil pricing and wear, following vanilla Bedrock:
 *
 * - applying an enchantment from a book costs (new level - old level) x the book multiplier;
 * - plus the prior work penalty of both items, 2^uses - 1;
 * - 40 levels or more is "Too Expensive!" outside Creative;
 * - each use has a 12% chance to damage the anvil one stage (Survival and Adventure only).
 *
 * The Script API does not expose the item's vanilla anvil use count, so the penalty counts the uses of
 * this add-on's anvil menu, which is stored on the pickaxe.
 */

export const TOO_EXPENSIVE = 40;
export const ANVIL_DAMAGE_CHANCE = 0.12;

export const ANVILS: readonly string[] = ['minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil'];
export const ANVIL_SET: ReadonlySet<string> = new Set(ANVILS);

export function priorWorkPenalty(uses: number): number {
  const n = Math.max(0, Math.min(30, Math.floor(Number.isFinite(uses) ? uses : 0)));
  return 2 ** n - 1;
}

export function bookApplyCost(multiplier: number, fromLevel: number, toLevel: number, targetUses: number): number {
  const levels = Math.max(0, toLevel - fromLevel);
  return Math.max(1, levels * multiplier + priorWorkPenalty(targetUses));
}

/** The anvil one damage stage further, or undefined when a damaged anvil breaks. */
export function damagedAnvil(id: string): string | undefined {
  const i = ANVILS.indexOf(id);
  if (i < 0) return id;
  return ANVILS[i + 1];
}
