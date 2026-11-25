import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlockPermutation, GameMode, ItemStack, Player, type Dimension } from './fake/server';
import { ui } from './fake/server-ui';
import { pickaxe, settle, setup } from './helpers';
import { onInteractAfter, onInteractBefore } from '../src/game/anvil';
import { customLevels, levelsFromLore, levelsFromProperties } from '../src/game/items';
import { requestScan } from '../src/game/upkeep';
import { GRINDSTONE_PROPERTY, ORE_SMELTER, VEIN_MINER, WORK_PROPERTY } from '../src/rules/enchantments';

const ANVIL = { x: 3, y: 64, z: 3 };

let random: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => random.mockRestore());

function bench(level = 30) {
  const { dim, player } = setup();
  dim.set(ANVIL, 'minecraft:anvil', { 'minecraft:cardinal_direction': 'east' });
  player.location = { x: 3.5, y: 65, z: 5.5 };
  player.level = level;
  return { dim, player };
}

function useAnvil(player: Player, dim: Dimension, first = true) {
  const event = {
    block: dim.getBlock(ANVIL)!,
    itemStack: player.inventory.getItem(player.selectedSlotIndex),
    player,
    isFirstEvent: first,
    cancel: false,
    blockFace: 'Up',
    faceLocation: { x: 0.5, y: 1, z: 0.5 }
  };
  onInteractBefore(event as never);
  return event;
}

const book = (e = VEIN_MINER) => new ItemStack(e.book, 1);

