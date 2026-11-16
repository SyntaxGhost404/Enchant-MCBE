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

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { enchant_incompatible, see_xp } from "../item_list";
import { EnchantmentTypes, ItemEnchantableComponent, ItemStack } from "@minecraft/server";
import { getComponent, translateItemName, getScore, getItemCount, getItemIcon } from "../function";
import { remove_resources } from "../item_list";
import { config } from "../../config";

export async function prepareEnchantments(player, item, slot) {
  const typeId = item.typeId;
  const enchantable = getComponent(item, ItemEnchantableComponent.componentId);
  if (!enchantable) {
    player.sendMessage("\ue0f3 Item is not enchantable.");
    return;
  }
  const applicable = getApplicableEnchantments(typeId);
  const existingEnchantments = enchantable.getEnchantments();
  const currentLevels = {};
  existingEnchantments.forEach((enchantment) => {
    currentLevels[enchantment.type.id] = enchantment.level;
  });
  const options = applicable
    .filter((enchantment) => {
      const currentLevel = currentLevels[enchantment.name] || 0;
      if (currentLevel >= enchantment.maxLevel) {
        return false;
      }
      for (let existingId in currentLevels) {
        if (enchant_incompatible[existingId]?.includes(enchantment.name)) {
          return false;
        }
      }
      return true;
    })
    .map((enchantment) => {
      const currentLevel = currentLevels[enchantment.name] || 0;
      return {
        name: enchantment.name,
        maxLevel: enchantment.maxLevel,
        currentLevel
      };
    });
  if (options.length === 0) {
    player.sendMessage("\ue0f3 §8>> §cItem has reached its maximum enchantments.");
    return;
  }
  showItemEditor(player, slot, options);
}

function getApplicableEnchantments(typeId) {
  const sample = new ItemStack(typeId);
  const enchantable = getComponent(sample, "minecraft:enchantable");
  if (!enchantable) {
    return [];
  }
  return EnchantmentTypes.getAll()
    .filter((type) =>
      enchantable.canAddEnchantment({
        type,
        level: 1
      })
    )
    .map((type) => ({
      name: type.id,
      maxLevel: type.maxLevel
    }));
}

