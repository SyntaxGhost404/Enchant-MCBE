/**
 * Item stack arithmetic: merging drops into full stacks and smelting ore drops. Works through a small
 * adapter so it can be tested with plain objects.
 */

import { SMELTING } from './ores';

export interface StackOps<S> {
  typeId(s: S): string;
  amount(s: S): number;
  setAmount(s: S, amount: number): void;
  maxAmount(s: S): number;
  /** True when the two stacks can merge without losing any data (same item, same components). */
  stackable(a: S, b: S): boolean;
  clone(s: S): S;
  /** A new plain stack of one item. */
  make(typeId: string): S;
}

/** Merges stacks of the same item, never above each item's own stack limit, keeping every item. */
export function mergeStacks<S>(stacks: readonly S[], ops: StackOps<S>): S[] {
  const out: S[] = [];
  for (const s of stacks) {
    let left = ops.amount(s);
    for (const o of out) {
      if (left <= 0) break;
      if (!ops.stackable(o, s)) continue;
      const space = ops.maxAmount(o) - ops.amount(o);
      if (space <= 0) continue;
      const move = Math.min(space, left);
      ops.setAmount(o, ops.amount(o) + move);
      left -= move;
    }
    while (left > 0) {
      const c = ops.clone(s);
      const n = Math.min(left, Math.max(1, ops.maxAmount(c)));
      ops.setAmount(c, n);
      out.push(c);
      left -= n;
    }
  }
  return out;
}

/** Splits a count of one item into stacks no larger than its stack limit. */
export function makeStacks<S>(typeId: string, count: number, ops: StackOps<S>): S[] {
  const out: S[] = [];
  if (count <= 0) return out;
  const proto = ops.make(typeId);
  const max = Math.max(1, ops.maxAmount(proto));
  let left = Math.floor(count);
  while (left > 0) {
    const c = ops.clone(proto);
    const n = Math.min(left, max);
    ops.setAmount(c, n);
    out.push(c);
    left -= n;
  }
  return out;
}

export interface SmeltResult<S> {
  readonly stacks: S[];
  /** Furnace XP for everything smelted, in tenths of a point. */
  readonly xpTenths: number;
  /** Number of items smelted. */
  readonly smelted: number;
}

/**
 * Replaces each smeltable stack with the same number of smelted items (3 raw iron become 3 iron ingots,
 * so Fortune carries over exactly). Other stacks are kept as they are.
 */
export function smeltStacks<S>(stacks: readonly S[], ops: StackOps<S>): SmeltResult<S> {
  const kept: S[] = [];
  const counts = new Map<string, number>();
  let xpTenths = 0;
  let smelted = 0;
  for (const s of stacks) {
    const recipe = SMELTING.get(ops.typeId(s));
    if (!recipe) {
      kept.push(s);
      continue;
    }
    const n = ops.amount(s);
    counts.set(recipe.output, (counts.get(recipe.output) ?? 0) + n);
    xpTenths += recipe.xpTenths * n;
    smelted += n;
  }
  const made: S[] = [];
  for (const [output, n] of counts) made.push(...makeStacks(output, n, ops));
  return { stacks: [...kept, ...made], xpTenths, smelted };
}
