/**
 * Enchant+ 1.1.0 for Minecraft: Bedrock Edition 26.60+
 * Main menu screens and shared helpers: item names and icons, the balance panel and the checks for
 * enchantments that cannot be combined.
 *
 * Based on Enchant+ by Death_Aruban: https://github.com/DeathAruban/Enchant-MCBE
 */

import { ActionFormData } from "@minecraft/server-ui";
import { EnchantmentTypes, ItemEnchantableComponent, ItemStack, world } from "@minecraft/server";
import { prepareEnchantments } from "./logic/enchant";
import { prepareDisenchantments } from "./logic/disenchant";
import { enchant_incompatible, item_texture_list, see_xp } from "./item_list";
import { prepareEnchantmentTransfer } from "./logic/transfer";
import { config } from "../config";

/**
 * First screen: lists every enchantable item in the player's inventory.
 * Button 0 is the resources/player summary, the following buttons are the items.
 * @param {import("@minecraft/server").Player} player
 */
export function enchant_interact(player) {
  const container = player.getComponent("minecraft:inventory").container;
  if (!container) {
    return;
  }
  const enchantableItems = [];
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (!item) {
      continue;
    }
    const enchantable = getComponent(item, ItemEnchantableComponent.componentId);
    if (enchantable) {
      enchantableItems.push({ item: item, index: slot });
    }
  }
  if (enchantableItems.length === 0) {
    player.sendMessage("\ue0f3 §8>> §cNo enchantable items to display!");
    return;
  }
  const form = new ActionFormData();
  form.title("arucube.enchant.home_select");
  form.body("§fList of Enchantable Items:§a " + enchantableItems.length + "\n§8");
  if (config.scores.state || config.items.state || config.xp.state) {
    form.button("" + buildResourceSummary(player));
  }
  for (let i = 0; i < enchantableItems.length; i++) {
    const { item, index } = enchantableItems[i];
    const itemName = item.nameTag ?? translateItemName(item.typeId);
    const icon = getItemIcon(item);
    const enchantCount = item.getComponent(ItemEnchantableComponent.componentId)?.getEnchantments().length || 0;
    form.button("Name: " + itemName + "\nSlot: " + index + "\nEnchant: " + enchantCount, icon);
  }
  form.show(player).then(({ selection, canceled }) => {
    if (canceled) {
      return;
    }
    if (selection === 0) {
      // Summary button: nothing to do.
    } else {
      const selected = enchantableItems[selection - 1];
      if (!selected) {
        return;
      }
      showSecondForm(player, selected, enchantableItems);
    }
  });
}

/**
 * Second screen: Enchant / Disenchant / Transfer actions for the selected item,
 * plus quick-switch buttons for the other enchantable items.
 * @param {import("@minecraft/server").Player} player
 * @param {{ item: import("@minecraft/server").ItemStack, index: number }} selected
 * @param {{ item: import("@minecraft/server").ItemStack, index: number }[]} enchantableItems
 */
