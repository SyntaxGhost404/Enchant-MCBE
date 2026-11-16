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
* @upgrade Updated for Minecraft: Bedrock Edition 26.60+ (@minecraft/server 2.11.0, @minecraft/server-ui 2.3.0).
*/

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { EnchantmentTypes, ItemEnchantableComponent, ItemStack } from "@minecraft/server";
import { remove_resources } from "../item_list";
import {
  buildResourceSummary,
  enchantedTypeId,
  findIncompatibleEnchantments,
  getComponent,
  getItemIcon,
  sendIncompatibleMessage,
  translateEnchantmentName,
  translateItemName
} from "../function";
import { operationCost } from "../costs";
import { config } from "../../config";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} item
 * @param {number} slot
 */
export async function prepareEnchantments(player, item, slot) {
  const typeId = item.typeId;
  const enchantable = getComponent(item, ItemEnchantableComponent.componentId);
  if (!enchantable) {
    player.sendMessage("\ue0f3 Item is not enchantable.");
    return;
  }
  const applicable = getApplicableEnchantments(typeId);
  const currentLevels = {};
  enchantable.getEnchantments().forEach((enchantment) => {
    currentLevels[enchantment.type.id] = enchantment.level;
  });
  const existingIds = Object.keys(currentLevels);
  const resultTypeId = enchantedTypeId(typeId);
  const options = applicable
    .filter((enchantment) => {
      const currentLevel = currentLevels[enchantment.name] || 0;
      if (currentLevel >= enchantment.maxLevel) {
        return false;
      }
      // Hide enchantments that cannot be combined with one the item already has (e.g. Mending on a bow with Infinity).
      return findIncompatibleEnchantments(resultTypeId, [enchantment.name], existingIds).length === 0;
    })
    .map((enchantment) => ({
      name: enchantment.name,
      maxLevel: enchantment.maxLevel,
      currentLevel: currentLevels[enchantment.name] || 0
    }));
  if (options.length === 0) {
    player.sendMessage("\ue0f3 §8>> §cItem has reached its maximum enchantments.");
    return;
  }
  showItemEditor(player, slot, options);
}

/**
 * Every enchantment type that can be applied to a fresh item of this type.
 * @param {string} typeId
 * @returns {{ name: string, maxLevel: number }[]}
 */
