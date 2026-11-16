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
import { config } from "../../config";
import { operationCost } from "../costs";
import { remove_resources } from "../item_list";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} item
 * @param {number} slot
 */
export async function prepareEnchantmentTransfer(player, item, slot) {
  const enchantable = getComponent(item, ItemEnchantableComponent.componentId);
  if (!enchantable) {
    player.sendMessage("Item is not enchantable.");
    return;
  }
  const enchantments = enchantable.getEnchantments();
  if (enchantments.length === 0) {
    player.sendMessage("\ue0f3 §8>> §cItem has no enchantments.");
    return;
  }
  showItemSelection(player, item, slot, enchantments);
}

/**
 * "\n- Name: §aLevel§f" lines used by the item description buttons.
 * @param {import("@minecraft/server").ItemStack} item
 * @returns {string}
 */
function formatEnchantmentList(item) {
  const enchantments = item.getComponent(ItemEnchantableComponent.componentId)?.getEnchantments() || [];
  return enchantments.length > 0
    ? enchantments.map((enchantment) => "\n- " + translateEnchantmentName(enchantment.type.id) + ": §a" + enchantment.level + "§f").join("")
    : "None";
}

/**
 * Step 1: choose the item that will receive the enchantments.
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} firstItem
 * @param {number} firstSlot
 * @param {import("@minecraft/server").Enchantment[]} enchantments
 */
async function showItemSelection(player, firstItem, firstSlot, enchantments) {
  const container = player.getComponent("minecraft:inventory").container;
  const candidates = [];
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item && slot !== firstSlot) {
      if (getComponent(item, ItemEnchantableComponent.componentId)) {
        candidates.push({ item: item, index: slot });
      }
    }
  }
  if (candidates.length === 0) {
    player.sendMessage("\ue0f3 §8>> §cNo enchantable items to display!");
    return;
  }
  const form = new ActionFormData();
  form.title("arucube.enchant.trasfer_second");
  form.body("§fList of Enchantable Items:§a " + candidates.length + "\n§8");
  form.button("" + buildResourceSummary(player));
  const firstName = firstItem.nameTag ?? translateItemName(firstItem.typeId);
  const firstDescription = firstItem.getLore().join("\n") || "No description";
  const firstSlotText = firstSlot;
  const firstEnchantmentsText = formatEnchantmentList(firstItem);
  const firstIcon = getItemIcon(firstItem);
  form.button(
    "\n§bFirst Item :\n§aName:§f " +
      firstName +
      "\n§aDescription:§f " +
      firstDescription +
      "\n§aSlot:§f " +
      firstSlotText +
      "\n§dEnchantments:§f " +
      firstEnchantmentsText,
    firstIcon
  );
  const buttonTargets = {};
  let buttonIndex = 2;
  for (let i = 0; i < candidates.length; i++) {
    const { item, index } = candidates[i];
    const itemName = item.nameTag ?? translateItemName(item.typeId);
    const icon = getItemIcon(item);
    const enchantCount = item.getComponent(ItemEnchantableComponent.componentId)?.getEnchantments().length || 0;
    form.button("Name: " + itemName + "\nSlot: " + index + "\nEnchant: " + enchantCount, icon);
    buttonTargets[buttonIndex] = candidates[i];
    buttonIndex++;
  }
  form
    .show(player)
    .then(({ selection, canceled }) => {
      if (canceled) {
        return;
      }
      if (selection === 0) {
        return;
      }
      if (selection === 1) {
        return;
      }
      const target = buttonTargets[selection];
      const secondItem = target?.item;
      if (!secondItem) {
        player.sendMessage("\ue0f3 Invalid selection.");
        return;
      }
      showSecondItemSelectionForm(
        player,
        firstItem,
        firstSlot,
        secondItem,
        target.index,
        enchantments,
        firstName,
        firstDescription,
        firstSlotText,
        firstEnchantmentsText,
        firstIcon
      );
    })
    .catch((error) => {
      console.error(error, error.stack);
    });
}

