/**
 * Vein Miner: after the player breaks an ore by hand, mine the rest of the connected vein.
 *
 * The whole vein is handled inside the same tick as the player's break, in one synchronous pass, so the
 * player cannot swap the tool, other scripts cannot move items in between, and no stale copy of the tool
 * is ever written back. The tool is read from the player's hand after vanilla has charged the first
 * block, compared with the engine's own "item after break", and only its durability is changed.
 */

import {
  EntityComponentTypes,
  GameMode,
  ItemComponentTypes,
  world,
  type Dimension,
  type ItemStack,
  type Player,
  type PlayerBreakBlockAfterEvent,
  type Vector3
} from '@minecraft/server';
import { runJob, type JobWorld } from '../rules/job';
import { breakSound, familyOf } from '../rules/ores';
import { mergeStacks, smeltStacks } from '../rules/stacks';
import { findVein, posKey, type Pos } from '../rules/vein';
import { wholeXpFromTenths } from '../rules/xp';
import { customLevels, damageOf, isPickaxe, sameItem, vanillaLevel } from './items';
import { actionBar, tr, warn } from './notify';
import { VEIN_RADIUS, veinLimit } from './settings';
import { markOwnSpawn, smeltsWith, spawnOrbs, tileDropsEnabled } from './smelter';
import { itemStackOps } from './stack-ops';

/** Food exhaustion vanilla adds for each block a player mines. */
const EXHAUSTION_PER_BLOCK = 0.005;
/** Sounds per vein: enough to hear the vein go, without dozens of sounds at once. */
const MAX_SOUNDS = 4;

const center = (p: Pos): Vector3 => ({ x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 });

function withNamespace(id: string): string {
  return id.includes(':') ? id : `minecraft:${id}`;
}

/** Blocks the miner may break, as the game mode allows. */
function allowedBlocks(blocks: readonly string[], mode: GameMode, tool: ItemStack): Set<string> {
  if (mode !== GameMode.Adventure) return new Set(blocks);
  // Adventure: only what the tool's can_destroy list allows, as vanilla does.
  let allowed: string[] = [];
  try {
    allowed = tool.getCanDestroy().map(withNamespace);
  } catch {
    allowed = [];
  }
  return new Set(blocks.filter((b) => allowed.includes(b)));
}

/** The block under every nearby player's feet. Vein Miner leaves these, so nobody drops into a pit or lava. */
function supportBlocks(dimension: Dimension, origin: Pos): Set<string> {
  const out = new Set<string>();
  let players: Player[] = [];
  try {
    players = dimension.getPlayers({ location: center(origin), maxDistance: VEIN_RADIUS + 4 });
  } catch {
    players = [];
  }
  for (const p of players) {
    const l = p.location;
    const y = Math.floor(l.y - 0.01);
    for (const dx of [-0.3, 0.3])
      for (const dz of [-0.3, 0.3]) out.add(posKey({ x: Math.floor(l.x + dx), y, z: Math.floor(l.z + dz) }));
  }
  return out;
}

function inventorySlot(player: Player) {
  const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
  if (!container) return undefined;
  try {
    return container.getSlot(player.selectedSlotIndex);
  } catch {
    return undefined;
  }
}

