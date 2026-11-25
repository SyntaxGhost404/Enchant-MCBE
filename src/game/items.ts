/**
 * Reading and writing the custom enchantments on items: dynamic properties plus lore lines.
 */

import { ContainerSlot, ItemComponentTypes, ItemStack, type RawMessage } from '@minecraft/server';
import {
  ENCHANTMENTS,
  VANILLA_PICKAXES,
  isOurLoreLine,
  storedLevel,
  type CustomEnchantment,
  type EnchantKey
} from '../rules/enchantments';
import { CURSES, stripNamespace, type WearNote } from '../rules/grindstone';

/** Both item copies and inventory slots expose the same item data methods. */
export type ItemHolder = ItemStack | ContainerSlot;

export type Levels = ReadonlyMap<EnchantKey, number>;

const MAX_LORE_LINES = 20;

export function isPickaxe(item: ItemStack): boolean {
  if (VANILLA_PICKAXES.has(item.typeId)) return true;
  try {
    return item.hasTag('minecraft:is_pickaxe');
  } catch {
    return false;
  }
}

interface LoreLines {
  raw: RawMessage[];
  plain: string[];
}

function loreOf(item: ItemHolder): LoreLines {
  let raw: RawMessage[] = [];
  let plain: string[] = [];
  try {
    raw = item.getRawLore();
  } catch {
    raw = [];
  }
  try {
    plain = item.getLore();
  } catch {
    plain = [];
  }
  return { raw, plain };
}

function lineCount(l: LoreLines): number {
  return Math.max(l.raw.length, l.plain.length);
}

function lineIsOurs(e: CustomEnchantment, l: LoreLines, i: number): boolean {
  const raw = l.raw[i];
  return isOurLoreLine(e, raw === undefined ? undefined : JSON.stringify(raw), l.plain[i]);
}

function lineIsAnyOfOurs(l: LoreLines, i: number): boolean {
  return ENCHANTMENTS.some((e) => lineIsOurs(e, l, i));
}

/** Levels recorded in dynamic properties. Stackable items cannot hold properties and have none. */
export function levelsFromProperties(item: ItemHolder): Map<EnchantKey, number> {
  const out = new Map<EnchantKey, number>();
  for (const e of ENCHANTMENTS) {
    let value: unknown;
    try {
      value = item.getDynamicProperty(e.property);
    } catch {
      value = undefined;
    }
    const level = storedLevel(value, e.maxLevel);
    if (level > 0) out.set(e.key, level);
  }
  return out;
}

/** Enchantments named by lore lines (always level 1: both enchantments have a single level). */
export function levelsFromLore(item: ItemHolder): Map<EnchantKey, number> {
  const out = new Map<EnchantKey, number>();
  const l = loreOf(item);
  for (let i = 0; i < lineCount(l); i++)
    for (const e of ENCHANTMENTS) if (lineIsOurs(e, l, i)) out.set(e.key, 1);
  return out;
}

/** Every custom enchantment the item has, from either record. */
export function customLevels(item: ItemHolder): Map<EnchantKey, number> {
  const out = levelsFromLore(item);
  for (const [k, v] of levelsFromProperties(item)) out.set(k, Math.max(v, out.get(k) ?? 0));
  return out;
}

export function hasAnyCustom(item: ItemHolder): boolean {
  return customLevels(item).size > 0;
}

/** A foreign lore line exactly as it was: plain strings stay strings, raw messages stay raw. */
function foreignLine(l: LoreLines, i: number): RawMessage | string {
  const raw = l.raw[i];
  if (raw !== undefined) {
    const keys = Object.keys(raw);
    if (keys.length === 1 && keys[0] === 'text' && typeof raw.text === 'string') return raw.text;
    return raw;
  }
  return l.plain[i] ?? '';
}

/**
 * Lore with our lines (in registry order, on top) for the given enchantments, followed by every other line
 * unchanged. undefined when the result would not fit in the 20 lore lines items can hold; foreign lore is
 * never dropped to make room.
 */
function composeLore(item: ItemHolder, levels: Levels, translated: boolean): (RawMessage | string)[] | undefined {
  const l = loreOf(item);
  const foreign: (RawMessage | string)[] = [];
  for (let i = 0; i < lineCount(l); i++) if (!lineIsAnyOfOurs(l, i)) foreign.push(foreignLine(l, i));
  const ours: (RawMessage | string)[] = ENCHANTMENTS.filter((e) => (levels.get(e.key) ?? 0) > 0).map((e) =>
    translated ? { translate: e.loreKey } : e.plainLore
  );
  const all = [...ours, ...foreign];
  return all.length > MAX_LORE_LINES ? undefined : all;
}

/**
 * Lore lines are written as translatable messages. If the game ever hands them back in a form this code
 * cannot recognise, plain text lines are used from then on, so a record is never rewritten in a loop.
 */
let translatedLore = true;

