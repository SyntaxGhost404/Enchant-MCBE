import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Entity, GameMode, ItemStack, Player, state } from './fake/server';
import { held, pickaxe, place, setup, totals, vanillaBreak } from './helpers';
import { onBlockBroken } from '../src/game/vein-miner';
import { noteBreakForSmelting, onEntitySpawn, forgetAllCaptures } from '../src/game/smelter';
import { customLevels } from '../src/game/items';

type AnyEvent = Parameters<typeof onBlockBroken>[0];
const run = (e: unknown) => onBlockBroken(e as AnyEvent);
const line = (n: number, y = 10, from = 1) => Array.from({ length: n }, (_, i) => ({ x: from + i, y, z: 0 }));
const O = { x: 0, y: 10, z: 0 };

let random: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  forgetAllCaptures();
});
afterEach(() => random.mockRestore());

describe('Vein Miner', () => {
  it('mines the connected vein, regular and deepslate together, and nothing else', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(4), 'minecraft:iron_ore');
    place(dim, line(4, 11), 'minecraft:deepslate_iron_ore'); // above, touching by face and edge
    dim.set({ x: 5, y: 10, z: 0 }, 'minecraft:diamond_ore'); // another ore at the end of the line
    dim.set({ x: 7, y: 10, z: 0 }, 'minecraft:iron_ore'); // same ore, but not connected
    const tool = pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] });
    run(vanillaBreak(dim, player, O, tool));

    for (const c of [...line(4), ...line(4, 11)]) expect(dim.typeAt(c)).toBe('minecraft:air');
    expect(dim.typeAt({ x: 5, y: 10, z: 0 })).toBe('minecraft:diamond_ore');
    expect(dim.typeAt({ x: 7, y: 10, z: 0 })).toBe('minecraft:iron_ore');
    // one raw iron per extra block (the first block's drop is vanilla's own)
    expect(totals(dim)).toEqual({ 'minecraft:raw_iron': 8 });
    for (const e of dim.items()) expect(e.location).toEqual({ x: 0.5, y: 10.5, z: 0.5 });
    // 1 point from vanilla for the first block, 1 per extra block
    expect(held(player).durability!.damage).toBe(9);
    expect(dim.orbs()).toEqual([]); // iron ore gives no mining XP
  });

  it('connects lit and unlit redstone, regular and deepslate', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:lit_redstone_ore');
    const ids = ['minecraft:redstone_ore', 'minecraft:lit_redstone_ore', 'minecraft:deepslate_redstone_ore', 'minecraft:lit_deepslate_redstone_ore'];
    line(4).forEach((c, i) => dim.set(c, ids[i]!));
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] })));
    for (const c of line(4)) expect(dim.typeAt(c)).toBe('minecraft:air');
    expect(totals(dim)['minecraft:redstone']).toBe(16);
    const xp = dim.orbs().reduce((a, b) => a + b, 0);
    expect(xp).toBeGreaterThanOrEqual(4 * 1);
    expect(xp).toBeLessThanOrEqual(4 * 5);
  });

  it('does nothing while sneaking', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(3), 'minecraft:iron_ore');
    player.isSneaking = true;
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] })));
    for (const c of line(3)) expect(dim.typeAt(c)).toBe('minecraft:iron_ore');
    expect(dim.items()).toHaveLength(0);
  });

  it('does nothing without the enchantment', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(3), 'minecraft:iron_ore');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe')));
    for (const c of line(3)) expect(dim.typeAt(c)).toBe('minecraft:iron_ore');
  });

  it('respects the tool tier: a stone pickaxe leaves a diamond vein alone', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:diamond_ore');
    place(dim, line(3), 'minecraft:diamond_ore');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:stone_pickaxe', { custom: ['vein_miner'] })));
    for (const c of line(3)) expect(dim.typeAt(c)).toBe('minecraft:diamond_ore');
    expect(dim.items()).toHaveLength(0);
    expect(held(player).durability!.damage).toBe(1);
  });

  it('stops when the pickaxe broke on the first block', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(3), 'minecraft:iron_ore');
    const event = vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] }));
    event.itemStackAfterBreak = undefined;
    player.inventory.setItem(0, undefined);
    run(event);
    for (const c of line(3)) expect(dim.typeAt(c)).toBe('minecraft:iron_ore');
  });

  it('never writes to an item that is not the one that broke the block', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(3), 'minecraft:iron_ore');
    const event = vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] }));
    const other = pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'], damage: 40 });
    player.inventory.setItem(0, other);
    run(event);
    for (const c of line(3)) expect(dim.typeAt(c)).toBe('minecraft:iron_ore');
    expect(held(player).durability!.damage).toBe(40);
  });

  it('uses Fortune for every block, and Ore Smelter smelts exactly that many', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(5), 'minecraft:deepslate_iron_ore');
    const tool = pickaxe('minecraft:netherite_pickaxe', {
      custom: ['vein_miner', 'ore_smelter'],
      enchants: { fortune: 3, efficiency: 5, unbreaking: 3, mending: 1 }
    });
    random.mockReturnValue(0.99); // Unbreaking skips every cost; furnace fractions round down
    run(vanillaBreak(dim, player, O, tool, 0));
    expect(totals(dim)).toEqual({ 'minecraft:iron_ingot': 5 * 4 });
    expect(held(player).durability!.damage).toBe(0);
    // furnace XP: 20 ingots x 0.7 = 14 points
    expect(dim.orbs().reduce((a, b) => a + b, 0)).toBe(14);
  });

  it('lets Silk Touch win over Ore Smelter, with no mining XP', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:diamond_ore');
    place(dim, line(3), 'minecraft:deepslate_diamond_ore');
    const tool = pickaxe('minecraft:diamond_pickaxe', { custom: ['vein_miner', 'ore_smelter'], enchants: { silk_touch: 1 } });
    run(vanillaBreak(dim, player, O, tool));
    expect(totals(dim)).toEqual({ 'minecraft:deepslate_diamond_ore': 3 });
    expect(dim.orbs()).toEqual([]);
  });

  it('gives vanilla mining XP per block as separate orbs', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:diamond_ore');
    place(dim, line(6), 'minecraft:diamond_ore');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] })));
    const orbs = dim.orbs();
    const xp = orbs.reduce((a, b) => a + b, 0);
    expect(xp).toBeGreaterThanOrEqual(6 * 3);
    expect(xp).toBeLessThanOrEqual(6 * 7);
    expect(orbs.length).toBeGreaterThanOrEqual(6);
  });

  it('stops before the pickaxe would break and says so', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(6), 'minecraft:iron_ore');
    const tool = pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'], damage: 246 });
    run(vanillaBreak(dim, player, O, tool)); // vanilla: 246 -> 247
    // 247 -> 250 takes three more blocks; 250 is the last usable point
    expect(line(6).filter((c) => dim.typeAt(c) === 'minecraft:air')).toHaveLength(3);
    expect(held(player).durability!.damage).toBe(250);
    expect(totals(dim)['minecraft:raw_iron']).toBe(3);
    expect(JSON.stringify(player.actionBar)).toContain('vmos.notice.tool_low');
  });

  it('never charges an unbreakable pickaxe', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(6), 'minecraft:iron_ore');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'], unbreakable: true }), 0));
    expect(held(player).durability!.damage).toBe(0);
    expect(totals(dim)['minecraft:raw_iron']).toBe(6);
  });

  it('honours the vein size limit, counting the first block', () => {
    const { dim, player } = setup();
    state.packSettings['vmos:vein_limit'] = 8;
    dim.set(O, 'minecraft:coal_ore');
    place(dim, line(15), 'minecraft:coal_ore');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] })));
    expect(line(15).filter((c) => dim.typeAt(c) === 'minecraft:air')).toHaveLength(7);
    expect(dim.typeAt({ x: 8, y: 10, z: 0 })).toBe('minecraft:coal_ore');
  });

  it('defaults to 64 blocks', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:coal_ore');
    place(dim, line(16), 'minecraft:coal_ore');
    place(dim, line(16, 11), 'minecraft:coal_ore');
    place(dim, line(16, 12), 'minecraft:coal_ore');
    place(dim, line(16, 13), 'minecraft:coal_ore');
    place(dim, line(16, 14), 'minecraft:coal_ore');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] })));
    expect(totals(dim)['minecraft:coal']).toBe(63);
  });

  it('leaves the block under any player standing on the vein', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(5), 'minecraft:iron_ore');
    const friend = new Player(dim, 'p2');
    friend.location = { x: 3.5, y: 11, z: 0.5 }; // standing on (3, 10, 0)
    dim.players = [player, friend];
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] })));
    expect(dim.typeAt({ x: 3, y: 10, z: 0 })).toBe('minecraft:iron_ore');
    // the vein still continues past it
    expect(dim.typeAt({ x: 4, y: 10, z: 0 })).toBe('minecraft:air');
  });

  it('never reaches into unloaded chunks', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(6), 'minecraft:iron_ore');
    dim.unloaded.add('3,10,0');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] })));
    expect(dim.typeAt({ x: 2, y: 10, z: 0 })).toBe('minecraft:air');
    expect(dim.typeAt({ x: 4, y: 10, z: 0 })).toBe('minecraft:iron_ore');
  });

  it('in Creative breaks the vein like Creative breaks blocks: no drops, XP or wear', () => {
    const { dim, player } = setup();
    player.mode = GameMode.Creative;
    dim.set(O, 'minecraft:diamond_ore');
    place(dim, line(4), 'minecraft:diamond_ore');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:diamond_pickaxe', { custom: ['vein_miner'] }), 0));
    for (const c of line(4)) expect(dim.typeAt(c)).toBe('minecraft:air');
    expect(dim.items()).toHaveLength(0);
    expect(dim.orbs()).toHaveLength(0);
    expect(held(player).durability!.damage).toBe(0);
  });

  it('in Adventure mines only what the pickaxe may destroy', () => {
    const { dim, player } = setup();
    player.mode = GameMode.Adventure;
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(2), 'minecraft:iron_ore');
    place(dim, line(2, 10, 3), 'minecraft:deepslate_iron_ore');
    const tool = pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] });
    tool.canDestroy = ['iron_ore'];
    run(vanillaBreak(dim, player, O, tool));
    expect(dim.typeAt({ x: 2, y: 10, z: 0 })).toBe('minecraft:air');
    expect(dim.typeAt({ x: 3, y: 10, z: 0 })).toBe('minecraft:deepslate_iron_ore');
  });

  it('with doTileDrops off mines and wears the pickaxe but drops nothing', () => {
    const { dim, player } = setup();
    state.doTileDrops = false;
    dim.set(O, 'minecraft:coal_ore');
    place(dim, line(3), 'minecraft:coal_ore');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] })));
    for (const c of line(3)) expect(dim.typeAt(c)).toBe('minecraft:air');
    expect(dim.items()).toHaveLength(0);
    expect(dim.orbs()).toHaveLength(0);
    expect(held(player).durability!.damage).toBe(4);
  });

  it('adds vanilla mining exhaustion for each extra block', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:coal_ore');
    place(dim, line(10), 'minecraft:coal_ore');
    run(vanillaBreak(dim, player, O, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] })));
    expect(player.exhaustion.currentValue).toBeCloseTo(0.05);
  });

  it('keeps the custom name, lore and enchantments of the pickaxe', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    place(dim, line(3), 'minecraft:iron_ore');
    const tool = pickaxe('minecraft:iron_pickaxe', {
      custom: ['vein_miner', 'ore_smelter'],
      enchants: { efficiency: 4 },
      name: 'Old Faithful',
      lore: ['§aMade by a friend']
    });
    run(vanillaBreak(dim, player, O, tool));
    const after = held(player);
    expect(after.nameTag).toBe('Old Faithful');
    expect(after.enchants.get('efficiency')).toBe(4);
    expect([...customLevels(after).keys()]).toEqual(['vein_miner', 'ore_smelter']);
    expect(after.getLore()).toContain('§aMade by a friend');
  });

  it('two players on one vein never mine or drop a block twice', () => {
    const { dim, player } = setup();
    const p2 = new Player(dim, 'p2');
    dim.players = [player, p2];
    place(dim, line(9, 10, -4), 'minecraft:gold_ore');
    dim.set({ x: -5, y: 10, z: 0 }, 'minecraft:gold_ore');
    dim.set({ x: 5, y: 10, z: 0 }, 'minecraft:gold_ore');
    const tool = () => pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] });
    // both players break an end of the same vein in the same tick, then both after-events run
    const first = vanillaBreak(dim, player, { x: -5, y: 10, z: 0 }, tool());
    const second = vanillaBreak(dim, p2, { x: 5, y: 10, z: 0 }, tool());
    run(first);
    run(second);
    expect(totals(dim)['minecraft:raw_gold']).toBe(9);
    expect(held(player).durability!.damage + held(p2).durability!.damage).toBe(2 + 9);
  });
});