describe('applying a book at an anvil', () => {
  it('opens its own menu instead of the vanilla screen and applies on confirm', async () => {
    const { dim, player } = bench();
    player.inventory.setItem(0, book());
    player.inventory.setItem(5, pickaxe('minecraft:iron_pickaxe', { enchants: { efficiency: 3 }, lore: ['§aGift'] }));
    ui.answers.push({ selection: 0 }, { selection: 0 });
    const event = useAnvil(player, dim);
    expect(event.cancel).toBe(true);
    await settle();

    const result = player.inventory.getItem(5)!;
    expect([...customLevels(result)]).toEqual([['vein_miner', 1]]);
    expect([...levelsFromProperties(result)]).toEqual([['vein_miner', 1]]);
    expect(result.lore).toEqual([{ translate: VEIN_MINER.loreKey }, '§aGift']);
    expect(result.enchants.get('efficiency')).toBe(3);
    expect(result.getDynamicProperty(WORK_PROPERTY)).toBe(1);
    expect(player.inventory.getItem(0)).toBeUndefined();
    expect(player.level).toBe(26);
    expect(dim.sounds.map((s) => s.id)).toContain('random.anvil_use');
    expect(dim.typeAt(ANVIL)).toBe('minecraft:anvil');
  });

  it('leaves the vanilla anvil alone for other items', () => {
    const { dim, player } = bench();
    player.inventory.setItem(0, pickaxe());
    expect(useAnvil(player, dim).cancel).toBe(false);
  });

  it('cancels repeated use events without opening a second menu', async () => {
    const { dim, player } = bench();
    player.inventory.setItem(0, book());
    player.inventory.setItem(1, pickaxe());
    useAnvil(player, dim);
    const again = useAnvil(player, dim, false);
    expect(again.cancel).toBe(true);
    await settle();
    expect(ui.shown).toHaveLength(1);
  });

  for (const [name, answers] of [
    ['closing the menu', [{ canceled: true }]],
    ['pressing Cancel', [{ selection: 0 }, { selection: 1 }]],
    ['closing the confirmation', [{ selection: 0 }, { canceled: true }]]
  ] as const) {
    it(`costs nothing when ${name}`, async () => {
      const { dim, player } = bench();
      player.inventory.setItem(0, book());
      player.inventory.setItem(1, pickaxe());
      ui.answers.push(...answers.map((a) => ({ ...a })));
      useAnvil(player, dim);
      await settle();
      expect(player.inventory.getItem(0)?.typeId).toBe(VEIN_MINER.book);
      expect(customLevels(player.inventory.getItem(1)!).size).toBe(0);
      expect(player.level).toBe(30);
    });
  }

  const changes: [string, (p: Player, d: Dimension) => void, string][] = [
    ['the book was moved', (p) => p.inventory.setItem(0, undefined), 'book_moved'],
    ['the pickaxe changed', (p) => {
      const pick = p.inventory.getItem(1)!;
      pick.durability!.damage = 10;
      p.inventory.setItem(1, pick);
    }, 'pickaxe_changed'],
    ['the anvil was broken', (_p, d) => d.set(ANVIL, 'minecraft:air'), 'anvil_gone'],
    ['the player walked away', (p) => (p.location = { x: 40, y: 65, z: 40 }), 'too_far'],
    ['the player lost levels', (p) => (p.level = 1), 'levels']
  ];
  for (const [name, change, reason] of changes) {
    it(`uses nothing when ${name} before confirming`, async () => {
      const { dim, player } = bench();
      player.inventory.setItem(0, book());
      player.inventory.setItem(1, pickaxe());
      ui.answers.push({ selection: 0 }, { selection: 0, before: () => change(player, dim) });
      useAnvil(player, dim);
      await settle();
      const pick = player.inventory.getItem(1);
      expect(pick ? customLevels(pick).size : 0).toBe(0);
      if (reason !== 'book_moved') expect(player.inventory.getItem(0)?.typeId).toBe(VEIN_MINER.book);
      if (reason !== 'levels') expect(player.level).toBe(30);
      expect(JSON.stringify(player.actionBar)).toContain(`vmos.anvil.fail.${reason}`);
    });
  }

  it('lists only pickaxes that can take the book', async () => {
    const { dim, player } = bench();
    player.inventory.setItem(0, book());
    player.inventory.setItem(1, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] }));
    player.inventory.setItem(2, new ItemStack('minecraft:cobblestone', 10));
    player.inventory.setItem(3, pickaxe('minecraft:golden_pickaxe'));
    ui.answers.push({ canceled: true });
    useAnvil(player, dim);
    await settle();
    expect(ui.shown[0]!.buttons).toHaveLength(1);
    expect(JSON.stringify(ui.shown[0]!.buttons[0])).toContain('item.golden_pickaxe.name');
  });

  it('explains when no pickaxe can take it', async () => {
    const { dim, player } = bench();
    player.inventory.setItem(0, book());
    player.inventory.setItem(1, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] }));
    useAnvil(player, dim);
    await settle();
    expect(JSON.stringify(ui.shown[0]!.body)).toContain('vmos.anvil.none_left');
  });

  it('charges the prior work penalty on the second book', async () => {
    const { dim, player } = bench();
    player.inventory.setItem(0, book(VEIN_MINER));
    player.inventory.setItem(1, pickaxe());
    ui.answers.push({ selection: 0 }, { selection: 0 });
    useAnvil(player, dim);
    await settle();
    expect(player.level).toBe(26);
    player.inventory.setItem(0, book(ORE_SMELTER));
    ui.answers.push({ selection: 0 }, { selection: 0 });
    useAnvil(player, dim);
    await settle();
    expect(player.level).toBe(23); // 2 for the book + 1 for one earlier use
    const pick = player.inventory.getItem(1)!;
    expect([...customLevels(pick).keys()]).toEqual(['vein_miner', 'ore_smelter']);
    expect(pick.lore).toEqual([{ translate: VEIN_MINER.loreKey }, { translate: ORE_SMELTER.loreKey }]);
    expect(pick.getDynamicProperty(WORK_PROPERTY)).toBe(2);
  });

  it('is free in Creative and never wears the anvil there', async () => {
    const { dim, player } = bench(0);
    player.mode = GameMode.Creative;
    random.mockReturnValue(0);
    player.inventory.setItem(0, book());
    player.inventory.setItem(1, pickaxe());
    ui.answers.push({ selection: 0 }, { selection: 0 });
    useAnvil(player, dim);
    await settle();
    expect(customLevels(player.inventory.getItem(1)!).has('vein_miner')).toBe(true);
    expect(player.level).toBe(0);
    expect(dim.typeAt(ANVIL)).toBe('minecraft:anvil');
  });

  it('wears the anvil like vanilla (12%), keeping its facing, and breaks a damaged one', async () => {
    const { dim, player } = bench();
    random.mockReturnValue(0.05);
    player.inventory.setItem(0, book());
    player.inventory.setItem(1, pickaxe());
    ui.answers.push({ selection: 0 }, { selection: 0 });
    useAnvil(player, dim);
    await settle();
    expect(dim.typeAt(ANVIL)).toBe('minecraft:chipped_anvil');
    expect(dim.permutationAt(ANVIL).getState('minecraft:cardinal_direction')).toBe('east');

    dim.blocks.set(`${ANVIL.x},${ANVIL.y},${ANVIL.z}`, new BlockPermutation('minecraft:damaged_anvil'));
    player.inventory.setItem(0, book(ORE_SMELTER));
    ui.answers.push({ selection: 0 }, { selection: 0 });
    useAnvil(player, dim);
    await settle();
    expect(dim.typeAt(ANVIL)).toBe('minecraft:air');
    expect(dim.sounds.map((s) => s.id)).toContain('random.anvil_break');
  });

  it('still records the enchantment when the lore is full, without dropping any line', async () => {
    const { dim, player } = bench();
    const full = Array.from({ length: 20 }, (_, i) => `line ${i}`);
    player.inventory.setItem(0, book());
    player.inventory.setItem(1, pickaxe('minecraft:iron_pickaxe', { lore: full }));
    ui.answers.push({ selection: 0 }, { selection: 0 });
    useAnvil(player, dim);
    await settle();
    const pick = player.inventory.getItem(1)!;
    expect(pick.lore).toEqual(full);
    expect(levelsFromProperties(pick).get('vein_miner')).toBe(1);
  });

  it('notes Silk Touch on the confirmation for Ore Smelter', async () => {
    const { dim, player } = bench();
    player.inventory.setItem(0, book(ORE_SMELTER));
    player.inventory.setItem(1, pickaxe('minecraft:iron_pickaxe', { enchants: { silk_touch: 1 } }));
    ui.answers.push({ selection: 0 }, { canceled: true });
    useAnvil(player, dim);
    await settle();
    expect(JSON.stringify(ui.shown[1]!.body)).toContain('vmos.anvil.silk_note');
  });
});