function showSecondForm(player, selected, enchantableItems) {
  const form = new ActionFormData();
  form.title("arucube.enchant.home_select_info");
  form.body("§fList of Enchantable Items:§a " + enchantableItems.length + "\n§8");
  form.button("" + buildResourceSummary(player));
  form.button("§dEnchant§b\n§fClicking this button will take you to a \nscreen where you can enchant your \npreviously selected item.");
  form.button(
    "§cDisenchant§b\n§fClicking this button will take you to a \nscreen where you can remove \nenchantments from your previously selected item."
  );
  form.button(
    "§6Transfer§b\n§fClicking this button will take you to a \nscreen where you can transfer \nenchantments from your previously selected item to another item."
  );
  const itemName = selected.item.nameTag ?? translateItemName(selected.item.typeId);
  const description = selected.item.getLore().join("\n") || "No description";
  const slot = selected.index;
  const enchantable = getComponent(selected.item, ItemEnchantableComponent.componentId);
  const enchantments = enchantable ? enchantable.getEnchantments() : [];
  const enchantmentsText =
    enchantments.length > 0
      ? enchantments
          .map((enchantment) => "\n- " + translateEnchantmentName(enchantment.type.id) + ": §a" + enchantment.level + "§f")
          .join("")
      : "\nNone";
  const icon = getItemIcon(selected.item);
  form.button(
    "\n§aName:§f \n" + itemName + "\n§aDescription:§f \n" + description + "\n§aSlot:§f " + slot + "\n§dEnchantments:§f " + enchantmentsText,
    icon
  );
  const otherItems = {};
  let buttonIndex = 5;
  for (let i = 0; i < enchantableItems.length; i++) {
    const { item, index } = enchantableItems[i];
    if (index !== selected.index) {
      const otherName = item.nameTag ?? translateItemName(item.typeId);
      const otherIcon = getItemIcon(item);
      const otherCount = item.getComponent(ItemEnchantableComponent.componentId)?.getEnchantments().length || 0;
      form.button("Name: " + otherName + "\nSlot: " + index + "\nEnchant: " + otherCount, otherIcon);
      otherItems[buttonIndex] = enchantableItems[i];
      buttonIndex++;
    }
  }
  form.show(player).then(({ selection, canceled }) => {
    if (canceled) {
      return;
    }
    if (selection === 1) {
      prepareEnchantments(player, selected.item, selected.index);
    } else if (selection === 2) {
      prepareDisenchantments(player, selected.item, selected.index);
    } else if (selection === 3) {
      prepareEnchantmentTransfer(player, selected.item, selected.index);
    } else if (Object.prototype.hasOwnProperty.call(otherItems, selection)) {
      showSecondForm(player, otherItems[selection], enchantableItems);
    }
  });
}

/**
 * Text of the "resources" button shown at the top of every Enchant+ screen
 * (scoreboard / item / XP balances that are enabled in config.js, then the player name).
 * @param {import("@minecraft/server").Player} player
 * @returns {string}
 */
export function buildResourceSummary(player) {
  let summary = "";
  if (config.scores.state) {
    const score = getScore(player, config.scores.score_name);
    summary += "§b" + config.scores.name + " : §a" + score + "\n";
  }
  if (config.items.state) {
    const itemCount = getItemCount(player.getComponent("minecraft:inventory").container, config.items.id);
    summary += "§b" + config.items.name + " : §a" + itemCount + "\n";
  }
  if (config.xp.state) {
    const level = see_xp(player);
    summary += "§b" + config.xp.name + " : §a" + level + "\n";
  }
  summary += "§bPlayer : §a" + player.name;
  return summary;
}

/**
 * Enchantment ids without the optional "minecraft:" namespace (e.g. "fire_protection").
 * @param {string} enchantmentId
 * @returns {string}
 */
export function shortEnchantmentId(enchantmentId) {
  return enchantmentId.startsWith("minecraft:") ? enchantmentId.slice("minecraft:".length) : enchantmentId;
}

/**
 * Item type that ends up holding the enchantments: enchanting or receiving on a book makes an enchanted book.
 * @param {string} typeId
 * @returns {string}
 */
export function enchantedTypeId(typeId) {
  return typeId === "minecraft:book" ? "minecraft:enchanted_book" : typeId;
}

/**
 * Enchantment pairs that cannot be on the same item, as "a and b" labels (ids without the "minecraft:" namespace).
 * The add-on's table is checked and the game itself is asked, so every pair the game refuses
 * (for example Infinity and Mending on a bow) is reported before anything is charged.
 * @param {string} itemTypeId type of the item that will hold the enchantments
 * @param {string[]} addedIds enchantments that are added or changed
 * @param {string[]} [keptIds] enchantments the item already has and keeps
 * @returns {string[]}
 */
