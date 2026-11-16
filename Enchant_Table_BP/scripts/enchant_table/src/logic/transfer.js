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
import { getComponent, getScore, getItemCount, translateItemName } from "../function";
import { config } from "../../config";
import { item_texture_list, remove_resources, see_xp, enchant_incompatible } from "../item_list";

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

async function showItemSelection(player, firstItem, firstSlot, enchantments) {
  const container = player.getComponent("minecraft:inventory").container;
  const candidates = [];
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item && slot !== firstSlot) {
      const enchantable = getComponent(item, ItemEnchantableComponent.componentId);
      if (enchantable) {
        candidates.push({
          item,
          index: slot
        });
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
  const firstName = firstItem.nameTag ?? translateItemName(firstItem.typeId);
  const firstDescription = firstItem.getLore().join("\n") || "No description";
  const firstSlotText = firstSlot;
  const firstEnchantments = firstItem.getComponent(ItemEnchantableComponent.componentId)?.getEnchantments() || [];
  let firstEnchantmentsText =
    firstEnchantments.length > 0
      ? firstEnchantments
          .map((enchantment) => "\n- " + translateEnchantmentName(enchantment.type.id) + ": §a" + enchantment.level + "§f")
          .join("")
      : "None";
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
      const secondItem = buttonTargets[selection].item;
      if (!secondItem) {
        player.sendMessage("\ue0f3 Invalid selection.");
        return;
      }
      showSecondItemSelectionForm(
        player,
        firstItem,
        firstSlot,
        secondItem,
        buttonTargets[selection].index,
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
      const enchantable = getComponent(item, ItemEnchantableComponent.componentId);
      if (enchantable) {
        candidates.push({
          item,
          index: slot
        });
      }
    }
  }
  const form = new ActionFormData();
  form.title("arucube.enchant.trasfer_second_item");
  form.body("§fList of Enchantable Items:§a " + candidates.length + "\n§8");
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
  const secondName = secondItem.nameTag ?? translateItemName(secondItem.typeId);
  const secondDescription = secondItem.getLore().join("\n") || "No description";
  const secondSlotText = secondSlot;
  const secondEnchantments = secondItem.getComponent(ItemEnchantableComponent.componentId)?.getEnchantments() || [];
  let secondEnchantmentsText =
    secondEnchantments.length > 0
      ? secondEnchantments
          .map((enchantment) => "\n- " + translateEnchantmentName(enchantment.type.id) + ": §a" + enchantment.level + "§f")
          .join("")
      : "None";
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
        default:
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
    })
    .catch((error) => {
      console.error(error, error.stack);
    });
}

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
    let enchantment = sourceEnchantable.getEnchantment(EnchantmentTypes.get(enchantmentId));
    const level = enchantment ? enchantment.level : 0;
    if (isNaN(level)) {
      console.error("\ue0f3 Invalid level for enchantment " + enchantmentId + ": level=" + level);
      return;
    }
    form.slider("§f§l " + enchantmentName + " §6", 0, level, 1, level);
  });
  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        return;
      }
      let levelsToTransfer = {};
      transferable.forEach((entry, index) => {
        const keptLevel = response.formValues[index];
        const level = entry.level;
        if (keptLevel < level) {
          levelsToTransfer[entry.type] = level - keptLevel;
        }
      });
      if (Object.keys(levelsToTransfer).length === 0) {
        player.sendMessage("\ue0f3 §8>> §cNo enchantments selected for transfer.");
        return;
      }
      confirmEnchantmentTransfer(player, firstItem, firstSlot, secondItem, secondSlot, levelsToTransfer);
    })
    .catch((error) => {
      console.error(error, error.stack);
    });
}

