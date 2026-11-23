/**
 * Enchant+ 1.1.1 for Minecraft: Bedrock Edition 26.60+
 * Menu icons for enchantable items, the table of enchantments that cannot be combined, and taking
 * payment for an operation.
 *
 * Based on Enchant+ by Death_Aruban: https://github.com/DeathAruban/Enchant-MCBE
 */

import { world } from "@minecraft/server";
import { config } from "../config";

/**
 * Icons shown next to items in the Enchant+ menus.
 * Paths are vanilla texture paths (Minecraft: Bedrock Edition 26.60 resource pack) or textures shipped in this add-on.
 * Items that are not listed use the "unknown" icon.
 */
export const item_texture_list = {
  unknown_icon: {
    no_icon: "arucube/enchant_table/resources/icon/unknown_icon"
  },
  vanilla_icon: {
    "minecraft:leather_helmet": "textures/items/leather_helmet",
    "minecraft:leather_chestplate": "textures/items/leather_chestplate",
    "minecraft:leather_leggings": "textures/items/leather_leggings",
    "minecraft:leather_boots": "textures/items/leather_boots",
    "minecraft:chainmail_helmet": "textures/items/chainmail_helmet",
    "minecraft:chainmail_chestplate": "textures/items/chainmail_chestplate",
    "minecraft:chainmail_leggings": "textures/items/chainmail_leggings",
    "minecraft:chainmail_boots": "textures/items/chainmail_boots",
    "minecraft:copper_helmet": "textures/items/copper_helmet",
    "minecraft:copper_chestplate": "textures/items/copper_chestplate",
    "minecraft:copper_leggings": "textures/items/copper_leggings",
    "minecraft:copper_boots": "textures/items/copper_boots",
    "minecraft:iron_helmet": "textures/items/iron_helmet",
    "minecraft:iron_chestplate": "textures/items/iron_chestplate",
    "minecraft:iron_leggings": "textures/items/iron_leggings",
    "minecraft:iron_boots": "textures/items/iron_boots",
    "minecraft:diamond_helmet": "textures/items/diamond_helmet",
    "minecraft:diamond_chestplate": "textures/items/diamond_chestplate",
    "minecraft:diamond_leggings": "textures/items/diamond_leggings",
    "minecraft:diamond_boots": "textures/items/diamond_boots",
    "minecraft:golden_helmet": "textures/items/gold_helmet",
    "minecraft:golden_chestplate": "textures/items/gold_chestplate",
    "minecraft:golden_leggings": "textures/items/gold_leggings",
    "minecraft:golden_boots": "textures/items/gold_boots",
    "minecraft:turtle_helmet": "textures/items/turtle_helmet",
    "minecraft:netherite_helmet": "textures/items/netherite_helmet",
    "minecraft:netherite_chestplate": "textures/items/netherite_chestplate",
    "minecraft:netherite_leggings": "textures/items/netherite_leggings",
    "minecraft:netherite_boots": "textures/items/netherite_boots",
    "minecraft:netherite_pickaxe": "textures/items/netherite_pickaxe",
    "minecraft:netherite_axe": "textures/items/netherite_axe",
    "minecraft:netherite_shovel": "textures/items/netherite_shovel",
    "minecraft:netherite_hoe": "textures/items/netherite_hoe",
    "minecraft:wooden_pickaxe": "textures/items/wood_pickaxe",
    "minecraft:wooden_axe": "textures/items/wood_axe",
    "minecraft:wooden_shovel": "textures/items/wood_shovel",
    "minecraft:wooden_hoe": "textures/items/wood_hoe",
    "minecraft:stone_pickaxe": "textures/items/stone_pickaxe",
    "minecraft:stone_axe": "textures/items/stone_axe",
    "minecraft:stone_shovel": "textures/items/stone_shovel",
    "minecraft:stone_hoe": "textures/items/stone_hoe",
    "minecraft:copper_pickaxe": "textures/items/copper_pickaxe",
    "minecraft:copper_axe": "textures/items/copper_axe",
    "minecraft:copper_shovel": "textures/items/copper_shovel",
    "minecraft:copper_hoe": "textures/items/copper_hoe",
    "minecraft:iron_pickaxe": "textures/items/iron_pickaxe",
    "minecraft:iron_axe": "textures/items/iron_axe",
    "minecraft:iron_shovel": "textures/items/iron_shovel",
    "minecraft:iron_hoe": "textures/items/iron_hoe",
    "minecraft:diamond_pickaxe": "textures/items/diamond_pickaxe",
    "minecraft:diamond_axe": "textures/items/diamond_axe",
    "minecraft:diamond_shovel": "textures/items/diamond_shovel",
    "minecraft:diamond_hoe": "textures/items/diamond_hoe",
    "minecraft:golden_pickaxe": "textures/items/gold_pickaxe",
    "minecraft:golden_axe": "textures/items/gold_axe",
    "minecraft:golden_shovel": "textures/items/gold_shovel",
    "minecraft:golden_hoe": "textures/items/gold_hoe",
    "minecraft:wooden_sword": "textures/items/wood_sword",
    "minecraft:stone_sword": "textures/items/stone_sword",
    "minecraft:copper_sword": "textures/items/copper_sword",
    "minecraft:iron_sword": "textures/items/iron_sword",
    "minecraft:golden_sword": "textures/items/gold_sword",
    "minecraft:diamond_sword": "textures/items/diamond_sword",
    "minecraft:netherite_sword": "textures/items/netherite_sword",
    "minecraft:wooden_spear": "textures/items/spear/wood_spear",
    "minecraft:stone_spear": "textures/items/spear/stone_spear",
    "minecraft:copper_spear": "textures/items/spear/copper_spear",
    "minecraft:iron_spear": "textures/items/spear/iron_spear",
    "minecraft:golden_spear": "textures/items/spear/gold_spear",
    "minecraft:diamond_spear": "textures/items/spear/diamond_spear",
    "minecraft:netherite_spear": "textures/items/spear/netherite_spear",
    "minecraft:bow": "textures/items/bow_standby",
    "minecraft:crossbow": "textures/items/crossbow_standby",
    "minecraft:trident": "textures/items/trident",
    "minecraft:shears": "textures/items/shears",
    "minecraft:carrot_on_a_stick": "textures/items/carrot_on_a_stick",
    "minecraft:warped_fungus_on_a_stick": "textures/items/warped_fungus_on_a_stick",
    "minecraft:fishing_rod": "textures/items/fishing_rod_uncast",
    "minecraft:elytra": "textures/items/elytra",
    "minecraft:shield": "arucube/enchant_table/resources/items/shield",
    "minecraft:brush": "textures/items/brush",
    "minecraft:flint_and_steel": "textures/items/flint_and_steel",
    "minecraft:mace": "textures/items/mace",
    "minecraft:book": "textures/items/book_normal",
    "minecraft:enchanted_book": "textures/items/book_enchanted",
    "minecraft:compass": "textures/items/compass_item",
    "minecraft:lodestone_compass": "textures/items/compass_item",
    "minecraft:recovery_compass": "textures/items/recovery_compass_item",
    "minecraft:carved_pumpkin": "textures/blocks/pumpkin_face_off"
  }
};

