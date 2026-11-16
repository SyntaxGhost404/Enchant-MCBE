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
import { EnchantmentTypes, ItemEnchantableComponent, ItemStack } from "@minecraft/server";
import { see_xp } from "../item_list";
import { getComponent, translateItemName, getScore, getItemCount, getItemIcon } from "../function";
import { config } from "../../config";

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

function showDisenchantOptions(player, item, slot, enchantments) {
  const form = new ActionFormData();
  form.title("arucube.enchant.disenchant");
  form.body(
    "§aALL :§f\nRemoves all enchantments present on the item and \npartially refunds the resources used to enchant the item.\n\n§aSingle :\n§fOpens a menu where you can remove enchantments individually and \nprecisely, adjusting the correct values accordingly.\n\n§cWarning:\n§6Once removed, whether individually or all at once, \nthe enchantments will be permanently deleted.\nSo, think carefully before proceeding.\n\n"
  );
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
  form.button(
    "Item Info:\n§aName:§f " +
      itemName +
      "\n§aDescription:§f " +
      description +
      "\n§aSlot:§f " +
      slotNumber +
      "\n§dEnchantments:§f " +
      enchantmentsText,
    icon
  );
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
    const xpRefund = Math.floor(xpValue * config.xp.refund);
    body += "\n§bTotal XP refund: §6" + xpRefund;
  }
  if (config.scores.state) {
    const scoreRefund = Math.floor(scoreValue * config.scores.refund);
    body += "\n§bTotal " + config.scores.display_name + " refund: §6" + scoreRefund;
  }
  body += "\n§f---------------------\n§6If you are sure of your choice, click confirm.\n\n§cOtherwise, click cancel.";
  form.body(body);
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
    const xpLevel = see_xp(player);
    summary += "§b" + config.xp.name + " : §a" + xpLevel + "\n";
  }
  summary += "§bPlayer : §a" + player.name;
  form.button("" + summary);
  const itemName = item.nameTag ?? translateItemName(item.typeId);
  const description = item.getLore().join("\n") || "No description";
  const slotNumber = slot;
  const itemEnchantable = getComponent(item, ItemEnchantableComponent.componentId);
  const itemEnchantments = itemEnchantable ? itemEnchantable.getEnchantments() : [];
  let enchantmentsText =
    itemEnchantments.length > 0
      ? itemEnchantments
          .map((itemEnchantment) => "\n- " + translateEnchantmentName(itemEnchantment.type.id) + ": §a" + itemEnchantment.level + "§f")
          .join("")
      : "None";
  const icon = getItemIcon(item);
  form.button(
    "Item Info:\n§aName:§f " +
      itemName +
      "\n§aDescription:§f " +
      description +
      "\n§aSlot:§f " +
      slotNumber +
      "\n§dEnchantments:§f " +
      enchantmentsText,
    icon
  );
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
        case 2:
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
            enchantments.forEach((itemEnchantment) => {
              enchantable.removeEnchantment(itemEnchantment.type);
            });
            container.setItem(slot, item);
            player.sendMessage("\ue0f3 §8>> §aEnchantments removed and resources refunded!");
          }
          if (item.typeId === "minecraft:enchanted_book") {
            let bookSlot = findItemSlot(container, "minecraft:book", 64);
            if (bookSlot === -1) {
              if (item.amount > 1) {
                const emptySlot = findEmptySlot(container);
                if (emptySlot !== -1) {
                  item.amount -= 1;
                  container.setItem(slot, item);
                  container.setItem(emptySlot, new ItemStack("minecraft:book", 1));
                } else {
                  container.setItem(slot, new ItemStack("minecraft:book", 1));
                }
              } else {
                container.setItem(slot, new ItemStack("minecraft:book", 1));
              }
            } else {
              let books = container.getItem(bookSlot);
              books.amount += 1;
              container.setItem(bookSlot, books);
              if (item.amount > 1) {
                item.amount -= 1;
                container.setItem(slot, item);
              } else {
                container.setItem(slot, null);
              }
            }
          }
          break;
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

function findEmptySlot(container) {
  for (let slot = 0; slot < container.size; slot++) {
    if (!container.getItem(slot)) {
      return slot;
    }
  }
  return -1;
}

function findItemSlot(container, typeId, maxAmount) {
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item && item.typeId === typeId && item.amount < maxAmount) {
      return slot;
    }
  }
  return -1;
}

