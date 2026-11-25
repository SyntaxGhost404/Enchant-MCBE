/**
 * Which blocks belong to a vein. Pure: the caller supplies a membership test, so this runs the same in
 * the game and in unit tests.
 *
 * Connection rule: two ore blocks of the same family are connected when they touch by a face, an edge or
 * a corner (the 26 blocks around a block). That covers same-level diagonals, vertical diagonals and
 * branching veins. Regular, deepslate and lit redstone variants are one family; anything else stops the
 * search, so stone, air and other ores are never crossed.
 */

export interface Pos {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function offsets(): Pos[] {
  const faces: Pos[] = [];
  const edges: Pos[] = [];
  const corners: Pos[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const n = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        if (n === 1) faces.push({ x: dx, y: dy, z: dz });
        else if (n === 2) edges.push({ x: dx, y: dy, z: dz });
        else if (n === 3) corners.push({ x: dx, y: dy, z: dz });
      }
  // Faces first, then edges, then corners: the nearest blocks are reached first, so a capped vein grows
  // outward evenly instead of following one diagonal.
  return [...faces, ...edges, ...corners];
}

/** The 26 neighbours, ordered faces, edges, corners. */
export const NEIGHBOURS: readonly Pos[] = offsets();

export const posKey = (p: Pos): string => `${p.x},${p.y},${p.z}`;

export interface VeinOptions {
  /** Most blocks to return, not counting the origin. */
  readonly maxBlocks: number;
  /** Largest distance on any axis from the origin. Keeps the search near the miner and in loaded chunks. */
  readonly radius: number;
}

/**
 * Breadth-first search from the block the player broke.
 *
 * @param origin the block the player broke (already gone; it is never returned)
 * @param isMember true when the position holds a block of the vein's family that may be mined
 * @param mayBreak optional extra test: blocks that fail it still connect the vein but are not returned
 *   (for example the block another player stands on)
 * @returns positions in the order they should be mined, nearest first, at most maxBlocks long
 */
export function findVein(
  origin: Pos,
  isMember: (p: Pos) => boolean,
  options: VeinOptions,
  mayBreak: (p: Pos) => boolean = () => true
): Pos[] {
  const result: Pos[] = [];
  const max = Math.max(0, Math.floor(options.maxBlocks));
  if (max === 0) return result;
  const seen = new Set<string>([posKey(origin)]);
  const queue: Pos[] = [origin];
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head]!;
    for (const d of NEIGHBOURS) {
      const p = { x: at.x + d.x, y: at.y + d.y, z: at.z + d.z };
      const key = posKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      if (
        Math.abs(p.x - origin.x) > options.radius ||
        Math.abs(p.y - origin.y) > options.radius ||
        Math.abs(p.z - origin.z) > options.radius
      )
        continue;
      if (!isMember(p)) continue;
      queue.push(p);
      if (mayBreak(p)) {
        result.push(p);
        if (result.length >= max) return result;
      }
    }
  }
  return result;
}

/** Vein size limit from the pack setting: whole number, clamped, default when missing or invalid. */
export function clampVeinLimit(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
