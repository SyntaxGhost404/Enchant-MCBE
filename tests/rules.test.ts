import { describe, expect, it } from 'vitest';
import { ANVILS, bookApplyCost, damagedAnvil, priorWorkPenalty, TOO_EXPENSIVE } from '../src/rules/anvil';
import { damageProbability, rollsDamage, wouldBreak, type Wear } from '../src/rules/durability';
import { ENCHANTMENTS, ORE_SMELTER, VEIN_MINER, enchantmentOfBook, isOurLoreLine, storedLevel } from '../src/rules/enchantments';
import { decodeNote, encodeNote, looksGround } from '../src/rules/grindstone';
import { runJob, type JobWorld } from '../src/rules/job';
import { ORE_BLOCKS, ORE_FAMILIES, SMELTABLE_ORES, SMELTING, breakSound, familyOf } from '../src/rules/ores';
import { makeStacks, mergeStacks, smeltStacks, type StackOps } from '../src/rules/stacks';
import { NEIGHBOURS, clampVeinLimit, findVein, posKey, type Pos } from '../src/rules/vein';
import { ORB_VALUES, randomInt, splitIntoOrbs, wholeXpFromTenths } from '../src/rules/xp';

/** Deterministic random numbers (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const always = (v: number) => () => v;

describe('ore data', () => {
  it('covers every vanilla ore, with deepslate and lit variants in one family', () => {
    const expected = [
      'coal_ore', 'deepslate_coal_ore', 'iron_ore', 'deepslate_iron_ore', 'copper_ore', 'deepslate_copper_ore',
      'gold_ore', 'deepslate_gold_ore', 'redstone_ore', 'lit_redstone_ore', 'deepslate_redstone_ore',
      'lit_deepslate_redstone_ore', 'lapis_ore', 'deepslate_lapis_ore', 'diamond_ore', 'deepslate_diamond_ore',
      'emerald_ore', 'deepslate_emerald_ore', 'quartz_ore', 'nether_gold_ore', 'ancient_debris'
    ].map((b) => `minecraft:${b}`);
    expect([...ORE_BLOCKS].sort()).toEqual(expected.sort());
    expect(familyOf('minecraft:lit_deepslate_redstone_ore')).toBe(familyOf('minecraft:redstone_ore'));
    expect(familyOf('minecraft:deepslate_iron_ore')).toBe(familyOf('minecraft:iron_ore'));
    expect(familyOf('minecraft:nether_gold_ore')).not.toBe(familyOf('minecraft:gold_ore'));
    expect(familyOf('minecraft:stone')).toBeUndefined();
    // each block belongs to exactly one family
    expect(ORE_FAMILIES.flatMap((f) => f.blocks).length).toBe(ORE_BLOCKS.size);
  });

  it('uses the vanilla XP ranges and none for metal ores', () => {
    const xp = (b: string) => familyOf(`minecraft:${b}`)!.xp;
    expect(xp('coal_ore')).toEqual([0, 2]);
    expect(xp('diamond_ore')).toEqual([3, 7]);
    expect(xp('emerald_ore')).toEqual([3, 7]);
    expect(xp('lapis_ore')).toEqual([2, 5]);
    expect(xp('quartz_ore')).toEqual([2, 5]);
    expect(xp('redstone_ore')).toEqual([1, 5]);
    expect(xp('nether_gold_ore')).toEqual([0, 1]);
    for (const b of ['iron_ore', 'copper_ore', 'gold_ore', 'ancient_debris']) expect(xp(b)).toEqual([0, 0]);
  });

  it('smelts the four ore drops a furnace would, with furnace XP', () => {
    expect([...SMELTING].map(([from, r]) => [from, r.output, r.xpTenths / 10])).toEqual([
      ['minecraft:raw_iron', 'minecraft:iron_ingot', 0.7],
      ['minecraft:raw_copper', 'minecraft:copper_ingot', 0.7],
      ['minecraft:raw_gold', 'minecraft:gold_ingot', 1],
      ['minecraft:ancient_debris', 'minecraft:netherite_scrap', 2]
    ]);
    for (const b of SMELTABLE_ORES) expect(ORE_BLOCKS.has(b)).toBe(true);
    expect(SMELTABLE_ORES.has('minecraft:nether_gold_ore')).toBe(false);
  });

  it('plays the vanilla break sound for each kind', () => {
    expect(breakSound('minecraft:iron_ore')).toBe('dig.stone');
    expect(breakSound('minecraft:deepslate_diamond_ore')).toBe('dig.deepslate');
    expect(breakSound('minecraft:quartz_ore')).toBe('dig.nether_gold_ore');
    expect(breakSound('minecraft:ancient_debris')).toBe('dig.ancient_debris');
  });
});

describe('vein search', () => {
  const world = (cells: Pos[]) => {
    const set = new Set(cells.map(posKey));
    return (p: Pos) => set.has(posKey(p));
  };
  const O: Pos = { x: 0, y: 0, z: 0 };

  it('has 26 neighbours: faces first, then edges, then corners', () => {
    expect(NEIGHBOURS).toHaveLength(26);
    const sums = NEIGHBOURS.map((d) => Math.abs(d.x) + Math.abs(d.y) + Math.abs(d.z));
    expect(sums).toEqual([...sums].sort((a, b) => a - b));
    expect(new Set(NEIGHBOURS.map(posKey)).size).toBe(26);
  });

  it('connects by face, edge and corner, including vertical diagonals', () => {
    const cells = [
      { x: 1, y: 0, z: 0 }, // face
      { x: 2, y: 1, z: 0 }, // edge of the first
      { x: 3, y: 2, z: 1 }, // corner of the second
      { x: 3, y: 3, z: 2 } // vertical-diagonal corner
    ];
    expect(findVein(O, world(cells), { maxBlocks: 100, radius: 16 })).toEqual(cells);
  });

  it('never crosses a gap of one block', () => {
    const cells = [{ x: 1, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }];
    expect(findVein(O, world(cells), { maxBlocks: 100, radius: 16 })).toEqual([{ x: 1, y: 0, z: 0 }]);
  });

  it('follows branches and returns the nearest blocks first', () => {
    const cells: Pos[] = [];
    for (let i = 1; i <= 5; i++) cells.push({ x: i, y: 0, z: 0 }, { x: -i, y: 0, z: 0 }, { x: 0, y: i, z: 0 });
    const got = findVein(O, world(cells), { maxBlocks: 100, radius: 16 });
    expect(got).toHaveLength(15);
    const dist = got.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)));
    expect(dist).toEqual([...dist].sort((a, b) => a - b));
  });

  it('stops at the limit exactly (the first block counts as one)', () => {
    const cells: Pos[] = [];
    for (let i = 1; i <= 200; i++) cells.push({ x: i, y: 0, z: 0 });
    const limit = 64;
    expect(findVein(O, world(cells), { maxBlocks: limit - 1, radius: 1000 })).toHaveLength(63);
    expect(findVein(O, world(cells.slice(0, 63)), { maxBlocks: limit - 1, radius: 1000 })).toHaveLength(63);
    expect(findVein(O, world(cells.slice(0, 62)), { maxBlocks: limit - 1, radius: 1000 })).toHaveLength(62);
    expect(findVein(O, world(cells), { maxBlocks: 0, radius: 1000 })).toHaveLength(0);
  });

  it('stays inside the radius on every axis', () => {
    const cells: Pos[] = [];
    for (let i = 1; i <= 40; i++) cells.push({ x: 0, y: -i, z: 0 });
    const got = findVein(O, world(cells), { maxBlocks: 100, radius: 16 });
    expect(got).toHaveLength(16);
    expect(Math.min(...got.map((p) => p.y))).toBe(-16);
  });

  it('keeps excluded blocks in the vein without returning them', () => {
    const cells = [{ x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }];
    const got = findVein(O, world(cells), { maxBlocks: 100, radius: 16 }, (p) => p.x !== 2);
    expect(got).toEqual([{ x: 1, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }]);
  });

  it('reads each position at most once, so a huge vein stays cheap', () => {
    let reads = 0;
    const seen = new Set<string>();
    const isMember = (p: Pos) => {
      reads++;
      const k = posKey(p);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
      return true; // a solid cube of ore in every direction
    };
    const got = findVein(O, isMember, { maxBlocks: 127, radius: 16 });
    expect(got).toHaveLength(127);
    expect(reads).toBeLessThan(127 * 26);
  });

  it('reads the limit setting safely', () => {
    expect(clampVeinLimit(undefined, 8, 128, 64)).toBe(64);
    expect(clampVeinLimit('x', 8, 128, 64)).toBe(64);
    expect(clampVeinLimit(32, 8, 128, 64)).toBe(32);
    expect(clampVeinLimit(31.6, 8, 128, 64)).toBe(32);
    expect(clampVeinLimit(1000, 8, 128, 64)).toBe(128);
    expect(clampVeinLimit(-5, 8, 128, 64)).toBe(8);
    expect(clampVeinLimit(Number.NaN, 8, 128, 64)).toBe(64);
  });
});

describe('durability', () => {
  const wear = (over: Partial<Wear> = {}): Wear => ({
    damage: 0,
    maxDurability: 250,
    unbreakable: false,
    unbreaking: 0,
    chance: { min: 100, max: 100 },
    ...over
  });

  it('follows the vanilla Unbreaking formula for tools, any level', () => {
    expect(damageProbability(100, 0)).toBe(1);
    expect(damageProbability(100, 1)).toBe(0.5);
    expect(damageProbability(100, 2)).toBeCloseTo(1 / 3);
    expect(damageProbability(100, 3)).toBe(0.25);
    expect(damageProbability(100, 9)).toBe(0.1);
    expect(damageProbability(100, -2)).toBe(1);
  });

  it('matches the expected rate over many blocks', () => {
    const rng = seeded(7);
    for (const level of [0, 1, 2, 3, 5]) {
      let hits = 0;
      const n = 40000;
      for (let i = 0; i < n; i++) if (rollsDamage(wear({ unbreaking: level }), rng)) hits++;
      expect(hits / n).toBeCloseTo(1 / (level + 1), 1);
    }
  });

  it('never charges an unbreakable tool', () => {
    expect(rollsDamage(wear({ unbreakable: true }), always(0))).toBe(false);
  });

  it('treats damage equal to max durability as the last usable point', () => {
    expect(wouldBreak(249, 250)).toBe(false);
    expect(wouldBreak(250, 250)).toBe(true);
  });
});

describe('experience', () => {
  it('splits totals into vanilla orb values without losing points', () => {
    for (const total of [0, 1, 2, 5, 7, 16, 17, 100, 1000, 5000]) {
      const orbs = splitIntoOrbs(total);
      expect(orbs.reduce((a, b) => a + b, 0)).toBe(total);
      for (const o of orbs) expect(ORB_VALUES).toContain(o);
    }
    expect(splitIntoOrbs(1000)).toEqual([617, 307, 73, 3]);
  });

  it('rounds furnace XP the vanilla way, exact on average', () => {
    expect(wholeXpFromTenths(20, always(0))).toBe(2);
    expect(wholeXpFromTenths(21, always(0.05))).toBe(3);
    expect(wholeXpFromTenths(21, always(0.5))).toBe(2);
    const rng = seeded(3);
    let sum = 0;
    for (let i = 0; i < 20000; i++) sum += wholeXpFromTenths(7, rng);
    expect(sum / 20000).toBeCloseTo(0.7, 1);
  });

  it('draws whole numbers inside the range', () => {
    const rng = seeded(11);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(randomInt(3, 7, rng));
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });
});

interface S {
  id: string;
  n: number;
  max: number;
  tag?: string;
}
const ops: StackOps<S> = {
  typeId: (s) => s.id,
  amount: (s) => s.n,
  setAmount: (s, n) => {
    if (n < 1 || n > s.max) throw new Error('bad amount');
    s.n = n;
  },
  maxAmount: (s) => s.max,
  stackable: (a, b) => a.id === b.id && a.tag === b.tag && a.max > 1,
  clone: (s) => ({ ...s }),
  make: (id) => ({ id, n: 1, max: 64 })
};
const total = (list: S[], id: string) => list.filter((s) => s.id === id).reduce((a, s) => a + s.n, 0);

describe('stacks', () => {
  it('merges without passing the stack limit or losing items', () => {
    const input: S[] = Array.from({ length: 30 }, () => ({ id: 'minecraft:raw_iron', n: 5, max: 64 }));
    const out = mergeStacks(input, ops);
    expect(total(out, 'minecraft:raw_iron')).toBe(150);
    expect(out.map((s) => s.n)).toEqual([64, 64, 22]);
  });

  it('keeps items with different data apart', () => {
    const out = mergeStacks([{ id: 'a', n: 2, max: 64 }, { id: 'a', n: 2, max: 64, tag: 'named' }], ops);
    expect(out).toHaveLength(2);
  });

  it('smelts each raw item into exactly one smelted item (Fortune carries over)', () => {
    const drops: S[] = [
      { id: 'minecraft:raw_iron', n: 4, max: 64 },
      { id: 'minecraft:raw_iron', n: 3, max: 64 },
      { id: 'minecraft:raw_copper', n: 61, max: 64 },
      { id: 'minecraft:raw_copper', n: 40, max: 64 },
      { id: 'minecraft:diamond', n: 2, max: 64 }
    ];
    const r = smeltStacks(drops, ops);
    expect(total(r.stacks, 'minecraft:iron_ingot')).toBe(7);
    expect(total(r.stacks, 'minecraft:copper_ingot')).toBe(101);
    expect(total(r.stacks, 'minecraft:diamond')).toBe(2);
    expect(total(r.stacks, 'minecraft:raw_iron') + total(r.stacks, 'minecraft:raw_copper')).toBe(0);
    for (const s of r.stacks) expect(s.n).toBeLessThanOrEqual(s.max);
    expect(r.smelted).toBe(108);
    expect(r.xpTenths).toBe(7 * 7 + 101 * 7);
  });

  it('splits counts into legal stacks', () => {
    expect(makeStacks('x', 130, ops).map((s) => s.n)).toEqual([64, 64, 2]);
    expect(makeStacks('x', 0, ops)).toEqual([]);
  });
});

describe('vein job', () => {
  const targets: Pos[] = [1, 2, 3, 4, 5].map((x) => ({ x, y: 0, z: 0 }));
  const family = new Set(['minecraft:iron_ore', 'minecraft:deepslate_iron_ore']);
  const baseWear: Wear = { damage: 0, maxDurability: 250, unbreakable: false, unbreaking: 0, chance: { min: 100, max: 100 } };

  function fakeWorld(over: Partial<JobWorld<string>> = {}) {
    const blocks = new Map(targets.map((p) => [posKey(p), 'minecraft:iron_ore']));
    const log: string[] = [];
    const w: JobWorld<string> = {
      typeAt: (p) => blocks.get(posKey(p)),
      loot: (p) => [`raw@${posKey(p)}`],
      clear: (p) => {
        log.push(posKey(p));
        blocks.set(posKey(p), 'minecraft:air');
        return true;
      },
      ...over
    };
    return { w, blocks, log };
  }

  it('mines every block once, with its drops, and charges one point each', () => {
    const { w, blocks } = fakeWorld();
    const r = runJob({ targets, family, wear: baseWear, collectDrops: true, miningXp: undefined }, w, always(0.99));
    expect(r.stop).toBe('complete');
    expect(r.mined).toHaveLength(5);
    expect(r.drops).toEqual(targets.map((p) => `raw@${posKey(p)}`));
    expect(r.damage).toBe(5);
    expect([...blocks.values()].every((t) => t === 'minecraft:air')).toBe(true);
    expect(r.xp).toEqual([0, 0, 0, 0, 0]);
  });

  it('stops before the block that would break the tool and leaves it in place', () => {
    const { w, blocks } = fakeWorld();
    const r = runJob(
      { targets, family, wear: { ...baseWear, damage: 247, maxDurability: 250 }, collectDrops: true, miningXp: undefined },
      w,
      always(0)
    );
    // 247 -> 248 -> 249 -> 250 is allowed (250 is the last usable point); the 4th block would break it
    expect(r.mined).toHaveLength(3);
    expect(r.damage).toBe(3);
    expect(r.stop).toBe('durability');
    expect(blocks.get('4,0,0')).toBe('minecraft:iron_ore');
    expect(r.drops).toHaveLength(3);
  });

  it('keeps mining for free when Unbreaking skips the cost, even at the last point', () => {
    const { w } = fakeWorld();
    const r = runJob(
      { targets, family, wear: { ...baseWear, damage: 250, unbreaking: 3 }, collectDrops: true, miningXp: undefined },
      w,
      always(0.99)
    );
    expect(r.mined).toHaveLength(5);
    expect(r.damage).toBe(0);
  });

  it('never charges an unbreakable tool and never stops for durability', () => {
    const { w } = fakeWorld();
    const r = runJob(
      { targets, family, wear: { ...baseWear, damage: 250, unbreakable: true }, collectDrops: true, miningXp: undefined },
      w,
      always(0)
    );
    expect(r.mined).toHaveLength(5);
    expect(r.damage).toBe(0);
  });

  it('stops without touching the block when the tool cannot harvest it', () => {
    const { w, blocks } = fakeWorld({ loot: (p) => (p.x === 3 ? undefined : ['raw']) });
    const r = runJob({ targets, family, wear: baseWear, collectDrops: true, miningXp: undefined }, w, always(0.99));
    expect(r.stop).toBe('harvest');
    expect(r.mined).toHaveLength(2);
    expect(blocks.get('3,0,0')).toBe('minecraft:iron_ore');
  });

  it('keeps the block and gives nothing when loot generation fails', () => {
    const { w, blocks } = fakeWorld({
      loot: (p) => {
        if (p.x === 2) throw new Error('unloaded');
        return ['raw'];
      }
    });
    const r = runJob({ targets, family, wear: baseWear, collectDrops: true, miningXp: undefined }, w, always(0.99));
    expect(r.stop).toBe('error');
    expect(r.mined).toHaveLength(1);
    expect(r.drops).toHaveLength(1);
    expect(blocks.get('2,0,0')).toBe('minecraft:iron_ore');
  });

  it('records no drops for a block that could not be removed', () => {
    const { w } = fakeWorld({ clear: (p) => p.x !== 2 });
    const r = runJob({ targets, family, wear: baseWear, collectDrops: true, miningXp: undefined }, w, always(0.99));
    expect(r.stop).toBe('error');
    expect(r.mined.map((m) => m.pos.x)).toEqual([1]);
    expect(r.drops).toHaveLength(1);
    expect(r.damage).toBe(1);
  });

  it('skips blocks that changed since the search', () => {
    const { w, blocks } = fakeWorld();
    blocks.set('2,0,0', 'minecraft:stone');
    blocks.set('4,0,0', 'minecraft:diamond_ore');
    const r = runJob({ targets, family, wear: baseWear, collectDrops: true, miningXp: undefined }, w, always(0.99));
    expect(r.mined.map((m) => m.pos.x)).toEqual([1, 3, 5]);
    expect(r.skipped).toBe(2);
    expect(blocks.get('4,0,0')).toBe('minecraft:diamond_ore');
  });

  it('gives mining XP per block inside the range, and none without drops', () => {
    const { w } = fakeWorld();
    const r = runJob({ targets, family, wear: baseWear, collectDrops: true, miningXp: [3, 7] }, w, seeded(5));
    expect(r.xp).toHaveLength(5);
    for (const x of r.xp) expect(x >= 3 && x <= 7).toBe(true);
    let calls = 0;
    const second = fakeWorld({
      loot: () => {
        calls++;
        return ['raw'];
      }
    });
    const r2 = runJob({ targets, family, wear: baseWear, collectDrops: false, miningXp: undefined }, second.w, always(0.99));
    expect(r2.mined).toHaveLength(5);
    expect(r2.drops).toHaveLength(0);
    expect(calls).toBe(0);
  });
});

describe('anvil rules', () => {
  it('uses the vanilla prior work penalty', () => {
    expect([0, 1, 2, 3, 4, 5].map(priorWorkPenalty)).toEqual([0, 1, 3, 7, 15, 31]);
    expect(priorWorkPenalty(Number.NaN)).toBe(0);
  });

  it('prices the books like Silk Touch and Fortune books', () => {
    expect(bookApplyCost(VEIN_MINER.bookMultiplier, 0, 1, 0)).toBe(4);
    expect(bookApplyCost(ORE_SMELTER.bookMultiplier, 0, 1, 0)).toBe(2);
    expect(bookApplyCost(ORE_SMELTER.bookMultiplier, 0, 1, 1)).toBe(3);
    expect(bookApplyCost(VEIN_MINER.bookMultiplier, 0, 1, 1)).toBe(5);
    expect(bookApplyCost(VEIN_MINER.bookMultiplier, 0, 1, 6)).toBeGreaterThanOrEqual(TOO_EXPENSIVE);
  });

  it('wears an anvil one stage at a time until it breaks', () => {
    expect(ANVILS).toEqual(['minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil']);
    expect(damagedAnvil('minecraft:anvil')).toBe('minecraft:chipped_anvil');
    expect(damagedAnvil('minecraft:chipped_anvil')).toBe('minecraft:damaged_anvil');
    expect(damagedAnvil('minecraft:damaged_anvil')).toBeUndefined();
  });
});

describe('grindstone rules', () => {
  it('round-trips the wear note', () => {
    expect(decodeNote(encodeNote(12, { damage: 40, nonCurse: 2 }))).toEqual({ session: 12, note: { damage: 40, nonCurse: 2 } });
    expect(decodeNote('junk')).toBeUndefined();
    expect(decodeNote(undefined)).toBeUndefined();
  });

  it('recognises a grindstone result and nothing else', () => {
    const before = { damage: 100, nonCurse: 2 };
    expect(looksGround(before, { damage: 100, nonCurse: 0 })).toBe(true); // enchantments removed
    expect(looksGround(before, { damage: 100, nonCurse: 2 })).toBe(false); // came back unchanged
    expect(looksGround(before, { damage: 60, nonCurse: 2 })).toBe(false); // Mending repaired it
    expect(looksGround({ damage: 100, nonCurse: 0 }, { damage: 20, nonCurse: 0 })).toBe(true); // repaired by combining
    expect(looksGround({ damage: 100, nonCurse: 0 }, { damage: 120, nonCurse: 0 })).toBe(false); // used, not ground
    expect(looksGround({ damage: 100, nonCurse: 0 }, { damage: 100, nonCurse: 0 })).toBe(false);
  });
});

describe('enchantment records', () => {
  it('reads levels defensively', () => {
    expect(storedLevel(1, 1)).toBe(1);
    expect(storedLevel(7, 1)).toBe(1);
    expect(storedLevel(true, 1)).toBe(1);
    expect(storedLevel(0, 1)).toBe(0);
    expect(storedLevel('1', 1)).toBe(0);
    expect(storedLevel(Number.NaN, 1)).toBe(0);
  });

  it('recognises its lore lines in both forms only', () => {
    expect(isOurLoreLine(VEIN_MINER, JSON.stringify({ translate: 'vmos.lore.vein_miner' }), undefined)).toBe(true);
    expect(isOurLoreLine(VEIN_MINER, undefined, '§r§7Vein Miner')).toBe(true);
    expect(isOurLoreLine(VEIN_MINER, undefined, 'Vein Miner')).toBe(false);
    expect(isOurLoreLine(VEIN_MINER, undefined, '§r§7Vein Miner I')).toBe(false);
    expect(isOurLoreLine(ORE_SMELTER, JSON.stringify({ translate: 'vmos.lore.vein_miner' }), undefined)).toBe(false);
  });

  it('maps each book to its enchantment', () => {
    for (const e of ENCHANTMENTS) expect(enchantmentOfBook(e.book)).toBe(e);
    expect(enchantmentOfBook('minecraft:enchanted_book')).toBeUndefined();
  });
});