export function findIncompatibleEnchantments(itemTypeId, addedIds, keptIds = []) {
  const conflicts = new Set();
  addedIds.forEach((enchantmentId, index) => {
    const shortId = shortEnchantmentId(enchantmentId);
    for (const otherId of [...addedIds.slice(index + 1), ...keptIds]) {
      const otherShortId = shortEnchantmentId(otherId);
      if (shortId === otherShortId) {
        continue;
      }
      const listed = enchant_incompatible[shortId]?.includes(otherShortId) || enchant_incompatible[otherShortId]?.includes(shortId);
      if (listed || !gameAcceptsTogether(itemTypeId, enchantmentId, otherId)) {
        conflicts.add([shortId, otherShortId].sort().join(" and "));
      }
    }
  });
  return [...conflicts];
}

/**
 * Chat message listing enchantments that cannot be combined.
 * @param {import("@minecraft/server").Player} player
 * @param {string[]} conflicts "a and b" labels
 */
export function sendIncompatibleMessage(player, conflicts) {
  let message = "\ue0f3 §cThe following enchantments are not compatible:§f\n---------------------------------§6\n";
  conflicts.forEach((conflict) => {
    message += "   - " + conflict + "\n";
  });
  player.sendMessage(message);
}

/** @type {Map<string, boolean>} */
const pairCache = new Map();

/**
 * Asks the game whether two enchantments can be on the same item of this type.
 * Only a refusal caused by the pair counts: if the game refuses either enchantment on its own, this returns true.
 * @param {string} itemTypeId
 * @param {string} firstId
 * @param {string} secondId
 * @returns {boolean}
 */
function gameAcceptsTogether(itemTypeId, firstId, secondId) {
  const key = itemTypeId + "|" + [firstId, secondId].sort().join("|");
  let accepted = pairCache.get(key);
  if (accepted === undefined) {
    const firstType = EnchantmentTypes.get(firstId);
    const secondType = EnchantmentTypes.get(secondId);
    accepted =
      !firstType ||
      !secondType ||
      !gameAccepts(itemTypeId, [firstType]) ||
      !gameAccepts(itemTypeId, [secondType]) ||
      (gameAccepts(itemTypeId, [firstType, secondType]) && gameAccepts(itemTypeId, [secondType, firstType]));
    pairCache.set(key, accepted);
  }
  return accepted;
}

/**
 * Adds the enchantments (level 1, in this order) to a new item of this type; false if the game refuses one.
 * @param {string} itemTypeId
 * @param {import("@minecraft/server").EnchantmentType[]} types
 * @returns {boolean}
 */
function gameAccepts(itemTypeId, types) {
  try {
    const enchantable = new ItemStack(itemTypeId).getComponent("minecraft:enchantable");
    if (!enchantable) {
      return false;
    }
    types.forEach((type) => enchantable.addEnchantment({ type: type, level: 1 }));
    return true;
  } catch {
    return false;
  }
}

/**
 * "fire_protection" -> "Fire Protection"
 * @param {string} enchantmentId
 * @returns {string}
 */
export function translateEnchantmentName(enchantmentId) {
  return shortEnchantmentId(enchantmentId)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * "minecraft:diamond_sword" -> "Diamond Sword"
 * @param {string} typeId
 * @returns {string}
 */
export function translateItemName(typeId) {
  return typeId
    .split(":")
    .pop()
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string} objectiveName
 * @returns {number}
 */
export function getScore(player, objectiveName) {
  const objective = world.scoreboard.getObjective(objectiveName);
  return objective?.getScore(player) ?? 0;
}

/**
 * @param {import("@minecraft/server").Container} container
 * @param {string} typeId
 * @returns {number}
 */
export function getItemCount(container, typeId) {
  let total = 0;
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item && item.typeId === typeId) {
      total += item.amount;
    }
  }
  return total;
}

/**
 * @param {import("@minecraft/server").ItemStack} item
 * @returns {string}
 */
export function getItemIcon(item) {
  const typeId = item.typeId;
  const icon = item_texture_list.vanilla_icon[typeId];
  return icon || item_texture_list.unknown_icon.no_icon;
}

/**
 * @param {import("@minecraft/server").ItemStack} item
 * @param {"minecraft:enchantable"} componentId
 * @returns {import("@minecraft/server").ItemEnchantableComponent | undefined}
 */
export function getComponent(item, componentId) {
  return item.getComponent(componentId);
}
