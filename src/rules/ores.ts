/**
 * Vanilla ore data the add-on relies on. Pure data: no game API here, so the rules can be unit tested.
 *
 * Sources: Mojang's vanilla block list (bedrock-samples 26.60 metadata), the vanilla resource pack's
 * blocks.json for sounds, and the Minecraft Wiki's Experience and Smelting pages for XP values.
 */

export interface OreFamily {
  /** Short id used in logs and tests. */
  readonly id: string;
  /** Every block id that belongs to the vein. Regular, deepslate and lit variants connect to each other. */
  readonly blocks: readonly string[];
  /** XP dropped by mining one block without Silk Touch, inclusive range. [0, 0] means none. */
  readonly xp: readonly [number, number];
}

export const ORE_FAMILIES: readonly OreFamily[] = [
  { id: 'coal', blocks: ['minecraft:coal_ore', 'minecraft:deepslate_coal_ore'], xp: [0, 2] },
  { id: 'iron', blocks: ['minecraft:iron_ore', 'minecraft:deepslate_iron_ore'], xp: [0, 0] },
  { id: 'copper', blocks: ['minecraft:copper_ore', 'minecraft:deepslate_copper_ore'], xp: [0, 0] },
  { id: 'gold', blocks: ['minecraft:gold_ore', 'minecraft:deepslate_gold_ore'], xp: [0, 0] },
  {
    id: 'redstone',
    blocks: [
      'minecraft:redstone_ore',
      'minecraft:lit_redstone_ore',
      'minecraft:deepslate_redstone_ore',
      'minecraft:lit_deepslate_redstone_ore'
    ],
    xp: [1, 5]
  },
  { id: 'lapis', blocks: ['minecraft:lapis_ore', 'minecraft:deepslate_lapis_ore'], xp: [2, 5] },
  { id: 'diamond', blocks: ['minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore'], xp: [3, 7] },
  { id: 'emerald', blocks: ['minecraft:emerald_ore', 'minecraft:deepslate_emerald_ore'], xp: [3, 7] },
  { id: 'nether_quartz', blocks: ['minecraft:quartz_ore'], xp: [2, 5] },
  { id: 'nether_gold', blocks: ['minecraft:nether_gold_ore'], xp: [0, 1] },
  { id: 'ancient_debris', blocks: ['minecraft:ancient_debris'], xp: [0, 0] }
];

const FAMILY_BY_BLOCK = new Map<string, OreFamily>();
for (const family of ORE_FAMILIES) for (const block of family.blocks) FAMILY_BY_BLOCK.set(block, family);

/** Every ore block id the add-on reacts to. */
export const ORE_BLOCKS: ReadonlySet<string> = new Set(FAMILY_BY_BLOCK.keys());

export function familyOf(blockId: string): OreFamily | undefined {
  return FAMILY_BY_BLOCK.get(blockId);
}

/** The sound vanilla plays when a block of this kind breaks (resource pack blocks.json "sound" + "dig."). */
export function breakSound(blockId: string): string {
  if (blockId === 'minecraft:ancient_debris') return 'dig.ancient_debris';
  if (blockId === 'minecraft:quartz_ore' || blockId === 'minecraft:nether_gold_ore') return 'dig.nether_gold_ore';
  if (blockId.includes('deepslate')) return 'dig.deepslate';
  return 'dig.stone';
}

export interface SmeltRecipe {
  readonly output: string;
  /** Furnace experience per item, in tenths of a point (0.7 XP is 7), so sums stay exact. */
  readonly xpTenths: number;
}

/**
 * What Ore Smelter turns ore drops into, with the XP a furnace would give for the same smelt.
 * Only the drops of ore blocks are ever passed through this table.
 */
export const SMELTING: ReadonlyMap<string, SmeltRecipe> = new Map([
  ['minecraft:raw_iron', { output: 'minecraft:iron_ingot', xpTenths: 7 }],
  ['minecraft:raw_copper', { output: 'minecraft:copper_ingot', xpTenths: 7 }],
  ['minecraft:raw_gold', { output: 'minecraft:gold_ingot', xpTenths: 10 }],
  ['minecraft:ancient_debris', { output: 'minecraft:netherite_scrap', xpTenths: 20 }]
]);

/** Ore blocks whose drops Ore Smelter can change. Nether gold ore drops nuggets, which do not smelt. */
export const SMELTABLE_ORES: ReadonlySet<string> = new Set([
  'minecraft:iron_ore',
  'minecraft:deepslate_iron_ore',
  'minecraft:copper_ore',
  'minecraft:deepslate_copper_ore',
  'minecraft:gold_ore',
  'minecraft:deepslate_gold_ore',
  'minecraft:ancient_debris'
]);
