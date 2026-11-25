import { describe, expect, it } from 'vitest';
import { state } from './fake/server';
import { pickaxe, settle, setup } from './helpers';
import { customLevels } from '../src/game/items';
import { requestScan } from '../src/game/upkeep';
import { VEIN_MINER } from '../src/rules/enchantments';

// Its own file: the fallback is remembered for the rest of the session (module state).
describe('when the game does not hand translated lore back as written', () => {
  it('switches to plain lines once and never rewrites in a loop', async () => {
    const { player } = setup();
    state.flattenLore = true;
    const item = pickaxe('minecraft:iron_pickaxe');
    item.setDynamicProperty(VEIN_MINER.property, 1);
    player.inventory.setItem(0, item);
    state.setLoreCalls = 0;
    for (let i = 0; i < 10; i++) {
      state.tick += 40; // past the write cooldown each time: only the fallback logic stops rewrites
      requestScan(player as never);
      await settle();
    }
    const after = player.inventory.getItem(0)!;
    expect(after.lore).toEqual([VEIN_MINER.plainLore]);
    expect(customLevels(after).get('vein_miner')).toBe(1);
    expect(state.setLoreCalls).toBe(2); // one translated attempt, one plain write
  });
});

describe('when one item refuses translated lore', () => {
  it('writes plain lines once and then leaves the item alone', async () => {
    const { player } = setup();
    const item = pickaxe('minecraft:iron_pickaxe');
    item.setDynamicProperty(VEIN_MINER.property, 1);
    const refusing = item as unknown as { setLore(l?: unknown[]): void };
    const original = refusing.setLore.bind(item);
    refusing.setLore = (l?: unknown[]) => {
      if ((l ?? []).some((x) => typeof x !== 'string')) throw new Error('refused');
      original(l);
    };
    player.inventory.slots[0] = item; // keep the refusing item itself in the slot
    let writes = 0;
    const counting = refusing.setLore;
    refusing.setLore = (l?: unknown[]) => {
      writes++;
      counting(l);
    };
    for (let i = 0; i < 6; i++) {
      state.tick += 40;
      requestScan(player as never);
      await settle();
    }
    expect(item.lore).toEqual([VEIN_MINER.plainLore]);
    // the first scan tries translated (refused) then writes plain; later scans try translated, are
    // refused, find plain lines in place and stop
    expect(item.lore.length).toBe(1);
    expect(writes).toBeLessThanOrEqual(7);
  });
});
