/**
 * The vein mining loop, written against a tiny world interface so it can be tested without the game.
 *
 * For every block, in this order:
 *  1. check the block is still an ore of the vein (a stale position is skipped, never mined);
 *  2. roll durability; if the roll would take the tool's last point, stop before touching the block;
 *  3. ask the engine for the drops with the live tool (Fortune, Silk Touch and tool tier come from the
 *     engine); if the tool cannot harvest the block, stop;
 *  4. remove the block; if that fails, stop and keep no drops for it;
 *  5. only then record the drops, the XP and the durability cost.
 *
 * Nothing is recorded for a block that is still in the world, and every removed block has its drops
 * recorded, so blocks and items can be neither duplicated nor lost.
 */

import { rollsDamage, wouldBreak, type Rng, type Wear } from './durability';
import type { Pos } from './vein';
import { randomInt } from './xp';

export interface JobWorld<S> {
  /** Current block id, or undefined when it cannot be read (unloaded chunk, outside the world). */
  typeAt(p: Pos): string | undefined;
  /** Engine drops for the block mined with the job's tool. undefined: the tool cannot harvest it. May throw. */
  loot(p: Pos): S[] | undefined;
  /** Replaces the block with air. false: the block could not be changed. */
  clear(p: Pos): boolean;
}

export interface JobSpec {
  readonly targets: readonly Pos[];
  /** Block ids that belong to the vein. */
  readonly family: ReadonlySet<string>;
  readonly wear: Wear;
  /** False in Creative and when the doTileDrops game rule is off. */
  readonly collectDrops: boolean;
  /** Mining XP per block, or undefined for none (Silk Touch, Creative, doTileDrops off). */
  readonly miningXp: readonly [number, number] | undefined;
}

export type StopReason = 'complete' | 'durability' | 'harvest' | 'error';

export interface MinedBlock {
  readonly pos: Pos;
  readonly type: string;
}

export interface JobOutcome<S> {
  readonly mined: MinedBlock[];
  readonly drops: S[];
  /** Mining XP of each mined block, in mining order (vanilla drops XP per block). */
  readonly xp: number[];
  /** Durability points the tool must take. */
  readonly damage: number;
  readonly stop: StopReason;
  /** Targets that were no longer ore when reached. */
  readonly skipped: number;
}

export function runJob<S>(spec: JobSpec, world: JobWorld<S>, rng: Rng): JobOutcome<S> {
  const mined: MinedBlock[] = [];
  const drops: S[] = [];
  const xp: number[] = [];
  let damage = 0;
  let skipped = 0;
  let stop: StopReason = 'complete';

  for (const target of spec.targets) {
    const type = world.typeAt(target);
    if (type === undefined || !spec.family.has(type)) {
      skipped++;
      continue;
    }

    const costsDurability = rollsDamage(spec.wear, rng);
    if (costsDurability && wouldBreak(spec.wear.damage + damage, spec.wear.maxDurability)) {
      stop = 'durability';
      break;
    }

    let blockDrops: S[] = [];
    if (spec.collectDrops) {
      let generated: S[] | undefined;
      try {
        generated = world.loot(target);
      } catch {
        stop = 'error';
        break;
      }
      if (generated === undefined) {
        stop = 'harvest';
        break;
      }
      blockDrops = generated;
    }

    let removed = false;
    try {
      removed = world.clear(target);
    } catch {
      removed = false;
    }
    if (!removed) {
      stop = 'error';
      break;
    }

    mined.push({ pos: target, type });
    for (const d of blockDrops) drops.push(d);
    if (costsDurability) damage++;
    xp.push(spec.miningXp ? randomInt(spec.miningXp[0], spec.miningXp[1], rng) : 0);
  }

  return { mined, drops, xp, damage, stop, skipped };
}
