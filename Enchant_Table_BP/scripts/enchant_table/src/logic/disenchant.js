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
import { buildResourceSummary, getComponent, getItemIcon, translateEnchantmentName, translateItemName } from "../function";
import { config } from "../../config";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} item
 * @param {number} slot
 */
export async function prepareDisenchantments(player, item, slot) {
  const enchantable = getComponent(item, ItemEnchantableComponent.componentId);
  if (!enchantable) {
    player.sendMessage("\ue0f3 Item is not enchantable.");
    return;
  }
  const enchantments = enchantable.getEnchantments();
  if (enchantments.length === 0) {
    player.sendMessage("\ue0f3 §8>> §cItem has no enchantments.");
    return;
  }
  showDisenchantOptions(player, item, slot, enchantments);
}

/**
 * "Item Info" button text used by the disenchant screens.
 * @param {import("@minecraft/server").ItemStack} item
 * @param {number} slot
 * @returns {string}
 */
function buildItemInfo(item, slot) {
  const itemName = item.nameTag ?? translateItemName(item.typeId);
  const description = item.getLore().join("\n") || "No description";
  const enchantable = getComponent(item, ItemEnchantableComponent.componentId);
  const enchantments = enchantable ? enchantable.getEnchantments() : [];
  const enchantmentsText =
    enchantments.length > 0
      ? enchantments
          .map((enchantment) => "\n- " + translateEnchantmentName(enchantment.type.id) + ": §a" + enchantment.level + "§f")
          .join("")
      : "None";
  return (
    "Item Info:\n§aName:§f " +
    itemName +
    "\n§aDescription:§f " +
    description +
    "\n§aSlot:§f " +
    slot +
    "\n§dEnchantments:§f " +
    enchantmentsText
  );
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} item
 * @param {number} slot
 * @param {import("@minecraft/server").Enchantment[]} enchantments
 */
function showDisenchantOptions(player, item, slot, enchantments) {
  const form = new ActionFormData();
  form.title("arucube.enchant.disenchant");
  form.body(
    "§aALL :§f\nRemoves all enchantments present on the item and \npartially refunds the resources used to enchant the item.\n\n§aSingle :\n§fOpens a menu where you can remove enchantments individually and \nprecisely, adjusting the correct values accordingly.\n\n§cWarning:\n§6Once removed, whether individually or all at once, \nthe enchantments will be permanently deleted.\nSo, think carefully before proceeding.\n\n"
  );
  form.button("" + buildResourceSummary(player));
  form.button(buildItemInfo(item, slot), getItemIcon(item));
  form.button("§6Remove All Enchantments");
  form.button("§6Single Remove Enchantment");
  form
    .show(player)
    .then(({ selection, canceled }) => {
      if (canceled) {
        return;
      }
      if (selection === 2) {
        showRemoveEnchantConfirm(player, item, slot, enchantments);
      } else if (selection === 3) {
        showSingleRemoveForm(player, item, slot, enchantments);
      }
    })
    .catch((error) => {
      console.error(error, error.stack);
    });
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} item
 * @param {number} slot
 * @param {import("@minecraft/server").Enchantment[]} enchantments
 */