export function onBlockBroken(event: PlayerBreakBlockAfterEvent): void {
  const permutation = event.brokenBlockPermutation;
  const family = familyOf(permutation.type.id);
  if (!family) return;

  const before = event.itemStackBeforeBreak;
  if (!before || !isPickaxe(before) || !customLevels(before).has('vein_miner')) return;
  const player = event.player;
  if (!player.isValid || player.isSneaking) return;
  const mode = player.getGameMode();
  if (mode === GameMode.Spectator) return;

  // No item after the break: the pickaxe broke on this block, so there is nothing left to mine with.
  const after = event.itemStackAfterBreak;
  if (!after) return;
  const slot = inventorySlot(player);
  const tool = slot?.getItem();
  if (!slot || !tool || !sameItem(tool, after)) return;

  const dimension = event.dimension;
  const loot = world.getLootTableManager();
  // Vein Miner works only where the pickaxe could harvest the ore, exactly as vanilla drops require.
  try {
    if (loot.generateLootFromBlockPermutation(permutation, tool) === undefined) return;
  } catch {
    return;
  }

  const origin: Pos = { x: event.block.x, y: event.block.y, z: event.block.z };
  const members = allowedBlocks(family.blocks, mode, tool);
  if (members.size === 0) return;
  const range = dimension.heightRange;
  const supports = supportBlocks(dimension, origin);

  const readType = (p: Pos): string | undefined => {
    if (p.y < range.min || p.y >= range.max) return undefined;
    try {
      return dimension.getBlock(p)?.typeId;
    } catch {
      return undefined;
    }
  };

  const limit = veinLimit();
  const targets = findVein(
    origin,
    (p) => {
      const t = readType(p);
      return t !== undefined && members.has(t);
    },
    { maxBlocks: limit - 1, radius: VEIN_RADIUS },
    (p) => !supports.has(posKey(p))
  );
  if (targets.length === 0) return;

  const creative = mode === GameMode.Creative;
  const drops = !creative && tileDropsEnabled();
  const silk = vanillaLevel(tool, 'silk_touch') > 0;
  const durability = tool.getComponent(ItemComponentTypes.Durability);
  let chance = { min: 100, max: 100 };
  try {
    if (durability) chance = durability.getDamageChanceRange();
  } catch {
    chance = { min: 100, max: 100 };
  }

  const veinBlocks: JobWorld<ItemStack> = {
    typeAt: readType,
    loot: (p) => {
      const block = dimension.getBlock(p);
      if (!block) throw new Error('block unavailable');
      return loot.generateLootFromBlock(block, tool);
    },
    clear: (p) => {
      const block = dimension.getBlock(p);
      if (!block) return false;
      block.setType('minecraft:air');
      return dimension.getBlock(p)?.typeId === 'minecraft:air';
    }
  };

  const outcome = runJob(
    {
      targets,
      family: members,
      wear: {
        damage: damageOf(tool),
        maxDurability: durability?.maxDurability ?? 0,
        unbreakable: creative || !durability || durability.unbreakable,
        unbreaking: vanillaLevel(tool, 'unbreaking'),
        chance
      },
      collectDrops: drops,
      miningXp: drops && !silk && family.xp[1] > 0 ? family.xp : undefined
    },
    veinBlocks,
    Math.random
  );
  if (outcome.mined.length === 0) {
    if (outcome.stop === 'durability') actionBar(player, tr('vmos.notice.tool_low'));
    return;
  }

  // Durability: applied to the item in the hand right now (same tick, verified unchanged).
  if (outcome.damage > 0) {
    try {
      const fresh = slot.getItem();
      const comp = fresh?.getComponent(ItemComponentTypes.Durability);
      if (fresh && comp && sameItem(fresh, tool)) {
        comp.damage = Math.min(comp.maxDurability, comp.damage + outcome.damage);
        slot.setItem(fresh);
      } else {
        warn('vein durability', 'the pickaxe changed during the vein; durability not applied');
      }
    } catch (e) {
      warn('vein durability', e);
    }
  }

  const at = center(origin);
  if (drops) {
    let stacks = outcome.drops;
    let smeltTenths = 0;
    if (smeltsWith(tool)) {
      const smelted = smeltStacks(stacks, itemStackOps);
      stacks = smelted.stacks;
      smeltTenths = smelted.xpTenths;
    }
    for (const s of mergeStacks(stacks, itemStackOps)) {
      try {
        markOwnSpawn(dimension.spawnItem(s, at));
      } catch (e) {
        warn('vein drops', e);
      }
    }
    for (const xp of outcome.xp) spawnOrbs(dimension, at, xp);
    spawnOrbs(dimension, at, wholeXpFromTenths(smeltTenths, Math.random));
  }

  if (!creative) {
    try {
      const exhaustion = player.getComponent(EntityComponentTypes.Exhaustion);
      if (exhaustion)
        exhaustion.setCurrentValue(
          Math.min(exhaustion.effectiveMax, exhaustion.currentValue + EXHAUSTION_PER_BLOCK * outcome.mined.length)
        );
    } catch {
      // hunger is a detail; never fail the vein over it
    }
  }

  const step = Math.max(1, Math.ceil(outcome.mined.length / MAX_SOUNDS));
  for (let i = 0; i < outcome.mined.length; i += step) {
    const m = outcome.mined[i]!;
    try {
      dimension.playSound(breakSound(m.type), center(m.pos), { volume: 0.8 });
    } catch {
      break;
    }
  }

  if (outcome.stop === 'durability') actionBar(player, tr('vmos.notice.tool_low'));
}