async function confirmEnchantmentTransfer(player, firstItem, firstSlot, secondItem, secondSlot, levelsToTransfer) {
  try {
    const container = player.getComponent("minecraft:inventory").container;
    const form = new ActionFormData();
    form.title("arucube.enchant.trasfer_second_item_confirm");
    let body = "§cRemove from\n§bItem: " + (firstItem.nameTag ?? translateItemName(firstItem.typeId)) + "\n§dEnchant:\n";
    Object.keys(levelsToTransfer).forEach((enchantmentId) => {
      const enchantmentName = translateEnchantmentName(enchantmentId);
      const levels = levelsToTransfer[enchantmentId];
      body += "§6- " + enchantmentName + " -" + levels + "\n";
    });
    body += "\n§aAdd on\n§bItem: " + (secondItem.nameTag ?? translateItemName(secondItem.typeId)) + "\n§dEnchant:\n";
    Object.keys(levelsToTransfer).forEach((enchantmentId) => {
      const enchantmentName = translateEnchantmentName(enchantmentId);
      const levels = levelsToTransfer[enchantmentId];
      body += "§6- " + enchantmentName + " +" + levels + "\n";
    });
    let xpCost = 0;
    let scoreCost = 0;
    const itemCost = config.items.amount;
    Object.keys(levelsToTransfer).forEach((enchantmentId) => {
      const levels = levelsToTransfer[enchantmentId];
      if (config.xp.state) {
        xpCost += levels * config.xp.xp_remove;
      }
      if (config.scores.state) {
        scoreCost += levels * config.scores.score_remove;
      }
    });
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

function transferEnchantments(player, firstItem, firstSlot, secondItem, secondSlot, levelsToTransfer, xpCost, scoreCost, itemCost) {
  try {
    const container = player.getComponent("minecraft:inventory").container;
    const sourceEnchantable = firstItem.getComponent("minecraft:enchantable");
    const targetEnchantable = secondItem.getComponent("minecraft:enchantable");
    let exceedsMaxLevel = false;
    for (const enchantmentId in levelsToTransfer) {
      const levels = parseInt(levelsToTransfer[enchantmentId], 10);
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
    if (!remove_resources(player, xpCost, scoreCost, itemCost)) {
      player.sendMessage("\ue0f3 §8>> §cFailed to transfer enchantments due to insufficient resources.");
      return;
    }
    for (const enchantmentId in levelsToTransfer) {
      const levels = parseInt(levelsToTransfer[enchantmentId], 10);
      const type = EnchantmentTypes.get(enchantmentId);
      let existing = sourceEnchantable.getEnchantment(type);
      if (existing) {
        const remaining = existing.level - levels;
        sourceEnchantable.removeEnchantment(type);
        if (remaining > 0) {
          sourceEnchantable.addEnchantment({
            type,
            level: remaining
          });
        }
      }
    }
    if (firstItem.typeId === "minecraft:enchanted_book" && sourceEnchantable.getEnchantments().length === 0) {
      handleEmptyEnchantedBook(container, firstItem, firstSlot);
    } else {
      container.setItem(firstSlot, firstItem);
    }
    if (secondItem.typeId === "minecraft:book") {
      const bookSlot = handleBookToEnchantedBook(container, secondItem, secondSlot, levelsToTransfer);
      if (bookSlot !== -1) {
        const enchantedBook = createEnchantedBook(levelsToTransfer);
        container.setItem(bookSlot, enchantedBook);
      }
    } else if (secondItem.typeId === "minecraft:enchanted_book") {
      addEnchantmentsToItem(targetEnchantable, levelsToTransfer);
      container.setItem(secondSlot, secondItem);
    } else {
      addEnchantmentsToItem(targetEnchantable, levelsToTransfer);
      container.setItem(secondSlot, secondItem);
    }
    player.sendMessage("\ue0f3 §8>> §aEnchantments transferred successfully.");
  } catch (error) {
    console.error(error, error.stack);
    player.sendMessage("\ue0f3 §8>> §cFailed to transfer enchantments.");
  }
}

function handleEmptyEnchantedBook(container, book, slot) {
  let bookSlot = findItemSlot(container, "minecraft:book", 64);
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
    let books = container.getItem(bookSlot);
    books.amount += 1;
    container.setItem(bookSlot, books);
    if (book.amount > 1) {
      book.amount -= 1;
      container.setItem(slot, book);
    } else {
      container.setItem(slot, null);
    }
  }
}

function handleBookToEnchantedBook(container, book, slot, levelsToTransfer) {
  if (book.amount > 1) {
    book.amount -= 1;
    container.setItem(slot, book);
    const emptySlot = findEmptySlot(container);
    if (emptySlot !== -1) {
      return emptySlot;
    } else {
      player.sendMessage("\ue0f3 §8>> §cNo empty slot available for enchanted book.");
      return -1;
    }
  } else {
    return slot;
  }
}

function addEnchantmentsToItem(enchantable, levelsToTransfer) {
  for (const enchantmentId in levelsToTransfer) {
    const type = EnchantmentTypes.get(enchantmentId);
    enchantable.addEnchantment({
      type,
      level: levelsToTransfer[enchantmentId]
    });
  }
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

function getItemIcon(item) {
  const typeId = item.typeId;
  const icon = item_texture_list.vanilla_icon[typeId];
  return icon || item_texture_list.unknown_icon.no_icon;
}

function getApplicableEnchantments(itemType) {
  const sample = new ItemStack(itemType);
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

function getBaseEnchantmentList(firstItem, secondItem) {
  const firstApplicable = getApplicableEnchantments(firstItem.type);
  const secondApplicable = getApplicableEnchantments(secondItem.type);
  const common = firstApplicable.filter((enchantment) => secondApplicable.some((other) => other.name === enchantment.name));
  return common;
}

function filterEnchantments(enchantments, baseList, checkMaxLevel) {
  return enchantments.filter(
    (enchantment) =>
      baseList.some((base) => base.name === enchantment.type.id) &&
      (!checkMaxLevel || enchantment.level < baseList.find((base) => base.name === enchantment.type.id).maxLevel)
  );
}

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

function generateDefinitiveEnchantmentList(firstItem, secondItem) {
  const merged = mergeEnchantments(firstItem, secondItem);
  const baseList = getBaseEnchantmentList(firstItem, secondItem);
  const definitive = merged.filter((enchantment) => baseList.some((base) => base.name === enchantment.type));
  return definitive;
}

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

function getEnchantmentsFromItem(item) {
  const enchantable = item.getComponent(ItemEnchantableComponent.componentId);
  if (!enchantable) {
    throw new Error("\ue0f3 The item is not enchantable.");
  }
  const enchantments = enchantable.enchantments || enchantable.getEnchantments();
  if (!enchantments || typeof enchantments !== "object") {
    throw new Error("\ue0f3 Enchantment data is not valid.");
  }
  return enchantments;
}

function filterIncompatibleEnchantments(enchantments, existingEnchantments) {
  return enchantments.filter((enchantment) =>
    existingEnchantments.every(
      (existing) => !enchant_incompatible[enchantment.type.id] || !enchant_incompatible[enchantment.type.id].includes(existing.type.id)
    )
  );
}