/**
 * Step 2: review both items (or pick another receiving item) and continue.
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} firstItem
 * @param {number} firstSlot
 * @param {import("@minecraft/server").ItemStack} secondItem
 * @param {number} secondSlot
 * @param {import("@minecraft/server").Enchantment[]} enchantments
 * @param {string} firstName
 * @param {string} firstDescription
 * @param {number} firstSlotText
 * @param {string} firstEnchantmentsText
 * @param {string} firstIcon
 */
async function showSecondItemSelectionForm(
  player,
  firstItem,
  firstSlot,
  secondItem,
  secondSlot,
  enchantments,
  firstName,
  firstDescription,
  firstSlotText,
  firstEnchantmentsText,
  firstIcon
) {
  const container = player.getComponent("minecraft:inventory").container;
  const candidates = [];
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item && slot !== firstSlot && slot !== secondSlot) {
      if (getComponent(item, ItemEnchantableComponent.componentId)) {
        candidates.push({ item: item, index: slot });
      }
    }
  }
  const form = new ActionFormData();
  form.title("arucube.enchant.trasfer_second_item");
  form.body("§fList of Enchantable Items:§a " + candidates.length + "\n§8");
  form.button("" + buildResourceSummary(player));
  const secondName = secondItem.nameTag ?? translateItemName(secondItem.typeId);
  const secondDescription = secondItem.getLore().join("\n") || "No description";
  const secondSlotText = secondSlot;
  const secondEnchantmentsText = formatEnchantmentList(secondItem);
  const secondIcon = getItemIcon(secondItem);
  form.button(
    "\n§bFirst Item :\n\n§aName:§f " +
      firstName +
      "\n§aDescription:§f " +
      firstDescription +
      "\n§aSlot:§f " +
      firstSlotText +
      "\n§dEnchantments:§f " +
      firstEnchantmentsText +
      "\n§f\n---------------\n" +
      ("\n§bSecond Item :\n\n§aName:§f " +
        secondName +
        "\n§aDescription:§f " +
        secondDescription +
        "\n§aSlot:§f " +
        secondSlotText +
        "\n§dEnchantments:§f " +
        secondEnchantmentsText),
    firstIcon
  );
  form.button("§aSecond Item Icon", secondIcon);
  form.button("Confirm");
  const buttonTargets = {};
  let buttonIndex = 4;
  for (let i = 0; i < candidates.length; i++) {
    const { item, index } = candidates[i];
    const itemName = item.nameTag ?? translateItemName(item.typeId);
    const icon = getItemIcon(item);
    const enchantCount = getEnchantmentsFromItem(item).length || 0;
    form.button("Name: " + itemName + "\nSlot: " + index + "\nEnchant: " + enchantCount, icon);
    buttonTargets[buttonIndex] = candidates[i];
    buttonIndex++;
  }
  form
    .show(player)
    .then(({ selection, canceled }) => {
      if (canceled) {
        return;
      }
      switch (selection) {
        case 0:
          break;
        case 1:
          break;
        case 2:
          break;
        case 3:
          prepareCompatibleEnchantments(player, firstItem, firstSlot, secondItem, secondSlot);
          break;
        default: {
          const target = buttonTargets[selection];
          if (target) {
            showSecondItemSelectionForm(
              player,
              firstItem,
              firstSlot,
              target.item,
              target.index,
              enchantments,
              firstName,
              firstDescription,
              firstSlotText,
              firstEnchantmentsText,
              firstIcon
            );
          } else {
            player.sendMessage("\ue0f3 Invalid selection.");
          }
        }
      }
    })
    .catch((error) => {
      console.error(error, error.stack);
    });
}

/**
 * Step 3: choose how many levels of each compatible enchantment to move.
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} firstItem
 * @param {number} firstSlot
 * @param {import("@minecraft/server").ItemStack} secondItem
 * @param {number} secondSlot
 * @param {{ type: string, level: number, maxLevel: number }[]} transferable
 */