/**
 * Enchantments that cannot be combined on the same item (keys/values are ids without the "minecraft:" namespace).
 * The game is also asked directly (see findIncompatibleEnchantments in function.js), so a pair missing here is still caught.
 */
export const enchant_incompatible = {
  protection: ["fire_protection", "blast_protection", "projectile_protection"],
  fire_protection: ["protection", "blast_protection", "projectile_protection"],
  blast_protection: ["protection", "fire_protection", "projectile_protection"],
  projectile_protection: ["protection", "fire_protection", "blast_protection"],
  sharpness: ["smite", "bane_of_arthropods", "density", "breach"],
  smite: ["sharpness", "bane_of_arthropods", "density", "breach"],
  bane_of_arthropods: ["sharpness", "smite", "density", "breach"],
  silk_touch: ["fortune"],
  fortune: ["silk_touch"],
  multishot: ["piercing"],
  piercing: ["multishot"],
  density: ["breach", "smite", "bane_of_arthropods"],
  breach: ["density", "smite", "bane_of_arthropods"],
  infinity: ["mending"],
  mending: ["infinity"],
  riptide: ["loyalty", "channeling"],
  loyalty: ["riptide"],
  channeling: ["riptide"],
  depth_strider: ["frost_walker"],
  frost_walker: ["depth_strider"]
};

/**
 * Checks that the player can pay every enabled cost, then removes them.
 * Returns false (and lists what is missing) without removing anything if a cost cannot be paid.
 * @param {import("@minecraft/server").Player} player
 * @param {number} xpCost
 * @param {number} scoreCost
 * @param {number} itemCost
 * @returns {boolean}
 */
export function remove_resources(player, xpCost, scoreCost, itemCost) {
  const missing = [];
  if (config.items.state) {
    const container = player.getComponent("minecraft:inventory").container;
    let owned = 0;
    for (let slot = 0; slot < container.size; slot++) {
      const item = container.getItem(slot);
      if (item && item.typeId === config.items.id) {
        owned += item.amount;
      }
    }
    if (owned < itemCost) {
      let itemName = config.items.id.split(":").pop();
      itemName = itemName.replace(/_/g, " ");
      itemName = itemName
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      missing.push("§bItem :§f " + itemName + " x " + itemCost);
    }
  }
  if (config.scores.state) {
    const objective = getObjective(config.scores.score_name);
    const score = objective.getScore(player) ?? 0;
    if (score < scoreCost) {
      missing.push("§b" + config.scores.display_name + " :§f " + (scoreCost - score));
    }
  }
  if (config.xp.state) {
    const level = see_xp(player);
    if (level < xpCost) {
      missing.push("§bXP :§f " + (xpCost - level));
    }
  }
  if (missing.length > 0) {
    player.sendMessage("You miss the following resources:\n" + missing.join("\n"));
    return false;
  }
  if (config.items.state) {
    const container = player.getComponent("minecraft:inventory").container;
    let remaining = itemCost;
    for (let slot = 0; slot < container.size; slot++) {
      const item = container.getItem(slot);
      if (item && item.typeId === config.items.id) {
        if (item.amount > remaining) {
          item.amount -= remaining;
          container.setItem(slot, item);
          break;
        } else {
          remaining -= item.amount;
          container.setItem(slot, undefined);
        }
      }
    }
  }
  if (config.scores.state) {
    // runCommandAsync() was removed in @minecraft/server 2.0.0; runCommand() runs the same command synchronously.
    player.runCommand("scoreboard players remove @s " + config.scores.score_name + " " + scoreCost);
  }
  if (config.xp.state) {
    // Same effect as the previous "xp -<cost>L @s" command.
    player.addLevels(-xpCost);
  }
  return true;
}

/**
 * Current experience level of the player.
 * @param {import("@minecraft/server").Player} player
 * @returns {number}
 */
export function see_xp(player) {
  return player.level;
}

/**
 * @param {string} objectiveId
 * @param {string} [displayName]
 * @returns {import("@minecraft/server").ScoreboardObjective}
 */
function getObjective(objectiveId, displayName) {
  const scoreboard = world.scoreboard;
  return scoreboard.getObjective(objectiveId) ?? scoreboard.addObjective(objectiveId, displayName ?? objectiveId);
}
