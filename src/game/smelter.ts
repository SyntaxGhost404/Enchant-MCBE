/**
 * Ore Smelter for the block the player breaks by hand.
 *
 * The engine drops that block's items itself, so they have to be recognised as they appear. Instead of
 * scanning around the block (which would also take other players' items, or a pile already lying there),
 * the add-on notes the exact block cell just before the break and converts only items that spawn inside
 * that cell during the break tick or the next one. Each converted item entity is replaced by the same
 * number of smelted items, keeping its position and motion. Items already on the ground, items another
 * player drops, and items from any other block are never touched.
 *
 * Blocks broken by Vein Miner are smelted before their drops are spawned (see vein-miner.ts), so this
 * runs only for the first block.
 */

import {
  EntityComponentTypes,
  GameMode,
  ItemStack,
  system,
  world,
  type Dimension,
  type Entity,
  type EntitySpawnAfterEvent,
  type PlayerBreakBlockBeforeEvent,
  type Vector3
} from '@minecraft/server';
import { SMELTABLE_ORES, SMELTING } from '../rules/ores';
import { smeltStacks } from '../rules/stacks';
import { splitIntoOrbs, wholeXpFromTenths } from '../rules/xp';
import { customLevels, isPickaxe, vanillaLevel } from './items';
import { itemStackOps } from './stack-ops';

interface Capture {
  readonly tick: number;
}

/** Cells whose drops belong to an Ore Smelter break, keyed by dimension and block position. */
const captures = new Map<string, Capture>();
/** Item entities this add-on spawned (id to tick); never converted again. */
const ownSpawns = new Map<string, number>();

const cellKey = (dimension: string, x: number, y: number, z: number): string => `${dimension}|${x}|${y}|${z}`;

/** Capture lasts for the break tick and the next one, in case the engine spawns the drop a tick later. */
const CAPTURE_TICKS = 1;

function forgetOld(now: number): void {
  for (const [key, c] of captures) if (now - c.tick > CAPTURE_TICKS) captures.delete(key);
  for (const [id, tick] of ownSpawns) if (now - tick > CAPTURE_TICKS + 1) ownSpawns.delete(id);
}

export function markOwnSpawn(entity: Entity): void {
  const now = system.currentTick;
  forgetOld(now);
  ownSpawns.set(entity.id, now);
}

export function tileDropsEnabled(): boolean {
  try {
    return world.gameRules.doTileDrops;
  } catch {
    return true;
  }
}

/** True when this pickaxe smelts: it has Ore Smelter and no Silk Touch (Silk Touch keeps the ore block). */
export function smeltsWith(tool: ItemStack): boolean {
  return isPickaxe(tool) && customLevels(tool).has('ore_smelter') && vanillaLevel(tool, 'silk_touch') === 0;
}

/** Before-event (read only): remember the cell if this break should smelt. */
export function noteBreakForSmelting(event: PlayerBreakBlockBeforeEvent): void {
  const block = event.block;
  if (!SMELTABLE_ORES.has(block.typeId)) return;
  const tool = event.itemStack;
  if (!tool || !smeltsWith(tool)) return;
  const mode = event.player.getGameMode();
  if (mode === GameMode.Creative || mode === GameMode.Spectator) return;
  if (!tileDropsEnabled()) return;
  const now = system.currentTick;
  forgetOld(now);
  captures.set(cellKey(block.dimension.id, block.x, block.y, block.z), { tick: now });
}

export function spawnOrbs(dimension: Dimension, at: Vector3, xp: number): void {
  for (const value of splitIntoOrbs(xp)) {
    try {
      dimension.spawnXp(at, value);
    } catch {
      return;
    }
  }
}

/** After-event: replace a captured raw drop with its smelted form. */
export function onEntitySpawn(event: EntitySpawnAfterEvent): void {
  if (captures.size === 0) return;
  const entity = event.entity;
  if (entity.typeId !== 'minecraft:item' || !entity.isValid) return;
  const now = system.currentTick;
  forgetOld(now);
  if (ownSpawns.has(entity.id)) return;

  const at = entity.location;
  const dimension = entity.dimension;
  const key = cellKey(dimension.id, Math.floor(at.x), Math.floor(at.y), Math.floor(at.z));
  if (!captures.has(key)) return;

  const stack = entity.getComponent(EntityComponentTypes.Item)?.itemStack;
  if (!stack || !SMELTING.has(stack.typeId)) return;

  const result = smeltStacks([stack], itemStackOps);
  let velocity: Vector3 | undefined;
  try {
    velocity = entity.getVelocity();
  } catch {
    velocity = undefined;
  }

  // Remove first, then spawn: the raw stack can never exist next to its smelted copy.
  entity.remove();
  const spawned: Entity[] = [];
  try {
    for (const s of result.stacks) spawned.push(dimension.spawnItem(s, at));
  } catch {
    // Spawning can only fail if the location stopped being valid. Put the original back rather than lose it.
    for (const e of spawned) {
      try {
        e.remove();
      } catch {
        // already gone
      }
    }
    try {
      markOwnSpawn(dimension.spawnItem(stack, at));
    } catch {
      // nothing more can be done in an invalid location
    }
    return;
  }
  for (const e of spawned) {
    markOwnSpawn(e);
    if (velocity) {
      try {
        e.clearVelocity();
        e.applyImpulse(velocity);
      } catch {
        // motion is cosmetic
      }
    }
  }
  spawnOrbs(dimension, at, wholeXpFromTenths(result.xpTenths, Math.random));
}

export function forgetAllCaptures(): void {
  captures.clear();
}
