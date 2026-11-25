/**
 * Keeps the enchantment records healthy as items move around:
 *
 * - a pickaxe whose lore line or dynamic property went missing gets it back from the other record;
 * - enchanted books from chests get their lore line translated (loot tables can only write plain text);
 * - a pickaxe that comes out of a grindstone loses Vein Miner and Ore Smelter, as vanilla enchantments do.
 *
 * Work is done for one player at a time, at most once per tick, on the slots of that player's inventory.
 */

import { EntityComponentTypes, system, type ContainerSlot, type ItemStack, type Player } from '@minecraft/server';
import { ENCHANTMENTS, GRINDSTONE_PROPERTY, WORK_PROPERTY, enchantmentOfBook } from '../rules/enchantments';
import { decodeNote, encodeNote, looksGround } from '../rules/grindstone';
import {
  customLevels,
  isPickaxe,
  levelsFromProperties,
  refreshBookLore,
  repairRecords,
  wearNote,
  writeLevels
} from './items';
import { actionBar, tr } from './notify';

/** How long after opening a grindstone a returning pickaxe is checked (5 minutes). */
const GRINDSTONE_WINDOW = 20 * 60 * 5;

interface GrindSession {
  readonly id: number;
  readonly until: number;
}

const sessions = new Map<string, GrindSession>();
const queued = new Set<string>();
/** Slots written recently, so a record that does not read back as written cannot be rewritten in a loop. */
const recentWrites = new Map<string, number>();
const WRITE_COOLDOWN = 20;

function recentlyWritten(key: string): boolean {
  const t = recentWrites.get(key);
  return t !== undefined && system.currentTick - t < WRITE_COOLDOWN;
}

function noteWrite(key: string): void {
  const now = system.currentTick;
  recentWrites.set(key, now);
  if (recentWrites.size > 256) for (const [k, t] of recentWrites) if (now - t >= WRITE_COOLDOWN) recentWrites.delete(k);
}

function slotsOf(player: Player): ContainerSlot[] {
  const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
  if (!container) return [];
  const out: ContainerSlot[] = [];
  for (let i = 0; i < container.size; i++) {
    try {
      out.push(container.getSlot(i));
    } catch {
      // slot not available
    }
  }
  return out;
}

function itemIn(slot: ContainerSlot): ItemStack | undefined {
  try {
    return slot.getItem();
  } catch {
    return undefined;
  }
}

function activeSession(player: Player): GrindSession | undefined {
  const s = sessions.get(player.id);
  if (!s) return undefined;
  if (system.currentTick > s.until) {
    sessions.delete(player.id);
    return undefined;
  }
  return s;
}

function cameFromGrindstone(session: GrindSession, slot: ContainerSlot, item: ItemStack): boolean {
  // Stackable items cannot carry item data, so they cannot be told apart; leave them alone.
  if (item.maxAmount > 1) return false;
  let noteValue: unknown;
  try {
    noteValue = slot.getDynamicProperty(GRINDSTONE_PROPERTY);
  } catch {
    noteValue = undefined;
  }
  const note = decodeNote(noteValue);
  if (!note) {
    // Every enchanted pickaxe the player carried was noted when the grindstone opened. A pickaxe with our
    // lore but neither the note nor the item data is a new item built by the grindstone from one of them.
    return levelsFromProperties(item).size === 0;
  }
  if (note.session !== session.id) return false;
  return looksGround(note.note, wearNote(item));
}

function stripCustom(slot: ContainerSlot, player: Player): void {
  const had = customLevels(slot);
  writeLevels(slot, new Map());
  for (const prop of [GRINDSTONE_PROPERTY, WORK_PROPERTY]) {
    try {
      slot.setDynamicProperty(prop, undefined);
    } catch {
      // not stored
    }
  }
  const names = ENCHANTMENTS.filter((e) => had.has(e.key)).map((e) => tr(e.nameKey));
  if (names.length === 1) actionBar(player, tr('vmos.notice.ground_one', names[0]!));
  else if (names.length > 1) actionBar(player, tr('vmos.notice.ground_two', names[0]!, names[1]!));
}

function scan(player: Player): void {
  if (!player.isValid) return;
  const session = activeSession(player);
  slotsOf(player).forEach((slot, index) => {
    const item = itemIn(slot);
    if (!item) return;
    const key = `${player.id}|${index}|${item.typeId}`;
    const book = enchantmentOfBook(item.typeId);
    if (book) {
      if (!recentlyWritten(key) && refreshBookLore(slot, book)) noteWrite(key);
      return;
    }
    if (!isPickaxe(item) || customLevels(item).size === 0) return;
    if (session && cameFromGrindstone(session, slot, item)) {
      stripCustom(slot, player);
      return;
    }
    if (!recentlyWritten(key) && repairRecords(slot)) noteWrite(key);
  });
}

/** Queues a check of the player's inventory for the end of this tick (once, however many changes). */
export function requestScan(player: Player): void {
  if (queued.has(player.id)) return;
  queued.add(player.id);
  system.run(() => {
    queued.delete(player.id);
    try {
      scan(player);
    } catch {
      // the player left between the change and the check
    }
  });
}

/** A player opened a grindstone: note the wear of every enchanted pickaxe they carry. */
export function startGrindSession(player: Player): void {
  const id = system.currentTick;
  sessions.set(player.id, { id, until: id + GRINDSTONE_WINDOW });
  for (const slot of slotsOf(player)) {
    const item = itemIn(slot);
    if (!item || !isPickaxe(item) || customLevels(item).size === 0) continue;
    try {
      slot.setDynamicProperty(GRINDSTONE_PROPERTY, encodeNote(id, wearNote(item)));
    } catch {
      // an item that cannot hold the note is checked by its lore instead
    }
  }
}

/** Using any other block after the grindstone ends the check early. */
export function endGrindSession(player: Player): void {
  sessions.delete(player.id);
}

export function forgetPlayer(id: string): void {
  sessions.delete(id);
  queued.delete(id);
  for (const k of recentWrites.keys()) if (k.startsWith(`${id}|`)) recentWrites.delete(k);
}

export function isEnchantedBook(item: ItemStack | undefined): boolean {
  return !!item && enchantmentOfBook(item.typeId) !== undefined;
}