describe('Ore Smelter on the block broken by hand', () => {
  const beforeEvent = (player: Player, at: { x: number; y: number; z: number }, tool: ItemStack) => ({
    block: player.dimension.getBlock(at)!,
    itemStack: tool,
    player,
    cancel: false
  });
  const drop = (player: Player, id: string, n: number, at = { x: 0.6, y: 10.4, z: 0.3 }) => {
    const e = player.dimension.spawnItem(new ItemStack(id, n), at);
    onEntitySpawn({ entity: e, cause: 'Spawned' } as never);
    return e;
  };
  const smelter = (extra: Parameters<typeof pickaxe>[1] = {}) =>
    pickaxe('minecraft:diamond_pickaxe', { custom: ['ore_smelter'], ...extra });

  it('replaces the dropped raw ore with the same number of ingots, in place, with furnace XP', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:gold_ore');
    noteBreakForSmelting(beforeEvent(player, O, smelter()) as never);
    const raw = drop(player, 'minecraft:raw_gold', 3);
    expect(raw.isValid).toBe(false);
    expect(totals(dim)).toEqual({ 'minecraft:gold_ingot': 3 });
    expect(dim.items()[0]!.location).toEqual({ x: 0.6, y: 10.4, z: 0.3 });
    expect(dim.orbs().reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('turns ancient debris into netherite scrap', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:ancient_debris');
    noteBreakForSmelting(beforeEvent(player, O, smelter()) as never);
    drop(player, 'minecraft:ancient_debris', 1);
    expect(totals(dim)).toEqual({ 'minecraft:netherite_scrap': 1 });
  });

  it('leaves items outside the broken block alone, even right next to it', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    noteBreakForSmelting(beforeEvent(player, O, smelter()) as never);
    drop(player, 'minecraft:raw_iron', 5, { x: 1.2, y: 10.4, z: 0.5 });
    drop(player, 'minecraft:raw_iron', 2, { x: 0.5, y: 11.1, z: 0.5 });
    expect(totals(dim)).toEqual({ 'minecraft:raw_iron': 7 });
  });

  it('leaves items that appear after the break is over', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    noteBreakForSmelting(beforeEvent(player, O, smelter()) as never);
    state.tick += 2;
    drop(player, 'minecraft:raw_iron', 1);
    expect(totals(dim)).toEqual({ 'minecraft:raw_iron': 1 });
  });

  it('does not smelt with Silk Touch, in Creative, or without the enchantment', () => {
    for (const variant of ['silk', 'creative', 'plain'] as const) {
      const { dim, player } = setup();
      dim.set(O, 'minecraft:iron_ore');
      if (variant === 'creative') player.mode = GameMode.Creative;
      const tool =
        variant === 'silk' ? smelter({ enchants: { silk_touch: 1 } }) : variant === 'plain' ? pickaxe() : smelter();
      forgetAllCaptures();
      noteBreakForSmelting(beforeEvent(player, O, tool) as never);
      drop(player, 'minecraft:raw_iron', 1);
      expect(totals(dim)).toEqual({ 'minecraft:raw_iron': 1 });
    }
  });

  it('ignores items that do not smelt', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    noteBreakForSmelting(beforeEvent(player, O, smelter()) as never);
    drop(player, 'minecraft:cobblestone', 1);
    expect(totals(dim)).toEqual({ 'minecraft:cobblestone': 1 });
  });

  it('never re-processes its own items', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:iron_ore');
    noteBreakForSmelting(beforeEvent(player, O, smelter()) as never);
    drop(player, 'minecraft:raw_iron', 2);
    const ingots = dim.items();
    for (const e of ingots) onEntitySpawn({ entity: e as Entity, cause: 'Spawned' } as never);
    expect(totals(dim)).toEqual({ 'minecraft:iron_ingot': 2 });
  });

  it('works together with Vein Miner: hand block and vein both smelted, nothing doubled', () => {
    const { dim, player } = setup();
    dim.set(O, 'minecraft:copper_ore');
    place(dim, line(3), 'minecraft:copper_ore');
    const tool = pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner', 'ore_smelter'] });
    noteBreakForSmelting(beforeEvent(player, O, tool) as never);
    drop(player, 'minecraft:raw_copper', 2); // vanilla drop of the first block
    run(vanillaBreak(dim, player, O, tool));
    for (const e of dim.items()) onEntitySpawn({ entity: e as Entity, cause: 'Spawned' } as never);
    expect(totals(dim)).toEqual({ 'minecraft:copper_ingot': 2 + 3 * 2 });
  });
});