async function showEnchantmentTransferForm(player, firstItem, firstSlot, secondItem, secondSlot, transferable) {
  const form = new ModalFormData();
  form.title("arucube.enchant.transfer");
  transferable.forEach((entry) => {
    const enchantmentName = translateEnchantmentName(entry.type);
    const enchantmentId = String(entry.type);
    const sourceEnchantable = getComponent(firstItem, ItemEnchantableComponent.componentId);
    if (!sourceEnchantable) {
      console.error("\ue0f3 Source item does not have an enchantable component: " + firstItem.typeId);
      return;
    }
    const enchantment = sourceEnchantable.getEnchantment(EnchantmentTypes.get(enchantmentId));
    const level = enchantment ? enchantment.level : 0;
    if (isNaN(level)) {
      console.error("\ue0f3 Invalid level for enchantment " + enchantmentId + ": level=" + level);
      return;
    }
    // @minecraft/server-ui 2.x: slider(label, min, max, { valueStep, defaultValue })
    form.slider("§f§l " + enchantmentName + " §6", 0, level, { valueStep: 1, defaultValue: level });
  });
  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        return;
      }
      /** @type {Record<string, number>} */
      const levelsToTransfer = {};
      transferable.forEach((entry, index) => {
        const keptLevel = /** @type {number} */ (response.formValues[index]);
        const level = entry.level;
        if (keptLevel < level) {
          levelsToTransfer[entry.type] = level - keptLevel;
        }
      });
      if (Object.keys(levelsToTransfer).length === 0) {
        player.sendMessage("\ue0f3 §8>> §cNo enchantments selected for transfer.");
        return;
      }
      // The receiving item keeps its own enchantments: refuse pairs that cannot be combined (e.g. Smite onto a Sharpness sword).
      const conflicts = findIncompatibleEnchantments(
        enchantedTypeId(secondItem.typeId),
        Object.keys(levelsToTransfer),
        getEnchantmentsFromItem(secondItem).map((enchantment) => enchantment.type.id)
      );
      if (conflicts.length > 0) {
        sendIncompatibleMessage(player, conflicts);
        return;
      }
      confirmEnchantmentTransfer(player, firstItem, firstSlot, secondItem, secondSlot, levelsToTransfer);
    })
    .catch((error) => {
      console.error(error, error.stack);
    });
}

/**
 * Step 4: summary of what is removed/added and the total cost.
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} firstItem
 * @param {number} firstSlot
 * @param {import("@minecraft/server").ItemStack} secondItem
 * @param {number} secondSlot
 * @param {Record<string, number>} levelsToTransfer
 */