async function showSingleRemoveForm(player, item, slot, enchantments) {
  const form = new ModalFormData();
  form.title("arucube.enchant.remove");
  let entries = [];
  enchantments.forEach((enchantment) => {
    const enchantmentName = translateEnchantmentName(enchantment.type.id);
    entries.push({
      enchantName: enchantmentName,
      level: enchantment.level,
      type: enchantment.type.id
    });
    form.slider("§f§l " + enchantmentName + " §a" + enchantment.level + "§c ", 0, enchantment.level, 1, enchantment.level);
  });
  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        return;
      }
      let levelsToRemove = {};
      let xpValue = 0;
      let scoreValue = 0;
      response.formValues.forEach((value, index) => {
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
        const removedLevels = levelsToRemove[enchantmentId];
        body += "\n§d- " + enchantmentName + " §6 " + currentLevel + " §c-" + removedLevels;
      });
      if (config.xp.state) {
        const xpRefund = Math.floor(xpValue * config.xp.refund);
        body += "\n§bTotal XP refund: §6" + xpRefund;
      }
      if (config.scores.state) {
        const scoreRefund = Math.floor(scoreValue * config.scores.refund);
        body += "\n§bTotal " + config.scores.display_name + " refund: §6" + scoreRefund;
      }
      body += "\n§f---------------------\n§6If you are sure of your choice, click confirm.\n\n§cOtherwise, click cancel.";
      confirmForm.body(body);
      let resourceSummary = "";
      if (config.scores.state) {
        const score = getScore(player, config.scores.score_name);
        resourceSummary += "§b" + config.scores.name + " : §a" + score + "\n";
      }
      if (config.items.state) {
        const itemCount = getItemCount(player.getComponent("minecraft:inventory").container, config.items.id);
        resourceSummary += "§b" + config.items.name + " : §a" + itemCount + "\n";
      }
      if (config.xp.state) {
        const xpLevel = see_xp(player);
        resourceSummary += "§b" + config.xp.name + " : §a" + xpLevel + "\n";
      }
      resourceSummary += "§bPlayer : §a" + player.name;
      confirmForm.button("" + resourceSummary);
      const itemName = item.nameTag ?? translateItemName(item.typeId);
      const description = item.getLore().join("\n") || "No description";
      const slotNumber = slot;
      const itemEnchantable = getComponent(item, ItemEnchantableComponent.componentId);
      const itemEnchantments = itemEnchantable ? itemEnchantable.getEnchantments() : [];
      let enchantmentsText =
        itemEnchantments.length > 0
          ? itemEnchantments
              .map((itemEnchantment) => "\n- " + translateEnchantmentName(itemEnchantment.type.id) + ": §a" + itemEnchantment.level + "§f")
              .join("")
          : "None";
      const icon = getItemIcon(item);
      confirmForm.button(
        "Item Info:\n§aName:§f " +
          itemName +
          "\n§aDescription:§f " +
          description +
          "\n§aSlot:§f " +
          slotNumber +
          "\n§dEnchantments:§f " +
          enchantmentsText,
        icon
      );
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
              player.sendMessage(
                "Item Info:\n§aName:§f " +
                  itemName +
                  "\n§aDescription:§f " +
                  description +
                  "\n§aSlot:§f " +
                  slotNumber +
                  "\n§dEnchantments:§f " +
                  enchantmentsText
              );
              break;
            case 2:
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
                enchantments.forEach((itemEnchantment) => {
                  const enchantmentId = itemEnchantment.type.id;
                  const removedLevels = levelsToRemove[enchantmentId];
                  if (removedLevels > 0) {
                    const currentLevel = itemEnchantment.level;
                    if (currentLevel > removedLevels) {
                      enchantable.removeEnchantment(itemEnchantment.type);
                      enchantable.addEnchantment({
                        type: EnchantmentTypes.get(enchantmentId),
                        level: currentLevel - removedLevels
                      });
                    } else {
                      enchantable.removeEnchantment(itemEnchantment.type);
                    }
                  }
                });
                const remainingEnchantments = enchantable.getEnchantments();
                if (remainingEnchantments.length === 0 && item.typeId === "minecraft:enchanted_book") {
                  let bookSlot = findItemSlot(container, "minecraft:book", 64);
                  if (bookSlot === -1) {
                    if (item.amount > 1) {
                      const emptySlot = findEmptySlot(container);
                      if (emptySlot !== -1) {
                        item.amount -= 1;
                        container.setItem(slot, item);
                        container.setItem(emptySlot, new ItemStack("minecraft:book", 1));
                      } else {
                        container.setItem(slot, new ItemStack("minecraft:book", 1));
                      }
                    } else {
                      container.setItem(slot, new ItemStack("minecraft:book", 1));
                    }
                  } else {
                    let books = container.getItem(bookSlot);
                    books.amount += 1;
                    container.setItem(bookSlot, books);
                    if (item.amount > 1) {
                      item.amount -= 1;
                      container.setItem(slot, item);
                    } else {
                      container.setItem(slot, null);
                    }
                  }
                } else {
                  container.setItem(slot, item);
                }
                player.sendMessage("\ue0f3 §8>> §aSelected enchantments removed and resources refunded!");
              }
              break;
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

function translateEnchantmentName(enchantmentId) {
  return enchantmentId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function refund_resources(player, xpRefund, scoreRefund) {
  if (xpRefund > 0) {
    player.runCommand("/xp " + xpRefund + "L @s");
  }
  if (scoreRefund > 0) {
    player.runCommand("/scoreboard players add @s " + config.scores.score_name + " " + scoreRefund);
  }
  return true;
}
