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
* @version [1.1.0]
* @link [https://discord.com/invite/NKy9A9RAe8]
* @upgrade Updated for Minecraft: Bedrock Edition 26.60+ (@minecraft/server 2.11.0).
*/

import { system, world } from "@minecraft/server";
import { Vector3 } from "./vector";
import { enchant_interact } from "./function";

const TABLE_ID = "da:enchant_table_plus";
const SPHERE_ID = "da:enchant_sphere";
/** Block custom component listed in blocks/enchant_table_plus.json. */
const TABLE_COMPONENT = "da:enchant_table";

/**
 * The table's behaviour is a block custom component (Minecraft 1.21.90+, @minecraft/server 2.x).
 * Because the block has an interaction, the game treats it like a vanilla crafting table: using it opens the menu,
 * and a held block is only placed on the table while sneaking (no block shows up for a moment any more).
 * onBreak runs however the table is removed (player, explosion, command), so the floating sphere always goes with it.
 * World changes are deferred with system.run() so they never run while the game is still processing the block event.
 */
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent(TABLE_COMPONENT, {
    onPlace: ({ block }) => {
      system.run(() => enchant_place(block));
    },
    onBreak: ({ block, dimension }) => {
      const location = block.location;
      system.run(() => enchant_break(dimension, location));
    },
    onPlayerInteract: ({ player }) => {
      if (player) {
        enchant_open(player);
      }
    }
  });
});

/**
 * Spawns the floating enchant sphere above a table (one per table).
 * @param {import("@minecraft/server").Block} block
 */
function enchant_place(block) {
  if (!block.isValid || block.typeId !== TABLE_ID || findSpheres(block.dimension, block.location).length > 0) {
    return;
  }
  const sphere = block.dimension.spawnEntity(
    SPHERE_ID,
    new Vector3(block.location.x + 0.45, block.location.y + 0.8, block.location.z + 0.47)
  );
  sphere.nameTag = "";
}

/**
 * Removes the sphere of a table that is gone.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} location
 */
function enchant_break(dimension, location) {
  for (const sphere of findSpheres(dimension, location)) {
    sphere.triggerEvent("despawn");
  }
}

/**
 * Spheres floating inside the table's block space (they are spawned at +0.45, +0.8, +0.47).
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} location
 * @returns {import("@minecraft/server").Entity[]}
 */
function findSpheres(dimension, location) {
  return dimension.getEntitiesAtBlockLocation(location).filter((entity) => entity.typeId === SPHERE_ID && entity.isValid);
}

/** Last time (ms) each player opened the menu, so holding the use button opens it only once. */
const lastInteraction = new Map();

/**
 * Opens the Enchant+ menu. Sneaking with an item in hand is for building on the table, so it does not open the menu.
 * @param {import("@minecraft/server").Player} player
 */
function enchant_open(player) {
  if (getItemInMainHand(player) && player.isSneaking) {
    return;
  }
  const now = Date.now();
  if (now - (lastInteraction.get(player.id) ?? 0) < 500) {
    return;
  }
  lastInteraction.set(player.id, now);
  system.run(() => {
    if (player.isValid) {
      enchant_interact(player);
    }
  });
}

/**
 * Every 5 seconds, removes spheres that have no table under them any more (for example spheres left behind by tables
 * that an explosion destroyed before this version) and extra spheres on the same table.
 */
system.runInterval(() => {
  for (const dimensionId of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
    const dimension = world.getDimension(dimensionId);
    const tablesWithSphere = new Set();
    for (const sphere of dimension.getEntities({ type: SPHERE_ID })) {
      const cell = { x: Math.floor(sphere.location.x), y: Math.floor(sphere.location.y), z: Math.floor(sphere.location.z) };
      let block;
      try {
        block = dimension.getBlock(cell);
      } catch {
        continue; // the chunk is not loaded
      }
      if (!block) {
        continue;
      }
      const key = cell.x + "," + cell.y + "," + cell.z;
      if (block.typeId !== TABLE_ID || tablesWithSphere.has(key)) {
        sphere.triggerEvent("despawn");
      } else {
        tablesWithSphere.add(key);
      }
    }
  }
}, 100);

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {import("@minecraft/server").ItemStack | undefined}
 */
export function getItemInMainHand(player) {
  const inventory = player.getComponent("minecraft:inventory");
  return inventory.container.getItem(player.selectedSlotIndex);
}