async function confirmEnchantmentTransfer(player, firstItem, firstSlot, secondItem, secondSlot, levelsToTransfer) {
  try {
    const form = new ActionFormData();
    form.title("arucube.enchant.trasfer_second_item_confirm");
    let body = "§cRemove from\n§bItem: " + (firstItem.nameTag ?? translateItemName(firstItem.typeId)) + "\n§dEnchant:\n";
    Object.keys(levelsToTransfer).forEach((enchantmentId) => {
      body += "§6- " + translateEnchantmentName(enchantmentId) + " -" + levelsToTransfer[enchantmentId] + "\n";
    });
    body += "\n§aAdd on\n§bItem: " + (secondItem.nameTag ?? translateItemName(secondItem.typeId)) + "\n§dEnchant:\n";
    Object.keys(levelsToTransfer).forEach((enchantmentId) => {
      body += "§6- " + translateEnchantmentName(enchantmentId) + " +" + levelsToTransfer[enchantmentId] + "\n";
    });
    // Price for all the levels moved (per level or flat, as chosen in the world's pack settings).
    const movedLevels = Object.values(levelsToTransfer).reduce((total, levels) => total + levels, 0);
    const { xp: xpCost, score: scoreCost, essence: itemCost } = operationCost(movedLevels);
    body += "\n§f---------------------";
    if (config.xp.state) {
      body += "\n§bTotal §aXP §bcost: §6" + xpCost;
    }
    if (config.scores.state) {
      body += "\n§bTotal §6" + config.scores.display_name + "§b cost: §6" + scoreCost;
    }
    if (config.items.state) {
      body += "\n§bItem §a" + config.items.name + " §bcost: §6" + itemCost;
    }
    body += "\n§f---------------------\n§6If you are sure of your choice, click confirm.\n\n§cOtherwise, click cancel.";
    form.body(body);
    form.button("" + buildResourceSummary(player));
    const firstName = firstItem.nameTag ?? translateItemName(firstItem.typeId);
    const firstDescription = firstItem.getLore().join("\n") || "No description";
    const firstEnchantments =
      getEnchantmentsFromItem(firstItem)
        .map((enchantment) => "§f- " + translateEnchantmentName(enchantment.type.id) + ": §a" + enchantment.level)
        .join("\n") || "None";
    const secondName = secondItem.nameTag ?? translateItemName(secondItem.typeId);
    const secondDescription = secondItem.getLore().join("\n") || "No description";
    const secondEnchantments =
      getEnchantmentsFromItem(secondItem)
        .map((enchantment) => "§f- " + translateEnchantmentName(enchantment.type.id) + ": §a" + enchantment.level)
        .join("\n") || "None";
    const itemsText =
      "\n§bFirst Item:\n\n§aName:§f " +
      firstName +
      "\n§aDescription:§f " +
      firstDescription +
      "\n§aSlot:§f " +
      firstSlot +
      "\n§dEnchantments:§f\n" +
      firstEnchantments +
      "\n§f---------------\n§bSecond Item:\n\n§aName:§f " +
      secondName +
      "\n§aDescription:§f " +
      secondDescription +
      "\n§aSlot:§f " +
      secondSlot +
      "\n§dEnchantments:§f\n" +
      secondEnchantments +
      "\n§f---------------";
    form.button(itemsText, getItemIcon(firstItem));
    form.button("Text", getItemIcon(secondItem));
    form.button(
      "§aConfirm :\n§fProceed with transferring the enchantments from the \nfirst item to the second item. \nThe costs are listed above."
    );
    form.button("§cCancel :\n§fThe transfer of enchantments will be canceled. \nNo costs will be incurred.\n");
    const { selection, canceled } = await form.show(player);
    if (canceled) {
      player.sendMessage("\ue0f3 §8>> §aOperation canceled.");
      return;
    }
    switch (selection) {
      case 0:
        break;
      case 1:
        break;
      case 2:
        break;
      case 3:
        transferEnchantments(player, firstItem, firstSlot, secondItem, secondSlot, levelsToTransfer, xpCost, scoreCost, itemCost);
        break;
      case 4:
        player.sendMessage("\ue0f3 §8>> §aOperation canceled.");
        break;
      default:
        player.sendMessage("\ue0f3 Unknown selection.");
    }
  } catch (error) {
    console.error(error, error.stack);
  }
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} firstItem
 * @param {number} firstSlot
 * @param {import("@minecraft/server").ItemStack} secondItem
 * @param {number} secondSlot
 * @param {Record<string, number>} levelsToTransfer
 * @param {number} xpCost
 * @param {number} scoreCost
 * @param {number} itemCost
 */