async function showItemEditor(player, slot, options) {
  const { container } = player.getComponent("minecraft:inventory");
  const item = container.getItem(slot);
  if (!item) {
    player.sendMessage("\ue0f3 No item found in the specified slot.");
    return;
  }
  const form = new ModalFormData();
  form.title("arucube.enchant.add");
  options.forEach((option) => {
    form.slider("§f§l " + translateEnchantmentName(option.name) + " §a", option.currentLevel, option.maxLevel, 1, option.currentLevel);
  });
  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        return;
      }
      let selectedLevels = {};
      let conflicts = new Set();
      let changed = false;
      let xpCost = 0;
      let scoreCost = 0;
      response.formValues.forEach((value, index) => {
        const currentLevel = options[index].currentLevel;
        if (value !== currentLevel) {
          selectedLevels[options[index].name] = value;
          changed = true;
          const addedLevels = value - currentLevel;
          if (config.xp.state) {
            xpCost += addedLevels * config.xp.xp_remove;
          }
          if (config.scores.state) {
            scoreCost += addedLevels * config.scores.score_remove;
          }
        }
      });
      if (!changed) {
        player.sendMessage("\ue0f3 §8>> §cNo enchantments selected.");
        return;
      }
      for (let enchantmentId in selectedLevels) {
        for (let incompatibleId of enchant_incompatible[enchantmentId] || []) {
          if (selectedLevels[incompatibleId]) {
            let conflict = [enchantmentId, incompatibleId].sort().join(" and ");
            conflicts.add(conflict);
          }
        }
      }
      if (conflicts.size > 0) {
        let message = "\ue0f3 §cThe following enchantments are not compatible:§f\n---------------------------------§6\n";
        conflicts.forEach((conflict) => {
          message += "   - " + conflict + "\n";
        });
        player.sendMessage(message);
        return;
      }
      const costItemName = config.items.id
        .split(":")
        .pop()
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const confirmForm = new ActionFormData();
      confirmForm.title("arucube.enchant.confirm");
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
      confirmForm.button("" + summary);
      const itemName = item.nameTag ?? translateItemName(item.typeId);
      const description = item.getLore().join("\n") || "No description";
      const slotNumber = slot;
      const itemEnchantable = getComponent(item, ItemEnchantableComponent.componentId);
      const itemEnchantments = itemEnchantable ? itemEnchantable.getEnchantments() : [];
      let enchantmentsText =
        itemEnchantments.length > 0
          ? itemEnchantments
              .map((enchantment) => "\n- " + translateEnchantmentName(enchantment.type.id) + ": §a" + enchantment.level + "§f")
              .join("")
          : "None";
      const icon = getItemIcon(item);
      confirmForm.button(
        "\n§aName:§f \n" +
          itemName +
          "\n§aDescription:§f \n" +
          description +
          "\n§aSlot:§f " +
          slotNumber +
          "\n§dEnchantments:§f " +
          enchantmentsText,
        icon
      );
      let body = "§f---------------------";
      for (let enchantmentId in selectedLevels) {
        const enchantmentName = translateEnchantmentName(enchantmentId);
        const selectedLevel = selectedLevels[enchantmentId];
        body += "\n§d- " + enchantmentName + " " + selectedLevel;
      }
      body += "\n§f---------------------";
      if (config.xp.state) {
        body += "\n§bTotal §aXP §bcost: §6" + xpCost;
      }
      if (config.scores.state) {
        body += "\n§bTotal §6" + config.scores.display_name + "§b cost: §6" + scoreCost;
      }
      if (config.items.state) {
        body += "\n§bItem §a" + costItemName + " §bcost: §6" + config.items.amount + " ";
      }
      body += "\n§f---------------------\n§6If you are sure of your choice, click confirm.\n\n§cOtherwise, click cancel.";
      confirmForm.body(body);
      confirmForm.button(
        "§aConfirm : \n§fYou will proceed to apply the enchantments to your item.\n The required resources will be removed before proceeding."
      );
      confirmForm.button(
        "§cCancel : \n§fThe procedure to add enchantments to the item will be canceled. \nNo cost will be incurred for this."
      );
      confirmForm
        .show(player)
        .then(({ selection, canceled }) => {
          if (canceled) {
            container.setItem(slot, item);
            return;
          }
          switch (selection) {
            case 0:
              player.sendMessage("\ue0f3 §8>> §aOperation canceled.");
              container.setItem(slot, item);
              break;
            case 1:
              player.sendMessage("\ue0f3 §8>> §aOperation canceled.");
              container.setItem(slot, item);
              break;
            case 2:
              const emptySlot = findEmptySlot(container);
              if (item.typeId === "minecraft:book" && item.amount > 1 && emptySlot === -1) {
                player.sendMessage("\ue0f3 §8>> §cNo empty slot available for enchanted book.");
                container.setItem(slot, item);
                return;
              }
              if (!remove_resources(player, xpCost, scoreCost, config.items.amount)) {
                player.sendMessage("\ue0f3 §8>> §cNot enough resources.");
                container.setItem(slot, item);
                return;
              }
              if (item.typeId === "minecraft:book") {
                if (item.amount > 1) {
                  if (emptySlot === -1) {
                    player.sendMessage("\ue0f3 §8>> §cNo empty slot available for enchanted book.");
                    container.setItem(slot, item);
                    return;
                  }
                  item.amount -= 1;
                  container.setItem(slot, item);
                  const enchantedBook = createEnchantedBook(selectedLevels);
                  container.setItem(emptySlot, enchantedBook);
                } else {
                  const enchantedBook = createEnchantedBook(selectedLevels);
                  container.setItem(slot, enchantedBook);
                }
                player.sendMessage("\ue0f3 §8>> §aEnchanted book created and added to inventory!");
              } else {
                const enchantable = item.getComponent("minecraft:enchantable");
                if (enchantable) {
                  for (let enchantmentId in selectedLevels) {
                    enchantable.addEnchantment({
                      type: EnchantmentTypes.get(enchantmentId),
                      level: selectedLevels[enchantmentId]
                    });
                  }
                  container.setItem(slot, item);
                  player.sendMessage("\ue0f3 §8>> §aEnchantments applied!");
                }
              }
              break;
            case 3:
              player.sendMessage("\ue0f3 §8>> §aOperation canceled.");
              container.setItem(slot, item);
              break;
            default:
              container.setItem(slot, item);
              break;
          }
        })
        .catch((error) => {
          console.error(error, error.stack);
          container.setItem(slot, item);
        });
    })
    .catch((error) => {
      console.error(error, error.stack);
      container.setItem(slot, item);
    });
}

function findEmptySlot(container) {
  for (let slot = 0; slot < container.size; slot++) {
    if (!container.getItem(slot)) {
      return slot;
    }
  }
  return -1;
}

function createEnchantedBook(levels) {
  const book = new ItemStack("minecraft:enchanted_book", 1);
  const enchantable = book.getComponent("minecraft:enchantable");
  if (enchantable) {
    for (let enchantmentId in levels) {
      enchantable.addEnchantment({
        type: EnchantmentTypes.get(enchantmentId),
        level: levels[enchantmentId]
      });
    }
  }
  return book;
}

function translateEnchantmentName(enchantmentId) {
  return enchantmentId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