function getApplicableEnchantments(typeId) {
  const sample = new ItemStack(typeId);
  const enchantable = getComponent(sample, "minecraft:enchantable");
  if (!enchantable) {
    return [];
  }
  return EnchantmentTypes.getAll()
    .filter((type) => enchantable.canAddEnchantment({ type: type, level: 1 }))
    .map((type) => ({ name: type.id, maxLevel: type.maxLevel }));
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {number} slot
 * @param {{ name: string, maxLevel: number, currentLevel: number }[]} options
 */
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
    // @minecraft/server-ui 2.x: slider(label, min, max, { valueStep, defaultValue })
    form.slider("§f§l " + translateEnchantmentName(option.name) + " §a", option.currentLevel, option.maxLevel, {
      valueStep: 1,
      defaultValue: option.currentLevel
    });
  });
  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        return;
      }
      /** @type {Record<string, number>} */
      const selectedLevels = {};
      let changed = false;
      let addedLevels = 0;
      response.formValues.forEach((sliderValue, index) => {
        const value = /** @type {number} */ (sliderValue);
        const currentLevel = options[index].currentLevel;
        if (value !== currentLevel) {
          selectedLevels[options[index].name] = value;
          changed = true;
          addedLevels += value - currentLevel;
        }
      });
      if (!changed) {
        player.sendMessage("\ue0f3 §8>> §cNo enchantments selected.");
        return;
      }
      const keptIds = (getComponent(item, ItemEnchantableComponent.componentId)?.getEnchantments() ?? [])
        .map((enchantment) => enchantment.type.id)
        .filter((enchantmentId) => !(enchantmentId in selectedLevels));
      const conflicts = findIncompatibleEnchantments(enchantedTypeId(item.typeId), Object.keys(selectedLevels), keptIds);
      if (conflicts.length > 0) {
        sendIncompatibleMessage(player, conflicts);
        return;
      }
      // Price for all the levels added (per level or flat, as chosen in the world's pack settings).
      const { xp: xpCost, score: scoreCost, essence: essenceCost } = operationCost(addedLevels);
      const costItemName = config.items.id
        .split(":")
        .pop()
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const confirmForm = new ActionFormData();
      confirmForm.title("arucube.enchant.confirm");
      confirmForm.button("" + buildResourceSummary(player));
      const itemName = item.nameTag ?? translateItemName(item.typeId);
      const description = item.getLore().join("\n") || "No description";
      const itemEnchantable = getComponent(item, ItemEnchantableComponent.componentId);
      const itemEnchantments = itemEnchantable ? itemEnchantable.getEnchantments() : [];
      const enchantmentsText =
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
          slot +
          "\n§dEnchantments:§f " +
          enchantmentsText,
        icon
      );
      let body = "§f---------------------";
      for (const enchantmentId in selectedLevels) {
        body += "\n§d- " + translateEnchantmentName(enchantmentId) + " " + selectedLevels[enchantmentId];
      }
      body += "\n§f---------------------";
      if (config.xp.state) {
        body += "\n§bTotal §aXP §bcost: §6" + xpCost;
      }
      if (config.scores.state) {
        body += "\n§bTotal §6" + config.scores.display_name + "§b cost: §6" + scoreCost;
      }
      if (config.items.state) {
        body += "\n§bItem §a" + costItemName + " §bcost: §6" + essenceCost + " ";
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
            case 2: {
              const emptySlot = findEmptySlot(container);
              if (item.typeId === "minecraft:book" && item.amount > 1 && emptySlot === -1) {
                player.sendMessage("\ue0f3 §8>> §cNo empty slot available for enchanted book.");
                container.setItem(slot, item);
                return;
              }
              // Build the enchanted result before paying, so an enchantment rejected by the game never costs resources.
              let result;
              try {
                result =
                  item.typeId === "minecraft:book"
                    ? createEnchantedBook(selectedLevels)
                    : applyEnchantmentLevels(item.clone(), selectedLevels);
              } catch (error) {
                console.warn("[Enchant+] Could not apply enchantments: " + error);
                player.sendMessage("\ue0f3 §8>> §cThese enchantments cannot be applied to this item.");
                container.setItem(slot, item);
                return;
              }
              if (!remove_resources(player, xpCost, scoreCost, essenceCost)) {
                player.sendMessage("\ue0f3 §8>> §cNot enough resources.");
                container.setItem(slot, item);
                return;
              }
              if (item.typeId === "minecraft:book") {
                if (item.amount > 1) {
                  item.amount -= 1;
                  container.setItem(slot, item);
                  container.setItem(emptySlot, result);
                } else {
                  container.setItem(slot, result);
                }
                player.sendMessage("\ue0f3 §8>> §aEnchanted book created and added to inventory!");
              } else {
                container.setItem(slot, result);
                player.sendMessage("\ue0f3 §8>> §aEnchantments applied!");
              }
              break;
            }
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

/**
 * @param {import("@minecraft/server").Container} container
 * @returns {number}
 */
function findEmptySlot(container) {
  for (let slot = 0; slot < container.size; slot++) {
    if (!container.getItem(slot)) {
      return slot;
    }
  }
  return -1;
}

/**
 * Sets each enchantment to the given level on the item stack (replacing the current level if present).
 * @param {import("@minecraft/server").ItemStack} itemStack
 * @param {Record<string, number>} levels
 * @returns {import("@minecraft/server").ItemStack}
 */
function applyEnchantmentLevels(itemStack, levels) {
  const enchantable = itemStack.getComponent("minecraft:enchantable");
  if (!enchantable) {
    throw new Error("Item is not enchantable.");
  }
  for (const enchantmentId in levels) {
    const type = EnchantmentTypes.get(enchantmentId);
    if (enchantable.hasEnchantment(type)) {
      enchantable.removeEnchantment(type);
    }
    enchantable.addEnchantment({ type: type, level: levels[enchantmentId] });
  }
  return itemStack;
}

/**
 * @param {Record<string, number>} levels
 * @returns {import("@minecraft/server").ItemStack}
 */
function createEnchantedBook(levels) {
  const book = new ItemStack("minecraft:enchanted_book", 1);
  const enchantable = book.getComponent("minecraft:enchantable");
  if (enchantable) {
    for (const enchantmentId in levels) {
      enchantable.addEnchantment({ type: EnchantmentTypes.get(enchantmentId), level: levels[enchantmentId] });
    }
  }
  return book;
}
