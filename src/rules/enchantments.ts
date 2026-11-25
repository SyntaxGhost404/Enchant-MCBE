/**
 * The two custom enchantments. Bedrock has no data-driven custom enchantments, so the add-on keeps its
 * own record on each pickaxe:
 *
 * - an item dynamic property per enchantment holding its level (survives saving, containers, drops,
 *   death, world reloads and Realm restarts, like any other item data), and
 * - a lore line per enchantment, shown in the tooltip under the vanilla enchantments.
 *
 * Either record is enough to restore the other, so an operation that keeps only one of them (for
 * example something that copies lore but not item properties) does not lose the enchantment.
 */

export type EnchantKey = 'vein_miner' | 'ore_smelter';

export interface CustomEnchantment {
  readonly key: EnchantKey;
  /** Item id of the enchanted book that carries it. */
  readonly book: string;
  /** Item dynamic property holding the level on a pickaxe. */
  readonly property: string;
  /** Translation key of the lore line (gray, like vanilla enchantment lines). */
  readonly loreKey: string;
  /** The same line as plain text. Loot tables cannot translate, so books in chests start with this. */
  readonly plainLore: string;
  /** Translation key of the name used in menus and messages. */
  readonly nameKey: string;
  readonly maxLevel: number;
  /**
   * Anvil cost multiplier when applied from a book. Vanilla rarity groups: Silk Touch (very rare) is 4
   * from a book, Fortune and Mending (rare) are 2. Vein Miner is priced like Silk Touch, Ore Smelter like
   * Fortune.
   */
  readonly bookMultiplier: number;
}

export const VEIN_MINER: CustomEnchantment = {
  key: 'vein_miner',
  book: 'vmos:vein_miner_book',
  property: 'vmos:vein_miner',
  loreKey: 'vmos.lore.vein_miner',
  plainLore: '§r§7Vein Miner',
  nameKey: 'vmos.enchantment.vein_miner',
  maxLevel: 1,
  bookMultiplier: 4
};

export const ORE_SMELTER: CustomEnchantment = {
  key: 'ore_smelter',
  book: 'vmos:ore_smelter_book',
  property: 'vmos:ore_smelter',
  loreKey: 'vmos.lore.ore_smelter',
  plainLore: '§r§7Ore Smelter',
  nameKey: 'vmos.enchantment.ore_smelter',
  maxLevel: 1,
  bookMultiplier: 2
};

/** Registry order is also the order of the lore lines. */
export const ENCHANTMENTS: readonly CustomEnchantment[] = [VEIN_MINER, ORE_SMELTER];

const BY_BOOK = new Map(ENCHANTMENTS.map((e) => [e.book, e]));

export function enchantmentOfBook(itemId: string): CustomEnchantment | undefined {
  return BY_BOOK.get(itemId);
}

/** Item dynamic property: how many times the add-on's anvil menu has worked on this pickaxe. */
export const WORK_PROPERTY = 'vmos:anvil_uses';
/** Item dynamic property: wear snapshot taken when the player opened a grindstone. */
export const GRINDSTONE_PROPERTY = 'vmos:grindstone';

/** Vanilla pickaxes. Custom pickaxes from other add-ons are recognised by the minecraft:is_pickaxe tag. */
export const VANILLA_PICKAXES: ReadonlySet<string> = new Set([
  'minecraft:wooden_pickaxe',
  'minecraft:stone_pickaxe',
  'minecraft:copper_pickaxe',
  'minecraft:iron_pickaxe',
  'minecraft:golden_pickaxe',
  'minecraft:diamond_pickaxe',
  'minecraft:netherite_pickaxe'
]);

/** A level stored in a dynamic property, or 0 when it is missing or not a sensible number. */
export function storedLevel(value: unknown, maxLevel: number): number {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const level = Math.floor(value);
  if (level <= 0) return 0;
  return Math.min(level, maxLevel);
}

/** Lore line text recognised as one of ours: the translated line, or the plain line loot tables write. */
export function isOurLoreLine(e: CustomEnchantment, rawJson: string | undefined, plain: string | undefined): boolean {
  if (rawJson !== undefined && rawJson.includes(`"${e.loreKey}"`)) return true;
  if (plain !== undefined && (plain === e.plainLore || plain.includes(e.loreKey))) return true;
  return false;
}
