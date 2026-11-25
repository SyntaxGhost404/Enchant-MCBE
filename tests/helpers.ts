import { BlockPermutation, Dimension, ItemStack, Player, flush, reset, state, type Vector3 } from './fake/server';
import { ui } from './fake/server-ui';
import { writeLevels } from '../src/game/items';
import type { EnchantKey } from '../src/rules/enchantments';

const TIER = ['wooden', 'stone', 'copper', 'iron', 'golden', 'diamond', 'netherite'];
const rank = (tool?: ItemStack) => {
  if (!tool) return -1;
  const t = tool.typeId.replace('minecraft:', '').replace('_pickaxe', '');
  // golden pickaxes harvest like wooden ones in vanilla
  return t === 'golden' ? 0 : TIER.indexOf(t);
};
const NEEDS: Record<string, number> = { coal: 0, quartz: 0, nether_gold: 0, iron: 1, lapis: 1, copper: 1, gold: 3, redstone: 3, diamond: 3, emerald: 3, ancient_debris: 5 };
const DROP: Record<string, [string, number]> = {
  coal: ['minecraft:coal', 1],
  iron: ['minecraft:raw_iron', 1],
  copper: ['minecraft:raw_copper', 2],
  gold: ['minecraft:raw_gold', 1],
  redstone: ['minecraft:redstone', 4],
  lapis: ['minecraft:lapis_lazuli', 4],
  diamond: ['minecraft:diamond', 1],
  emerald: ['minecraft:emerald', 1],
  quartz: ['minecraft:quartz', 1],
  nether_gold: ['minecraft:gold_nugget', 2],
  ancient_debris: ['minecraft:ancient_debris', 1]
};

function kind(blockId: string): string | undefined {
  const b = blockId.replace('minecraft:', '').replace('lit_', '').replace('deepslate_', '');
  if (b === 'ancient_debris') return b;
  if (b === 'quartz_ore') return 'quartz';
  if (b === 'nether_gold_ore') return 'nether_gold';
  if (b.endsWith('_ore')) return b.slice(0, -4);
  return undefined;
}

/**
 * Engine-like ore loot for tests: tool tier decides harvesting, Silk Touch drops the block, Fortune adds
 * its level to the count (enough to see that every Fortune drop is carried and smelted exactly).
 */
export function oreLoot(blockId: string, tool?: ItemStack): ItemStack[] | undefined {
  const k = kind(blockId);
  if (!k) return [new ItemStack('minecraft:cobblestone', 1)];
  if (rank(tool) < (NEEDS[k] ?? 0)) return undefined;
  if (tool?.enchants.get('silk_touch')) return [new ItemStack(blockId.replace('lit_', ''), 1)];
  const [item, base] = DROP[k]!;
  const fortune = k === 'ancient_debris' ? 0 : (tool?.enchants.get('fortune') ?? 0);
  return [new ItemStack(item, base + fortune)];
}

export interface PickOptions {
  custom?: EnchantKey[];
  enchants?: Record<string, number>;
  damage?: number;
  unbreakable?: boolean;
  lore?: string[];
  name?: string;
}

export function pickaxe(type = 'minecraft:diamond_pickaxe', o: PickOptions = {}): ItemStack {
  const item = new ItemStack(type, 1);
  for (const [id, level] of Object.entries(o.enchants ?? {})) item.enchants.set(id, level);
  if (item.durability) {
    item.durability.damage = o.damage ?? 0;
    item.durability.unbreakable = !!o.unbreakable;
  }
  if (o.lore) item.lore = [...o.lore];
  if (o.name) item.nameTag = o.name;
  if (o.custom?.length) writeLevels(item, new Map(o.custom.map((k) => [k, 1])));
  return item;
}

export function setup() {
  reset();
  ui.answers = [];
  ui.shown = [];
  state.lootRule = oreLoot;
  const dim = new Dimension();
  const player = new Player(dim);
  dim.players = [player];
  return { dim, player };
}

/** Puts a line or set of blocks of one type. */
export function place(dim: Dimension, cells: Vector3[], id: string) {
  for (const c of cells) dim.set(c, id);
}

/**
 * What vanilla does before the after-event: the first block is gone and the tool in hand has taken its
 * durability point. Returns the event the add-on receives.
 */
export function vanillaBreak(dim: Dimension, player: Player, at: Vector3, tool: ItemStack, costs = 1) {
  const brokenId = dim.typeAt(at);
  const before = tool.clone();
  const after = tool.clone();
  if (after.durability && costs > 0) after.durability.damage += costs;
  dim.set(at, 'minecraft:air');
  player.inventory.setItem(player.selectedSlotIndex, after);
  return {
    brokenBlockPermutation: new BlockPermutation(brokenId),
    itemStackBeforeBreak: before,
    itemStackAfterBreak: after as ItemStack | undefined,
    player,
    dimension: dim,
    block: dim.getBlock(at)!
  };
}

export function held(player: Player): ItemStack {
  return player.inventory.getItem(player.selectedSlotIndex)!;
}

export function totals(dim: Dimension): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of dim.items()) out[e.itemStack!.typeId] = (out[e.itemStack!.typeId] ?? 0) + e.itemStack!.amount;
  return out;
}

/** Runs queued system.run work and lets pending promises (forms) settle. */
export async function settle(rounds = 6) {
  for (let i = 0; i < rounds; i++) {
    flush();
    await new Promise((r) => setTimeout(r, 0));
  }
  flush();
}
