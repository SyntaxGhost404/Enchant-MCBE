/**
 * Vein Miner & Ore Smelter: entry point. Only event subscriptions happen at load (early execution);
 * everything else runs inside the handlers.
 */

import { world, type ItemStack } from '@minecraft/server';
import { forgetAnvilPlayer, onInteractAfter, onInteractBefore } from './game/anvil';
import { isPickaxe } from './game/items';
import { warn } from './game/notify';
import { noteBreakForSmelting, onEntitySpawn } from './game/smelter';
import { forgetPlayer, isEnchantedBook, requestScan } from './game/upkeep';
import { onBlockBroken } from './game/vein-miner';

function guard<E>(where: string, handler: (event: E) => void): (event: E) => void {
  return (event: E) => {
    try {
      handler(event);
    } catch (e) {
      warn(where, e);
    }
  };
}

const watched = (item: ItemStack | undefined): boolean => !!item && (isEnchantedBook(item) || isPickaxe(item));

world.beforeEvents.playerBreakBlock.subscribe(guard('ore smelter', noteBreakForSmelting));
world.afterEvents.entitySpawn.subscribe(guard('ore smelter', onEntitySpawn));
world.afterEvents.playerBreakBlock.subscribe(guard('vein miner', onBlockBroken));

world.beforeEvents.playerInteractWithBlock.subscribe(guard('anvil', onInteractBefore));
world.afterEvents.playerInteractWithBlock.subscribe(guard('workstations', onInteractAfter));

world.afterEvents.playerInventoryItemChange.subscribe(
  guard('upkeep', (event) => {
    if (watched(event.itemStack) || watched(event.beforeItemStack)) requestScan(event.player);
  }),
  { ignoreQuantityChange: true }
);
world.afterEvents.playerSpawn.subscribe(
  guard('upkeep', (event) => {
    if (event.initialSpawn) requestScan(event.player);
  })
);
world.afterEvents.playerLeave.subscribe(
  guard('upkeep', (event) => {
    forgetPlayer(event.playerId);
    forgetAnvilPlayer(event.playerId);
  })
);
