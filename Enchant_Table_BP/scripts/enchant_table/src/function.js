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

import { ActionFormData } from "@minecraft/server-ui";
import { ItemEnchantableComponent, EnchantmentTypes, world } from "@minecraft/server";
import { prepareEnchantments } from "./logic/enchant";
import { prepareDisenchantments } from "./logic/disenchant";
import { item_texture_list, see_xp } from "./item_list";
import { prepareEnchantmentTransfer } from "./logic/transfer";
import { config } from "../config";

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
      enchantableItems.push({
        item,
        index: slot
      });
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
    let summary = "";
    if (config.scores.state) {
      const score = getScore(player, config.scores.score_name);
      summary += "§b" + config.scores.name + " : §a" + score + "\n";
    }
    if (config.items.state) {
      const itemCount = getItemCount(container, config.items.id);
      summary += "§b" + config.items.name + " : §a" + itemCount + "\n";
    }
    if (config.xp.state) {
      const level = see_xp(player);
      summary += "§b" + config.xp.name + " : §a" + level + "\n";
    }
    summary += "§bPlayer : §a" + player.name;
    form.button("" + summary);
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
    } else {
      const selected = enchantableItems[selection - 1];
      if (!selected) {
        return;
      }
      showSecondForm(player, selected, enchantableItems);
    }
  });
}

function showSecondForm(player, selected, enchantableItems) {
  const form = new ActionFormData();
  form.title("arucube.enchant.home_select_info");
  form.body("§fList of Enchantable Items:§a " + enchantableItems.length + "\n§8");
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
  form.button("" + summary);
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
  let enchantmentsText =
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
    } else if (otherItems.hasOwnProperty(selection)) {
      const otherItem = otherItems[selection];
      showSecondForm(player, otherItem, enchantableItems);
    }
  });
}

function translateEnchantmentName(enchantmentId) {
  return enchantmentId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function translateItemName(typeId) {
  return typeId
    .split(":")
    .pop()
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getScore(player, objectiveName) {
  const objective = world.scoreboard.getObjective(objectiveName);
  return objective.getScore(player) ?? 0;
}

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

export function getItemIcon(item) {
  const typeId = item.typeId;
  const icon = item_texture_list.vanilla_icon[typeId];
  return icon || item_texture_list.unknown_icon.no_icon;
}

export function getComponent(item, componentId) {
  return item.getComponent(componentId);
}