function transferEnchantments(player, firstItem, firstSlot, secondItem, secondSlot, levelsToTransfer, xpCost, scoreCost, itemCost) {
  try {
    const container = player.getComponent("minecraft:inventory").container;
    const targetEnchantable = secondItem.getComponent("minecraft:enchantable");
    let exceedsMaxLevel = false;
    for (const enchantmentId in levelsToTransfer) {
      const levels = parseInt(String(levelsToTransfer[enchantmentId]), 10);
      const type = EnchantmentTypes.get(enchantmentId);
      const existing = targetEnchantable.getEnchantment(type);
      const total = (existing ? existing.level : 0) + levels;
      if (total > type.maxLevel) {
        exceedsMaxLevel = true;
        break;
      }
    }
    if (exceedsMaxLevel) {
      player.sendMessage("\ue0f3 §8>> §cEnchantment level exceeds maximum allowed for the item.");
      return;
    }
    // A stack of books needs a free slot for the new enchanted book. Check it before anything is paid or changed.
    let enchantedBookSlot = secondSlot;
    if (secondItem.typeId === "minecraft:book" && secondItem.amount > 1) {
      enchantedBookSlot = findEmptySlot(container);
      if (enchantedBookSlot === -1) {
        player.sendMessage("\ue0f3 §8>> §cNo empty slot available for enchanted book.");
        return;
      }
    }
    // Build both results on copies first, so an enchantment rejected by the game never costs resources or enchantments.
    let newFirstItem;
    let newSecondItem;
    try {
      newFirstItem = firstItem.clone();
      removeEnchantmentLevels(newFirstItem.getComponent("minecraft:enchantable"), levelsToTransfer);
      if (secondItem.typeId === "minecraft:book") {
        newSecondItem = createEnchantedBook(levelsToTransfer);
      } else {
        newSecondItem = secondItem.clone();
        addEnchantmentsToItem(newSecondItem.getComponent("minecraft:enchantable"), levelsToTransfer);
      }
    } catch (error) {
      console.warn("[Enchant+] Could not transfer enchantments: " + error);
      player.sendMessage("\ue0f3 §8>> §cThese enchantments cannot be transferred to this item.");
      return;
    }
    if (!remove_resources(player, xpCost, scoreCost, itemCost)) {
      player.sendMessage("\ue0f3 §8>> §cFailed to transfer enchantments due to insufficient resources.");
      return;
    }
    // Receiving item first, then the source item (an emptied enchanted book may merge into a book stack).
    if (secondItem.typeId === "minecraft:book") {
      if (secondItem.amount > 1) {
        secondItem.amount -= 1;
        container.setItem(secondSlot, secondItem);
      }
      container.setItem(enchantedBookSlot, newSecondItem);
    } else {
      container.setItem(secondSlot, newSecondItem);
    }
    if (
      newFirstItem.typeId === "minecraft:enchanted_book" &&
      newFirstItem.getComponent("minecraft:enchantable").getEnchantments().length === 0
    ) {
      handleEmptyEnchantedBook(container, newFirstItem, firstSlot);
    } else {
      container.setItem(firstSlot, newFirstItem);
    }
    player.sendMessage("\ue0f3 §8>> §aEnchantments transferred successfully.");
  } catch (error) {
    console.error(error, error.stack);
    player.sendMessage("\ue0f3 §8>> §cFailed to transfer enchantments.");
  }
}

/**
 * Turns an enchanted book that has no enchantments left back into a regular book.
 * @param {import("@minecraft/server").Container} container
 * @param {import("@minecraft/server").ItemStack} book
 * @param {number} slot
 */
