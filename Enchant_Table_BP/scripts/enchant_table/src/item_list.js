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

import { world } from "@minecraft/server";
import { config } from "../config";

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
    "minecraft:iron_sword": "textures/items/iron_sword",
    "minecraft:golden_sword": "textures/items/golden_sword",
    "minecraft:diamond_sword": "textures/items/diamond_sword",
    "minecraft:netherite_sword": "textures/items/netherite_sword",
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
  breach: ["density", "smite", "bane_of_arthropods"]
};

export function remove_resources(player, xpCost, scoreCost, itemCost) {
  let missing = [];
  if (config.items.state) {
    const container = player.getComponent("inventory").container;
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
    const container = player.getComponent("inventory").container;
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
    player.runCommandAsync("scoreboard players remove @s " + config.scores.score_name + " " + scoreCost);
  }
  if (config.xp.state) {
    player.runCommandAsync("xp -" + xpCost + "L @s");
  }
  return true;
}

export function see_xp(player) {
  let low = 0;
  let high = 24791;
  while (low < high) {
    let middle = Math.floor((low + high) / 2);
    let players = [
      ...world.getPlayers({
        minLevel: low,
        maxLevel: middle
      })
    ];
    if (players.includes(player)) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
}

function getObjective(objectiveId, displayName) {
  const scoreboard = world.scoreboard;
  return scoreboard.getObjective(objectiveId) ?? scoreboard.addObjective(objectiveId, displayName ?? objectiveId);
}