async function showRemoveEnchantConfirm(player, item, slot, enchantments) {
  const { container } = player.getComponent("minecraft:inventory");
  const form = new ActionFormData();
  form.title("arucube.enchant.disenchant_confirm");
  let body = "§f---------------------";
  let xpValue = 0;
  let scoreValue = 0;
  enchantments.forEach((enchantment) => {
    const enchantmentName = translateEnchantmentName(enchantment.type.id);
    const level = enchantment.level;
    body += "\n§d- " + enchantmentName + " " + level;
    xpValue += level * config.xp.xp_remove;
    scoreValue += level * config.scores.score_remove;
  });
  body += "\n§f---------------------";
  if (config.xp.state) {
    body += "\n§bTotal XP refund: §6" + Math.floor(xpValue * config.xp.refund);
  }
  if (config.scores.state) {
    body += "\n§bTotal " + config.scores.display_name + " refund: §6" + Math.floor(scoreValue * config.scores.refund);
  }
  body += "\n§f---------------------\n§6If you are sure of your choice, click confirm.\n\n§cOtherwise, click cancel.";
  form.body(body);
  form.button("" + buildResourceSummary(player));
  form.button(buildItemInfo(item, slot), getItemIcon(item));
  form.button(
    "§aConfirm : \n§fYou will proceed to remove the enchantments from your item.\nThe required resources will be refunded before proceeding."
  );
  form.button("§cCancel : \n§fThe procedure to remove enchantments from the item will be canceled.\nNo cost will be incurred");
  form
    .show(player)
    .then(({ selection, canceled }) => {
      if (canceled) {
        return;
      }
      switch (selection) {
        case 0:
          player.sendMessage("\ue0f3 §8>> §aOperation canceled.");
          break;
        case 1:
          player.sendMessage("\ue0f3 §8>> §aOperation canceled.");
          break;
        case 2: {
          let xpRefund = 0;
          let scoreRefund = 0;
          if (config.xp.state) {
            xpRefund = Math.floor(xpValue * config.xp.refund);
          }
          if (config.scores.state) {
            scoreRefund = Math.floor(scoreValue * config.scores.refund);
          }
          if (!refund_resources(player, xpRefund, scoreRefund)) {
            return;
          }
          const enchantable = item.getComponent("minecraft:enchantable");
          if (enchantable) {
            enchantments.forEach((enchantment) => {
              enchantable.removeEnchantment(enchantment.type);
            });
            container.setItem(slot, item);
            player.sendMessage("\ue0f3 §8>> §aEnchantments removed and resources refunded!");
          }
          if (item.typeId === "minecraft:enchanted_book") {
            convertEmptyEnchantedBook(container, item, slot);
          }
          break;
        }
        case 3:
          player.sendMessage("\ue0f3 §8>> §aOperation canceled.");
          break;
        default:
          break;
      }
    })
    .catch((error) => {
      console.error(error, error.stack);
    });
}

/**
 * Turns an enchanted book that has no enchantments left back into a regular book.
 * @param {import("@minecraft/server").Container} container
 * @param {import("@minecraft/server").ItemStack} book
 * @param {number} slot
 */
function convertEmptyEnchantedBook(container, book, slot) {
  const bookSlot = findItemSlot(container, "minecraft:book", 64);
  if (bookSlot === -1) {
    if (book.amount > 1) {
      const emptySlot = findEmptySlot(container);
      if (emptySlot !== -1) {
        book.amount -= 1;
        container.setItem(slot, book);
        container.setItem(emptySlot, new ItemStack("minecraft:book", 1));
      } else {
        container.setItem(slot, new ItemStack("minecraft:book", 1));
      }
    } else {
      container.setItem(slot, new ItemStack("minecraft:book", 1));
    }
  } else {
    const books = container.getItem(bookSlot);
    books.amount += 1;
    container.setItem(bookSlot, books);
    if (book.amount > 1) {
      book.amount -= 1;
      container.setItem(slot, book);
    } else {
      container.setItem(slot, undefined);
    }
  }
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
 * @param {import("@minecraft/server").Container} container
 * @param {string} typeId
 * @param {number} maxAmount
 * @returns {number}
 */
function findItemSlot(container, typeId, maxAmount) {
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item && item.typeId === typeId && item.amount < maxAmount) {
      return slot;
    }
  }
  return -1;
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} item
 * @param {number} slot
 * @param {import("@minecraft/server").Enchantment[]} enchantments
 */