describe('keeping the records healthy', () => {
  it('restores a missing lore line from the item data, and the item data from lore', async () => {
    const { player } = setup();
    const a = pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'] });
    a.lore = [];
    const b = pickaxe('minecraft:iron_pickaxe', { lore: ['§r§7Ore Smelter', '§bkept'] });
    player.inventory.setItem(0, a);
    player.inventory.setItem(1, b);
    requestScan(player as never);
    await settle();
    expect(player.inventory.getItem(0)!.lore).toEqual([{ translate: VEIN_MINER.loreKey }]);
    const b2 = player.inventory.getItem(1)!;
    expect(levelsFromProperties(b2).get('ore_smelter')).toBe(1);
    expect(b2.lore).toEqual([{ translate: ORE_SMELTER.loreKey }, '§bkept']);
  });

  it('translates the plain lore that loot tables put on books', async () => {
    const { player } = setup();
    const loot = new ItemStack(VEIN_MINER.book, 1);
    loot.lore = [VEIN_MINER.plainLore];
    player.inventory.setItem(4, loot);
    requestScan(player as never);
    await settle();
    expect(player.inventory.getItem(4)!.lore).toEqual([{ translate: VEIN_MINER.loreKey }]);
  });

  it('leaves untouched items alone', async () => {
    const { player } = setup();
    const plain = pickaxe('minecraft:iron_pickaxe', { lore: ['§7Vein Miner'] });
    player.inventory.setItem(0, plain);
    requestScan(player as never);
    await settle();
    expect(player.inventory.getItem(0)!.lore).toEqual(['§7Vein Miner']);
    expect(levelsFromProperties(player.inventory.getItem(0)!).size).toBe(0);
  });
});