/** True when the top lines show exactly these enchantments in the given form, and no other line is ours. */
function topLinesMatch(item: ItemHolder, levels: Levels, translated: boolean): boolean {
  const l = loreOf(item);
  const wanted = ENCHANTMENTS.filter((e) => (levels.get(e.key) ?? 0) > 0);
  for (let i = 0; i < wanted.length; i++) {
    const e = wanted[i]!;
    if (translated) {
      const raw = l.raw[i];
      if (raw === undefined || !JSON.stringify(raw).includes(`"${e.loreKey}"`)) return false;
    } else if (l.plain[i] !== e.plainLore) return false;
  }
  for (let i = wanted.length; i < lineCount(l); i++) if (lineIsAnyOfOurs(l, i)) return false;
  return true;
}

function loreIsCurrent(item: ItemHolder, levels: Levels): boolean {
  return topLinesMatch(item, levels, translatedLore);
}

/** Writes our lines; returns true when the lore shows the levels afterwards. */
function writeLore(item: ItemHolder, levels: Levels): boolean {
  if (loreIsCurrent(item, levels)) return true;
  // Both versions are built from the lore as it is now, before anything is written.
  const translated = composeLore(item, levels, true);
  const plain = composeLore(item, levels, false);
  if (plain === undefined || translated === undefined) return false;
  if (translatedLore) {
    try {
      item.setLore(translated);
      if (topLinesMatch(item, levels, true)) return true;
      translatedLore = false;
    } catch {
      // A raw message line can be refused where a short string is not; plain text below.
    }
  }
  // Plain lines already in place (from an earlier fallback): nothing to write, so nothing can loop.
  if (topLinesMatch(item, levels, false)) return true;
  try {
    item.setLore(plain);
    return true;
  } catch {
    return false;
  }
}

function writeProperties(item: ItemHolder, levels: Levels): boolean {
  let ok = true;
  for (const e of ENCHANTMENTS) {
    const level = levels.get(e.key) ?? 0;
    try {
      const now = storedLevel(item.getDynamicProperty(e.property), e.maxLevel);
      if (now !== level) item.setDynamicProperty(e.property, level > 0 ? level : undefined);
    } catch {
      ok = false;
    }
  }
  return ok;
}

/**
 * Makes both records show exactly `levels`. Returns false only when neither record could be written;
 * one record is enough to keep the enchantment.
 */
export function writeLevels(item: ItemHolder, levels: Levels): boolean {
  const props = writeProperties(item, levels);
  const lore = writeLore(item, levels);
  return props || lore;
}

/** Brings the two records back in line when one of them went missing. Writes only when needed. */
export function repairRecords(item: ItemHolder): boolean {
  const fromProps = levelsFromProperties(item);
  const fromLore = levelsFromLore(item);
  if (fromProps.size === 0 && fromLore.size === 0) return false;
  const union = customLevels(item);
  const same = (a: Map<EnchantKey, number>) => a.size === union.size && [...union].every(([k, v]) => a.get(k) === v);
  if (same(fromProps) && loreIsCurrent(item, union)) return false;
  writeLevels(item, union);
  return true;
}

/**
 * Shows the book's enchantment as a translated lore line (loot tables can only write plain text).
 * Returns true when it changed the lore.
 */
export function refreshBookLore(slot: ItemHolder, e: CustomEnchantment): boolean {
  const levels = new Map([[e.key, 1]]);
  if (loreIsCurrent(slot, levels) || topLinesMatch(slot, levels, false) && !translatedLore) return false;
  writeLore(slot, levels);
  return true;
}

export function vanillaEnchantments(item: ItemStack): { id: string; level: number }[] {
  try {
    const comp = item.getComponent(ItemComponentTypes.Enchantable);
    if (!comp) return [];
    return comp
      .getEnchantments()
      .map((e) => ({ id: stripNamespace(e.type.id), level: e.level }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.level - b.level));
  } catch {
    return [];
  }
}

export function vanillaLevel(item: ItemStack, id: string): number {
  const bare = stripNamespace(id);
  return vanillaEnchantments(item).find((e) => e.id === bare)?.level ?? 0;
}

export function damageOf(item: ItemStack): number {
  try {
    return item.getComponent(ItemComponentTypes.Durability)?.damage ?? 0;
  } catch {
    return 0;
  }
}

export function wearNote(item: ItemStack): WearNote {
  return {
    damage: damageOf(item),
    nonCurse: vanillaEnchantments(item).filter((e) => !CURSES.has(e.id)).length
  };
}

/** Same item in every way that matters to a transaction: kind, count, name, wear, enchantments, data. */
export function sameItem(a: ItemStack | undefined, b: ItemStack | undefined): boolean {
  if (!a || !b) return false;
  if (a.typeId !== b.typeId || a.amount !== b.amount || (a.nameTag ?? '') !== (b.nameTag ?? '')) return false;
  if (damageOf(a) !== damageOf(b)) return false;
  if (JSON.stringify(vanillaEnchantments(a)) !== JSON.stringify(vanillaEnchantments(b))) return false;
  const ca = customLevels(a);
  const cb = customLevels(b);
  if (ca.size !== cb.size || [...ca].some(([k, v]) => cb.get(k) !== v)) return false;
  try {
    if (JSON.stringify(a.getRawLore()) !== JSON.stringify(b.getRawLore())) return false;
  } catch {
    return false;
  }
  return true;
}