function handleEmptyEnchantedBook(container, book, slot) {
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
 * Lowers (or removes) each enchantment on the source item by the transferred number of levels.
 * @param {import("@minecraft/server").ItemEnchantableComponent} enchantable
 * @param {Record<string, number>} levelsToTransfer
 */
function removeEnchantmentLevels(enchantable, levelsToTransfer) {
  for (const enchantmentId in levelsToTransfer) {
    const levels = parseInt(String(levelsToTransfer[enchantmentId]), 10);
    const type = EnchantmentTypes.get(enchantmentId);
    const existing = enchantable.getEnchantment(type);
    if (existing) {
      const remaining = existing.level - levels;
      enchantable.removeEnchantment(type);
      if (remaining > 0) {
        enchantable.addEnchantment({ type: type, level: remaining });
      }
    }
  }
}

/**
 * Adds the transferred levels on top of the levels the receiving item already has.
 * @param {import("@minecraft/server").ItemEnchantableComponent} enchantable
 * @param {Record<string, number>} levelsToTransfer
 */
function addEnchantmentsToItem(enchantable, levelsToTransfer) {
  for (const enchantmentId in levelsToTransfer) {
    const type = EnchantmentTypes.get(enchantmentId);
    const existing = enchantable.getEnchantment(type);
    const newLevel = (existing ? existing.level : 0) + parseInt(String(levelsToTransfer[enchantmentId]), 10);
    if (existing) {
      enchantable.removeEnchantment(type);
    }
    enchantable.addEnchantment({ type: type, level: newLevel });
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

/**
 * Every enchantment type that can be applied to a fresh item of this type.
 * @param {import("@minecraft/server").ItemType | string} itemType
 * @returns {{ name: string, maxLevel: number }[]}
 */
function getApplicableEnchantments(itemType) {
  const sample = new ItemStack(itemType);
  const enchantable = getComponent(sample, "minecraft:enchantable");
  if (!enchantable) {
    return [];
  }
  return EnchantmentTypes.getAll()
    .filter((type) => enchantable.canAddEnchantment({ type: type, level: 1 }))
    .map((type) => ({ name: type.id, maxLevel: type.maxLevel }));
}

/**
 * Enchantment types that both items can hold.
 * @param {import("@minecraft/server").ItemStack} firstItem
 * @param {import("@minecraft/server").ItemStack} secondItem
 * @returns {{ name: string, maxLevel: number }[]}
 */
function getBaseEnchantmentList(firstItem, secondItem) {
  const firstApplicable = getApplicableEnchantments(firstItem.type);
  const secondApplicable = getApplicableEnchantments(secondItem.type);
  return firstApplicable.filter((enchantment) => secondApplicable.some((other) => other.name === enchantment.name));
}

/**
 * @param {import("@minecraft/server").Enchantment[]} enchantments
 * @param {{ name: string, maxLevel: number }[]} baseList
 * @param {boolean} checkMaxLevel
 * @returns {import("@minecraft/server").Enchantment[]}
 */
function filterEnchantments(enchantments, baseList, checkMaxLevel) {
  return enchantments.filter(
    (enchantment) =>
      baseList.some((base) => base.name === enchantment.type.id) &&
      (!checkMaxLevel || enchantment.level < baseList.find((base) => base.name === enchantment.type.id).maxLevel)
  );
}

/**
 * @param {import("@minecraft/server").ItemStack} firstItem
 * @param {import("@minecraft/server").ItemStack} secondItem
 * @returns {{ type: string, level: number, maxLevel: number }[]}
 */
function mergeEnchantments(firstItem, secondItem) {
  const baseList = getBaseEnchantmentList(firstItem, secondItem);
  const firstEnchantments = getEnchantmentsFromItem(firstItem);
  const compatible = filterEnchantments(firstEnchantments, baseList, false);
  const merged = new Map();
  compatible.forEach((enchantment) => {
    merged.set(enchantment.type.id, {
      type: enchantment.type.id,
      level: enchantment.level,
      maxLevel: enchantment.type.maxLevel
    });
  });
  return Array.from(merged.values());
}

/**
 * @param {import("@minecraft/server").ItemStack} firstItem
 * @param {import("@minecraft/server").ItemStack} secondItem
 * @returns {{ type: string, level: number, maxLevel: number }[]}
 */
function generateDefinitiveEnchantmentList(firstItem, secondItem) {
  const merged = mergeEnchantments(firstItem, secondItem);
  const baseList = getBaseEnchantmentList(firstItem, secondItem);
  return merged.filter((enchantment) => baseList.some((base) => base.name === enchantment.type));
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").ItemStack} firstItem
 * @param {number} firstSlot
 * @param {import("@minecraft/server").ItemStack} secondItem
 * @param {number} secondSlot
 */
async function prepareCompatibleEnchantments(player, firstItem, firstSlot, secondItem, secondSlot) {
  try {
    const transferable = generateDefinitiveEnchantmentList(firstItem, secondItem);
    if (transferable.length === 0) {
      player.sendMessage("\ue0f3 §8>> §cNo compatible enchantments available for transfer.");
      return;
    }
    showEnchantmentTransferForm(player, firstItem, firstSlot, secondItem, secondSlot, transferable);
  } catch (error) {
    console.error(error, error.stack);
    player.sendMessage("\ue0f3 §8>> §cFailed to prepare compatible enchantments.");
  }
}

/**
 * @param {import("@minecraft/server").ItemStack} item
 * @returns {import("@minecraft/server").Enchantment[]}
 */
function getEnchantmentsFromItem(item) {
  const enchantable = item.getComponent(ItemEnchantableComponent.componentId);
  if (!enchantable) {
    throw new Error("\ue0f3 The item is not enchantable.");
  }
  const enchantments = enchantable.getEnchantments();
  if (!enchantments || typeof enchantments !== "object") {
    throw new Error("\ue0f3 Enchantment data is not valid.");
  }
  return enchantments;
}