describe('grindstone', () => {
  function grind(dim: Dimension, player: Player) {
    dim.set({ x: 9, y: 64, z: 9 }, 'minecraft:grindstone');
    onInteractAfter({ block: dim.getBlock({ x: 9, y: 64, z: 9 })!, player, isFirstEvent: true } as never);
  }

  it('removes the custom enchantments along with the vanilla ones', async () => {
    const { dim, player } = setup();
    player.inventory.setItem(2, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner', 'ore_smelter'], enchants: { efficiency: 5, binding: 1 } }));
    grind(dim, player);
    // the grindstone gives back the same item without its non-curse enchantments
    const out = player.inventory.getItem(2)!;
    out.enchants.delete('efficiency');
    player.inventory.setItem(2, undefined);
    player.inventory.setItem(7, out);
    requestScan(player as never);
    await settle();
    const after = player.inventory.getItem(7)!;
    expect(customLevels(after).size).toBe(0);
    expect(after.lore).toEqual([]);
    expect(after.getDynamicProperty(GRINDSTONE_PROPERTY)).toBeUndefined();
    expect(after.enchants.get('binding')).toBe(1);
    expect(JSON.stringify(player.actionBar)).toContain('vmos.notice.ground_two');
  });

  it('removes them when two pickaxes are combined (repaired) in the grindstone', async () => {
    const { dim, player } = setup();
    player.inventory.setItem(0, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'], damage: 120 }));
    grind(dim, player);
    const out = player.inventory.getItem(0)!;
    out.durability!.damage = 10;
    player.inventory.setItem(0, out);
    requestScan(player as never);
    await settle();
    expect(customLevels(player.inventory.getItem(0)!).size).toBe(0);
  });

  it('keeps them on a pickaxe that went in and came back out unchanged, or was just used', async () => {
    const { dim, player } = setup();
    player.inventory.setItem(0, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'], damage: 50 }));
    player.inventory.setItem(1, pickaxe('minecraft:iron_pickaxe', { custom: ['ore_smelter'], enchants: { mending: 1 }, damage: 50 }));
    grind(dim, player);
    const used = player.inventory.getItem(0)!;
    used.durability!.damage = 51;
    player.inventory.setItem(0, undefined);
    player.inventory.setItem(9, used);
    const mended = player.inventory.getItem(1)!;
    mended.durability!.damage = 20;
    player.inventory.setItem(1, mended);
    requestScan(player as never);
    await settle();
    expect(customLevels(player.inventory.getItem(9)!).has('vein_miner')).toBe(true);
    expect(customLevels(player.inventory.getItem(1)!).has('ore_smelter')).toBe(true);
  });

  it('stops checking once the player uses another block', async () => {
    const { dim, player } = setup();
    player.inventory.setItem(0, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'], damage: 120 }));
    grind(dim, player);
    dim.set({ x: 1, y: 64, z: 1 }, 'minecraft:anvil');
    onInteractAfter({ block: dim.getBlock({ x: 1, y: 64, z: 1 })!, player, isFirstEvent: true } as never);
    const repaired = player.inventory.getItem(0)!;
    repaired.durability!.damage = 0; // repaired at the anvil, which keeps the enchantments
    player.inventory.setItem(0, repaired);
    requestScan(player as never);
    await settle();
    expect(customLevels(player.inventory.getItem(0)!).has('vein_miner')).toBe(true);
  });

  it('treats a rebuilt item that kept only the lore as a grindstone result', async () => {
    const { dim, player } = setup();
    player.inventory.setItem(0, pickaxe('minecraft:iron_pickaxe', { custom: ['vein_miner'], enchants: { unbreaking: 2 } }));
    grind(dim, player);
    const rebuilt = pickaxe('minecraft:iron_pickaxe', { lore: [JSON.stringify({ translate: VEIN_MINER.loreKey })] });
    rebuilt.lore = [{ translate: VEIN_MINER.loreKey }];
    player.inventory.setItem(0, undefined);
    player.inventory.setItem(3, rebuilt);
    requestScan(player as never);
    await settle();
    expect(levelsFromLore(player.inventory.getItem(3)!).size).toBe(0);
  });
});