async function showSingleRemoveForm(player, item, slot, enchantments) {
  const form = new ModalFormData();
  form.title("arucube.enchant.remove");
  const entries = [];
  enchantments.forEach((enchantment) => {
    const enchantmentName = translateEnchantmentName(enchantment.type.id);
    entries.push({ enchantName: enchantmentName, level: enchantment.level, type: enchantment.type.id });
    // @minecraft/server-ui 2.x: slider(label, min, max, { valueStep, defaultValue })
    form.slider("§f§l " + enchantmentName + " §a" + enchantment.level + "§c ", 0, enchantment.level, {
      valueStep: 1,
      defaultValue: enchantment.level
    });
  });
  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        return;
      }
      const levelsToRemove = {};
      let xpValue = 0;
      let scoreValue = 0;
      response.formValues.forEach((sliderValue, index) => {
        const value = /** @type {number} */ (sliderValue);
        const level = entries[index].level;
        if (value < level) {
          levelsToRemove[entries[index].type] = level - value;
          xpValue += (level - value) * config.xp.xp_remove;
          scoreValue += (level - value) * config.scores.score_remove;
        }
      });
      if (Object.keys(levelsToRemove).length === 0) {
        player.sendMessage("\ue0f3 §8>> §cNo enchantments selected for removal.");
        return;
      }
      const confirmForm = new ActionFormData();
      confirmForm.title("arucube.enchant.disenchant_confirm");
      let body = "§f---------------------";
      Object.keys(levelsToRemove).forEach((enchantmentId) => {
        const enchantmentName = translateEnchantmentName(enchantmentId);
        const currentLevel = enchantments.find((enchantment) => enchantment.type.id === enchantmentId).level;
        body += "\n§d- " + enchantmentName + " §6 " + currentLevel + " §c-" + levelsToRemove[enchantmentId];
      });
      if (config.xp.state) {
        body += "\n§bTotal XP refund: §6" + Math.floor(xpValue * config.xp.refund);
      }
      if (config.scores.state) {
        body += "\n§bTotal " + config.scores.display_name + " refund: §6" + Math.floor(scoreValue * config.scores.refund);
      }
      body += "\n§f---------------------\n§6If you are sure of your choice, click confirm.\n\n§cOtherwise, click cancel.";
      confirmForm.body(body);
      const resourceSummary = buildResourceSummary(player);
      confirmForm.button("" + resourceSummary);
      const itemInfo = buildItemInfo(item, slot);
      confirmForm.button(itemInfo, getItemIcon(item));
      confirmForm.button(
        "§aConfirm :\n§fYou will proceed to remove the enchantments from your item.\nThe required resources will be refunded before proceeding."
      );
      confirmForm.button("§cCancel :\n§fThe procedure to remove enchantments from the item will be canceled.\nNo cost will be incurred");
      confirmForm
        .show(player)
        .then(({ selection, canceled }) => {
          if (canceled) {
            return;
          }
          switch (selection) {
            case 0:
              player.sendMessage("XP, Score, Item Info:\n" + resourceSummary);
              break;
            case 1:
              player.sendMessage(itemInfo);
              break;
            case 2: {
              let xpRefund = 0;
              let scoreRefund = 0;
              if (config.xp.state) {
                xpRefund = Math.floor(xpValue * config.xp.refund);
              }
              if (config.scores.state) {
                scoreRefund = Math.floor(scoreValue * config.scores.refund);
              }
              if (!refund_resources(player, xpRefund, scoreRefund)) {
                return;
              }
              const enchantable = item.getComponent("minecraft:enchantable");
              if (enchantable) {
                const { container } = player.getComponent("minecraft:inventory");
                enchantments.forEach((enchantment) => {
                  const enchantmentId = enchantment.type.id;
                  const removed = levelsToRemove[enchantmentId];
                  if (removed > 0) {
                    const level = enchantment.level;
                    if (level > removed) {
                      enchantable.removeEnchantment(enchantment.type);
                      enchantable.addEnchantment({ type: EnchantmentTypes.get(enchantmentId), level: level - removed });
                    } else {
                      enchantable.removeEnchantment(enchantment.type);
                    }
                  }
                });
                const remaining = enchantable.getEnchantments();
                if (remaining.length === 0 && item.typeId === "minecraft:enchanted_book") {
                  convertEmptyEnchantedBook(container, item, slot);
                } else {
                  container.setItem(slot, item);
                }
                player.sendMessage("\ue0f3 §8>> §aSelected enchantments removed and resources refunded!");
              }
              break;
            }
            case 3:
              player.sendMessage("\ue0f3 §8>> §aOperation canceled.");
              break;
            default:
              break;
          }
        })
        .catch((error) => {
          console.error(error, error.stack);
        });
    })
    .catch((error) => {
      console.error(error, error.stack);
    });
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {number} xpRefund
 * @param {number} scoreRefund
 * @returns {boolean}
 */
function refund_resources(player, xpRefund, scoreRefund) {
  if (xpRefund > 0) {
    // Same effect as the previous "/xp <refund>L @s" command.
    player.addLevels(xpRefund);
  }
  if (scoreRefund > 0) {
    player.runCommand("scoreboard players add @s " + config.scores.score_name + " " + scoreRefund);
  }
  return true;
}
