/**
 * ||========================================================================================================================||
 * ||                                                                                                                        ||
 * ||  ________  _______   ________  _________  ___  ___  ________  ________  ___  ___  ________  ________  ________         ||
 * || |\   ___ \|\  ___ \ |\   __  \|\___   ___\\  \|\  \|\   __  \|\   __  \|\  \|\  \|\   __  \|\   __  \|\   ___  \       ||
 * ||  \ \  \_|\ \ \   __/|\ \  \|\  \|___ \  \_\ \  \\\  \ \  \|\  \ \  \|\  \ \  \\\  \ \  \|\ /\ \  \|\  \ \  \\ \  \     ||
 * ||   \ \  \ \\ \ \  \_|/_\ \   __  \   \ \  \ \ \   __  \ \   __  \ \   _  _\ \  \\\  \ \   __  \ \   __  \ \  \\ \  \    ||
 * ||    \ \  \_\\ \ \  \_|\ \ \  \ \  \   \ \  \ \ \  \ \  \ \  \ \  \ \  \\  \\ \  \\\  \ \  \|\  \ \  \ \  \ \  \\ \  \   ||
 * ||     \ \_______\ \_______\ \__\ \__\   \ \__\ \ \__\ \__\ \__\ \__\ \__\\ _\\ \_______\ \_______\ \__\ \__\ \__\\ \__\  ||
 * ||      \|_______|\|_______|\|__|\|__|    \|__|  \|__|\|__|\|__|\|__|\|__|\|__|\|_______|\|_______|\|__|\|__|\|__| \|__|  ||
 * ||                                                                                                                        ||
 * ||========================================================================================================================||
 * ||                                                                                                                        ||  
 * ||                                               ★ Please do not modify this code ★                                      ||  
 * ||                                   ► This Mod was created for Minecraft Bedrock Edition ◄                               || 
 * ||                                                                                                                        ||
 * ||========================================================================================================================||
 */

/**
* @made_by Death_Aruban
* @version [1.0.5]
* @link [https://discord.com/invite/NKy9A9RAe8]
*/

import { world, system } from "@minecraft/server";
import { Vector3 } from "./vector";
import { enchant_interact } from "./function";

export const blocks = {
  1: {
    Id: "da:enchant_table_plus",
    interact_function: enchant_interact,
    place_function: enchant_place,
    break_function: enchant_break
  }
};

world.afterEvents.playerPlaceBlock.subscribe((event) => {
  const block = event.block;
  const player = event.player;
  for (let key in blocks) {
    if (block.typeId == blocks[key].Id) {
      blocks[key].place_function(player, block);
    }
  }
});

function enchant_place(player, block) {
  let sphere = player.dimension.spawnEntity(
    "da:enchant_sphere",
    new Vector3(block.location.x + 0.45, block.location.y + 0.8, block.location.z + 0.47)
  );
  sphere.nameTag = "";
}

world.beforeEvents.playerBreakBlock.subscribe((event) => {
  const block = event.block;
  const player = event.player;
  for (let key in blocks) {
    if (block.typeId == blocks[key].Id) {
      blocks[key].break_function(player, block);
    }
  }
});

function enchant_break(player, block) {
  const location = new Vector3(block.location.x + 0.5, block.location.y + 0.45, block.location.z + 0.47);
  const entities = block.dimension.getEntitiesAtBlockLocation(location);
  const sphere = entities.find((entity) => {
    return entity.typeId === "da:enchant_sphere";
  });
  if (sphere) {
    sphere.runCommandAsync("event entity @s despawn");
  }
}

let lastInteraction = Date.now();

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  if (event.block.typeId !== "da:enchant_table_plus") {
    return;
  }
  const heldItem = getItemInMainHand(event.player);
  if (!heldItem || !event.player.isSneaking) {
    event.cancel = true;
    const now = Date.now();
    if (now - lastInteraction >= 500) {
      lastInteraction = now;
      system.run(() => {
        enchant_interact(event.player);
      });
    }
  }
});

export function getItemInMainHand(player) {
  const inventory = player.getComponent("minecraft:inventory");
  const item = inventory.container.getItem(player.selectedSlotIndex);
  return item;
}
