// Vein Miner & Ore Smelter 1.0.0. Built from src/ by tools/build.mjs; edit the TypeScript, not this file.

// src/main.ts
import { world as world4 } from "@minecraft/server";

// src/game/anvil.ts
import {
  BlockPermutation,
  EntityComponentTypes as EntityComponentTypes2,
  GameMode,
  ItemComponentTypes as ItemComponentTypes2,
  system as system2
} from "@minecraft/server";
import {
  ActionFormData,
  FormCancelationReason,
  MessageFormData
} from "@minecraft/server-ui";

// src/rules/anvil.ts
var TOO_EXPENSIVE = 40;
var ANVIL_DAMAGE_CHANCE = 0.12;
var ANVILS = ["minecraft:anvil", "minecraft:chipped_anvil", "minecraft:damaged_anvil"];
var ANVIL_SET = new Set(ANVILS);
function priorWorkPenalty(uses) {
  const n = Math.max(0, Math.min(30, Math.floor(Number.isFinite(uses) ? uses : 0)));
  return 2 ** n - 1;
}
function bookApplyCost(multiplier, fromLevel, toLevel, targetUses) {
  const levels = Math.max(0, toLevel - fromLevel);
  return Math.max(1, levels * multiplier + priorWorkPenalty(targetUses));
}
function damagedAnvil(id) {
  const i = ANVILS.indexOf(id);
  if (i < 0) return id;
  return ANVILS[i + 1];
}

// src/rules/enchantments.ts
var VEIN_MINER = {
  key: "vein_miner",
  book: "vmos:vein_miner_book",
  property: "vmos:vein_miner",
  loreKey: "vmos.lore.vein_miner",
  plainLore: "§r§7Vein Miner",
  nameKey: "vmos.enchantment.vein_miner",
  maxLevel: 1,
  bookMultiplier: 4
};
var ORE_SMELTER = {
  key: "ore_smelter",
  book: "vmos:ore_smelter_book",
  property: "vmos:ore_smelter",
  loreKey: "vmos.lore.ore_smelter",
  plainLore: "§r§7Ore Smelter",
  nameKey: "vmos.enchantment.ore_smelter",
  maxLevel: 1,
  bookMultiplier: 2
};
var ENCHANTMENTS = [VEIN_MINER, ORE_SMELTER];
var BY_BOOK = new Map(ENCHANTMENTS.map((e) => [e.book, e]));
function enchantmentOfBook(itemId) {
  return BY_BOOK.get(itemId);
}
var WORK_PROPERTY = "vmos:anvil_uses";
var GRINDSTONE_PROPERTY = "vmos:grindstone";
var VANILLA_PICKAXES = /* @__PURE__ */ new Set([
  "minecraft:wooden_pickaxe",
  "minecraft:stone_pickaxe",
  "minecraft:copper_pickaxe",
  "minecraft:iron_pickaxe",
  "minecraft:golden_pickaxe",
  "minecraft:diamond_pickaxe",
  "minecraft:netherite_pickaxe"
]);
function storedLevel(value, maxLevel) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const level = Math.floor(value);
  if (level <= 0) return 0;
  return Math.min(level, maxLevel);
}
function isOurLoreLine(e, rawJson, plain) {
  if (rawJson !== void 0 && rawJson.includes(`"${e.loreKey}"`)) return true;
  if (plain !== void 0 && (plain === e.plainLore || plain.includes(e.loreKey))) return true;
  return false;
}

// src/game/items.ts
import { ItemComponentTypes } from "@minecraft/server";

// src/rules/grindstone.ts
var CURSES = /* @__PURE__ */ new Set(["binding", "vanishing"]);
var stripNamespace = (id) => id.startsWith("minecraft:") ? id.slice(10) : id;
function encodeNote(session, note) {
  return `${session}|${note.damage}|${note.nonCurse}`;
}
function decodeNote(value) {
  if (typeof value !== "string") return void 0;
  const parts = value.split("|");
  if (parts.length !== 3) return void 0;
  const [session, damage, nonCurse] = parts.map(Number);
  if (![session, damage, nonCurse].every(Number.isFinite)) return void 0;
  return { session, note: { damage, nonCurse } };
}
function looksGround(before, now) {
  return now.nonCurse === 0 && (before.nonCurse > 0 || now.damage < before.damage);
}

// src/game/items.ts
var MAX_LORE_LINES = 20;
function isPickaxe(item) {
  if (VANILLA_PICKAXES.has(item.typeId)) return true;
  try {
    return item.hasTag("minecraft:is_pickaxe");
  } catch {
    return false;
  }
}
function loreOf(item) {
  let raw = [];
  let plain = [];
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
function lineCount(l) {
  return Math.max(l.raw.length, l.plain.length);
}
function lineIsOurs(e, l, i) {
  const raw = l.raw[i];
  return isOurLoreLine(e, raw === void 0 ? void 0 : JSON.stringify(raw), l.plain[i]);
}
function lineIsAnyOfOurs(l, i) {
  return ENCHANTMENTS.some((e) => lineIsOurs(e, l, i));
}
function levelsFromProperties(item) {
  const out = /* @__PURE__ */ new Map();
  for (const e of ENCHANTMENTS) {
    let value;
    try {
      value = item.getDynamicProperty(e.property);
    } catch {
      value = void 0;
    }
    const level = storedLevel(value, e.maxLevel);
    if (level > 0) out.set(e.key, level);
  }
  return out;
}
function levelsFromLore(item) {
  const out = /* @__PURE__ */ new Map();
  const l = loreOf(item);
  for (let i = 0; i < lineCount(l); i++)
    for (const e of ENCHANTMENTS) if (lineIsOurs(e, l, i)) out.set(e.key, 1);
  return out;
}
function customLevels(item) {
  const out = levelsFromLore(item);
  for (const [k, v] of levelsFromProperties(item)) out.set(k, Math.max(v, out.get(k) ?? 0));
  return out;
}
function foreignLine(l, i) {
  const raw = l.raw[i];
  if (raw !== void 0) {
    const keys = Object.keys(raw);
    if (keys.length === 1 && keys[0] === "text" && typeof raw.text === "string") return raw.text;
    return raw;
  }
  return l.plain[i] ?? "";
}
function composeLore(item, levels, translated) {
  const l = loreOf(item);
  const foreign = [];
  for (let i = 0; i < lineCount(l); i++) if (!lineIsAnyOfOurs(l, i)) foreign.push(foreignLine(l, i));
  const ours = ENCHANTMENTS.filter((e) => (levels.get(e.key) ?? 0) > 0).map(
    (e) => translated ? { translate: e.loreKey } : e.plainLore
  );
  const all = [...ours, ...foreign];
  return all.length > MAX_LORE_LINES ? void 0 : all;
}
var translatedLore = true;
function topLinesMatch(item, levels, translated) {
  const l = loreOf(item);
  const wanted = ENCHANTMENTS.filter((e) => (levels.get(e.key) ?? 0) > 0);
  for (let i = 0; i < wanted.length; i++) {
    const e = wanted[i];
    if (translated) {
      const raw = l.raw[i];
      if (raw === void 0 || !JSON.stringify(raw).includes(`"${e.loreKey}"`)) return false;
    } else if (l.plain[i] !== e.plainLore) return false;
  }
  for (let i = wanted.length; i < lineCount(l); i++) if (lineIsAnyOfOurs(l, i)) return false;
  return true;
}
function loreIsCurrent(item, levels) {
  return topLinesMatch(item, levels, translatedLore);
}
function writeLore(item, levels) {
  if (loreIsCurrent(item, levels)) return true;
  const translated = composeLore(item, levels, true);
  const plain = composeLore(item, levels, false);
  if (plain === void 0 || translated === void 0) return false;
  if (translatedLore) {
    try {
      item.setLore(translated);
      if (topLinesMatch(item, levels, true)) return true;
      translatedLore = false;
    } catch {
    }
  }
  if (topLinesMatch(item, levels, false)) return true;
  try {
    item.setLore(plain);
    return true;
  } catch {
    return false;
  }
}
function writeProperties(item, levels) {
  let ok = true;
  for (const e of ENCHANTMENTS) {
    const level = levels.get(e.key) ?? 0;
    try {
      const now = storedLevel(item.getDynamicProperty(e.property), e.maxLevel);
      if (now !== level) item.setDynamicProperty(e.property, level > 0 ? level : void 0);
    } catch {
      ok = false;
    }
  }
  return ok;
}
function writeLevels(item, levels) {
  const props = writeProperties(item, levels);
  const lore = writeLore(item, levels);
  return props || lore;
}
function repairRecords(item) {
  const fromProps = levelsFromProperties(item);
  const fromLore = levelsFromLore(item);
  if (fromProps.size === 0 && fromLore.size === 0) return false;
  const union = customLevels(item);
  const same = (a) => a.size === union.size && [...union].every(([k, v]) => a.get(k) === v);
  if (same(fromProps) && loreIsCurrent(item, union)) return false;
  writeLevels(item, union);
  return true;
}
function refreshBookLore(slot, e) {
  const levels = /* @__PURE__ */ new Map([[e.key, 1]]);
  if (loreIsCurrent(slot, levels) || topLinesMatch(slot, levels, false) && !translatedLore) return false;
  writeLore(slot, levels);
  return true;
}
function vanillaEnchantments(item) {
  try {
    const comp = item.getComponent(ItemComponentTypes.Enchantable);
    if (!comp) return [];
    return comp.getEnchantments().map((e) => ({ id: stripNamespace(e.type.id), level: e.level })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : a.level - b.level);
  } catch {
    return [];
  }
}
function vanillaLevel(item, id) {
  const bare = stripNamespace(id);
  return vanillaEnchantments(item).find((e) => e.id === bare)?.level ?? 0;
}
function damageOf(item) {
  try {
    return item.getComponent(ItemComponentTypes.Durability)?.damage ?? 0;
  } catch {
    return 0;
  }
}
function wearNote(item) {
  return {
    damage: damageOf(item),
    nonCurse: vanillaEnchantments(item).filter((e) => !CURSES.has(e.id)).length
  };
}
function sameItem(a, b) {
  if (!a || !b) return false;
  if (a.typeId !== b.typeId || a.amount !== b.amount || (a.nameTag ?? "") !== (b.nameTag ?? "")) return false;
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

// src/game/notify.ts
var tr = (key, ...args) => args.length === 0 ? { translate: key } : { translate: key, with: { rawtext: args.map((a) => typeof a === "string" ? { text: a } : a) } };
function actionBar(player, message) {
  try {
    if (player.isValid) player.onScreenDisplay.setActionBar(message);
  } catch {
  }
}
function chat(player, message) {
  try {
    if (player.isValid) player.sendMessage(message);
  } catch {
  }
}
function warn(where, error) {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.warn(`[Vein Miner & Ore Smelter] ${where}: ${text}`);
}

// src/game/upkeep.ts
import { EntityComponentTypes, system } from "@minecraft/server";
var GRINDSTONE_WINDOW = 20 * 60 * 5;
var sessions = /* @__PURE__ */ new Map();
var queued = /* @__PURE__ */ new Set();
var recentWrites = /* @__PURE__ */ new Map();
var WRITE_COOLDOWN = 20;
function recentlyWritten(key) {
  const t = recentWrites.get(key);
  return t !== void 0 && system.currentTick - t < WRITE_COOLDOWN;
}
function noteWrite(key) {
  const now = system.currentTick;
  recentWrites.set(key, now);
  if (recentWrites.size > 256) {
    for (const [k, t] of recentWrites) if (now - t >= WRITE_COOLDOWN) recentWrites.delete(k);
  }
}
function slotsOf(player) {
  const container = player.getComponent(EntityComponentTypes.Inventory)?.container;
  if (!container) return [];
  const out = [];
  for (let i = 0; i < container.size; i++) {
    try {
      out.push(container.getSlot(i));
    } catch {
    }
  }
  return out;
}
function itemIn(slot) {
  try {
    return slot.getItem();
  } catch {
    return void 0;
  }
}
function activeSession(player) {
  const s = sessions.get(player.id);
  if (!s) return void 0;
  if (system.currentTick > s.until) {
    sessions.delete(player.id);
    return void 0;
  }
  return s;
}
function cameFromGrindstone(session, slot, item) {
  if (item.maxAmount > 1) return false;
  let noteValue;
  try {
    noteValue = slot.getDynamicProperty(GRINDSTONE_PROPERTY);
  } catch {
    noteValue = void 0;
  }
  const note = decodeNote(noteValue);
  if (!note) {
    return levelsFromProperties(item).size === 0;
  }
  if (note.session !== session.id) return false;
  return looksGround(note.note, wearNote(item));
}
function stripCustom(slot, player) {
  const had = customLevels(slot);
  writeLevels(slot, /* @__PURE__ */ new Map());
  for (const prop of [GRINDSTONE_PROPERTY, WORK_PROPERTY]) {
    try {
      slot.setDynamicProperty(prop, void 0);
    } catch {
    }
  }
  const names = ENCHANTMENTS.filter((e) => had.has(e.key)).map((e) => tr(e.nameKey));
  if (names.length === 1) actionBar(player, tr("vmos.notice.ground_one", names[0]));
  else if (names.length > 1) actionBar(player, tr("vmos.notice.ground_two", names[0], names[1]));
}
function scan(player) {
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
function requestScan(player) {
  if (queued.has(player.id)) return;
  queued.add(player.id);
  system.run(() => {
    queued.delete(player.id);
    try {
      scan(player);
    } catch {
    }
  });
}
function startGrindSession(player) {
  const id = system.currentTick;
  sessions.set(player.id, { id, until: id + GRINDSTONE_WINDOW });
  for (const slot of slotsOf(player)) {
    const item = itemIn(slot);
    if (!item || !isPickaxe(item) || customLevels(item).size === 0) continue;
    try {
      slot.setDynamicProperty(GRINDSTONE_PROPERTY, encodeNote(id, wearNote(item)));
    } catch {
    }
  }
}
function endGrindSession(player) {
  sessions.delete(player.id);
}
function forgetPlayer(id) {
  sessions.delete(id);
  queued.delete(id);
  for (const k of recentWrites.keys()) if (k.startsWith(`${id}|`)) recentWrites.delete(k);
}
function isEnchantedBook(item) {
  return !!item && enchantmentOfBook(item.typeId) !== void 0;
}

// src/game/anvil.ts
var REACH = 8;
var ICONS = {
  "minecraft:wooden_pickaxe": "textures/items/wood_pickaxe",
  "minecraft:stone_pickaxe": "textures/items/stone_pickaxe",
  "minecraft:copper_pickaxe": "textures/items/copper_pickaxe",
  "minecraft:iron_pickaxe": "textures/items/iron_pickaxe",
  "minecraft:golden_pickaxe": "textures/items/gold_pickaxe",
  "minecraft:diamond_pickaxe": "textures/items/diamond_pickaxe",
  "minecraft:netherite_pickaxe": "textures/items/netherite_pickaxe"
};
var open = /* @__PURE__ */ new Set();
var hinted = /* @__PURE__ */ new Set();
function inventory(player) {
  return player.getComponent(EntityComponentTypes2.Inventory)?.container;
}
function usesOf(item) {
  let v;
  try {
    v = item.getDynamicProperty(WORK_PROPERTY);
  } catch {
    v = void 0;
  }
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}
function costFor(item, e) {
  const from = customLevels(item).get(e.key) ?? 0;
  return bookApplyCost(e.bookMultiplier, from, e.maxLevel, usesOf(item));
}
function canTake(item, e) {
  return isPickaxe(item) && item.maxAmount === 1 && (customLevels(item).get(e.key) ?? 0) < e.maxLevel;
}
function itemName(item) {
  if (item.nameTag) return { text: item.nameTag };
  return { translate: item.localizationKey };
}
function durabilityText(item) {
  try {
    const d = item.getComponent(ItemComponentTypes2.Durability);
    if (!d || d.unbreakable || d.maxDurability <= 0) return void 0;
    const left = Math.max(0, Math.round((d.maxDurability - d.damage) / d.maxDurability * 100));
    return tr("vmos.anvil.durability", `${left}%`);
  } catch {
    return void 0;
  }
}
function listCustom(item) {
  const levels = customLevels(item);
  const names = ENCHANTMENTS.filter((e) => levels.has(e.key)).map((e) => tr(e.nameKey));
  if (names.length === 0) return void 0;
  if (names.length === 1) return tr("vmos.anvil.has_one", names[0]);
  return tr("vmos.anvil.has_two", names[0], names[1]);
}
function lines(...parts) {
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    if (out.length) out.push({ text: "\n" });
    out.push(p);
  }
  return { rawtext: out };
}
async function show(player, form) {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!player.isValid) return void 0;
    const res = await form.show(player);
    if (!res.canceled || res.cancelationReason !== FormCancelationReason.UserBusy) return res;
    await system2.waitTicks(10);
  }
  return void 0;
}
function anvilCenter(a) {
  return { x: a.location.x + 0.5, y: a.location.y + 0.5, z: a.location.z + 0.5 };
}
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function damageAnvil(block) {
  const next = damagedAnvil(block.typeId);
  const at = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
  if (next === void 0) {
    block.setType("minecraft:air");
    block.dimension.playSound("random.anvil_break", at);
    return;
  }
  if (next === block.typeId) return;
  const facing = block.permutation.getState("minecraft:cardinal_direction");
  const states = facing === void 0 ? void 0 : { "minecraft:cardinal_direction": facing };
  block.setPermutation(BlockPermutation.resolve(next, states));
}
function fail(player, why, cost) {
  const message = why === "levels" ? tr("vmos.anvil.fail.levels", String(cost ?? 0)) : tr(`vmos.anvil.fail.${why}`);
  actionBar(player, message);
  try {
    player.playSound("note.bass");
  } catch {
  }
}
function apply(player, e, anvil, bookSlot, pick) {
  if (!player.isValid) return;
  if (player.dimension.id !== anvil.dimension) return fail(player, "moved");
  const dimension = player.dimension;
  let block;
  try {
    block = dimension.getBlock(anvil.location);
  } catch {
    block = void 0;
  }
  if (!block || !ANVIL_SET.has(block.typeId)) return fail(player, "anvil_gone");
  if (distance(player.location, anvilCenter(anvil)) > REACH) return fail(player, "too_far");
  const container = inventory(player);
  if (!container) return fail(player, "write_failed");
  const book = container.getItem(bookSlot);
  if (!book || book.typeId !== e.book) return fail(player, "book_moved");
  const pickSlot = container.getSlot(pick.slot);
  const pickaxe = pickSlot.getItem();
  if (!pickaxe || !sameItem(pickaxe, pick.item)) return fail(player, "pickaxe_changed");
  if (!canTake(pickaxe, e)) return fail(player, "already");
  const cost = costFor(pickaxe, e);
  if (cost !== pick.cost) return fail(player, "cost_changed");
  const creative = player.getGameMode() === GameMode.Creative;
  if (!creative && cost >= TOO_EXPENSIVE) return fail(player, "too_expensive");
  if (!creative && player.level < cost) return fail(player, "levels", cost);
  const result = pickaxe.clone();
  const levels = customLevels(result);
  levels.set(e.key, e.maxLevel);
  if (!writeLevels(result, levels)) return fail(player, "write_failed");
  try {
    result.setDynamicProperty(WORK_PROPERTY, usesOf(pickaxe) + 1);
  } catch {
  }
  try {
    pickSlot.setItem(result);
  } catch {
    return fail(player, "write_failed");
  }
  try {
    container.setItem(bookSlot, void 0);
  } catch {
    pickSlot.setItem(pickaxe);
    return fail(player, "write_failed");
  }
  if (!creative) {
    try {
      player.addLevels(-cost);
    } catch {
      pickSlot.setItem(pickaxe);
      container.setItem(bookSlot, book);
      return fail(player, "write_failed");
    }
  }
  try {
    dimension.playSound("random.anvil_use", anvilCenter(anvil));
    if (!creative && Math.random() < ANVIL_DAMAGE_CHANCE) damageAnvil(block);
  } catch (err) {
    warn("anvil wear", err);
  }
  actionBar(player, tr("vmos.anvil.done", tr(e.nameKey), itemName(result)));
}
async function openMenu(player, e, anvil, bookSlot) {
  const container = inventory(player);
  if (!container) return;
  const book = container.getItem(bookSlot);
  if (!book || book.typeId !== e.book) return;
  const candidates = [];
  let already = 0;
  for (let i = 0; i < container.size; i++) {
    if (i === bookSlot) continue;
    const item = container.getItem(i);
    if (!item || !isPickaxe(item)) continue;
    if (!canTake(item, e)) {
      already++;
      continue;
    }
    candidates.push({ slot: i, item, cost: costFor(item, e) });
  }
  const name = tr(e.nameKey);
  const creative = player.getGameMode() === GameMode.Creative;
  if (candidates.length === 0) {
    const none = new ActionFormData().title(tr("vmos.anvil.title", name)).body(tr(already > 0 ? "vmos.anvil.none_left" : "vmos.anvil.none", name)).button(tr("vmos.anvil.ok"));
    await show(player, none);
    return;
  }
  const menu = new ActionFormData().title(tr("vmos.anvil.title", name)).body(
    lines(
      tr(e.key === "vein_miner" ? "vmos.anvil.about.vein_miner" : "vmos.anvil.about.ore_smelter"),
      { text: "" },
      creative ? tr("vmos.anvil.creative") : tr("vmos.anvil.levels", String(player.level)),
      already > 0 ? tr("vmos.anvil.skipped", String(already), name) : void 0
    )
  );
  for (const c of candidates) {
    const label = lines(itemName(c.item), creative ? void 0 : tr("vmos.anvil.cost", String(c.cost)));
    menu.button(label, ICONS[c.item.typeId]);
  }
  const picked = await show(player, menu);
  if (!picked || picked.canceled || picked.selection === void 0) return;
  const pick = candidates[picked.selection];
  if (!pick) return;
  const silkNote = e.key === "ore_smelter" && vanillaLevel(pick.item, "silk_touch") > 0 ? tr("vmos.anvil.silk_note") : void 0;
  const confirm = new MessageFormData().title(tr("vmos.anvil.title", name)).body(
    lines(
      tr("vmos.anvil.confirm", name, itemName(pick.item)),
      durabilityText(pick.item),
      listCustom(pick.item),
      creative ? void 0 : tr("vmos.anvil.cost", String(pick.cost)),
      silkNote
    )
  ).button1(tr("vmos.anvil.apply")).button2(tr("vmos.anvil.cancel"));
  const answer = await show(player, confirm);
  if (!answer || answer.canceled || answer.selection !== 0) return;
  apply(player, e, anvil, bookSlot, pick);
}
function onInteractBefore(event) {
  const item = event.itemStack;
  if (!item) return;
  const e = enchantmentOfBook(item.typeId);
  if (!e || !ANVIL_SET.has(event.block.typeId)) return;
  event.cancel = true;
  if (!event.isFirstEvent) return;
  const player = event.player;
  if (open.has(player.id)) return;
  open.add(player.id);
  const anvil = {
    dimension: event.block.dimension.id,
    location: { x: event.block.x, y: event.block.y, z: event.block.z }
  };
  const bookSlot = player.selectedSlotIndex;
  system2.run(() => {
    openMenu(player, e, anvil, bookSlot).catch((err) => {
      if (player.isValid) warn("anvil menu", err);
    }).finally(() => open.delete(player.id));
  });
}
function carriesCustom(player) {
  const container = inventory(player);
  if (!container) return false;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (!item) continue;
    if (enchantmentOfBook(item.typeId)) return true;
    if (isPickaxe(item) && customLevels(item).size > 0) return true;
  }
  return false;
}
function onInteractAfter(event) {
  const player = event.player;
  const id = event.block.typeId;
  if (id === "minecraft:grindstone") {
    if (event.isFirstEvent) startGrindSession(player);
    return;
  }
  endGrindSession(player);
  if (ANVIL_SET.has(id) && !hinted.has(player.id) && carriesCustom(player)) {
    hinted.add(player.id);
    chat(player, tr("vmos.tip.anvil"));
  }
}
function forgetAnvilPlayer(id) {
  open.delete(id);
  hinted.delete(id);
}

// src/game/smelter.ts
import {
  EntityComponentTypes as EntityComponentTypes3,
  GameMode as GameMode2,
  system as system3,
  world
} from "@minecraft/server";

// src/rules/ores.ts
var ORE_FAMILIES = [
  { id: "coal", blocks: ["minecraft:coal_ore", "minecraft:deepslate_coal_ore"], xp: [0, 2] },
  { id: "iron", blocks: ["minecraft:iron_ore", "minecraft:deepslate_iron_ore"], xp: [0, 0] },
  { id: "copper", blocks: ["minecraft:copper_ore", "minecraft:deepslate_copper_ore"], xp: [0, 0] },
  { id: "gold", blocks: ["minecraft:gold_ore", "minecraft:deepslate_gold_ore"], xp: [0, 0] },
  {
    id: "redstone",
    blocks: [
      "minecraft:redstone_ore",
      "minecraft:lit_redstone_ore",
      "minecraft:deepslate_redstone_ore",
      "minecraft:lit_deepslate_redstone_ore"
    ],
    xp: [1, 5]
  },
  { id: "lapis", blocks: ["minecraft:lapis_ore", "minecraft:deepslate_lapis_ore"], xp: [2, 5] },
  { id: "diamond", blocks: ["minecraft:diamond_ore", "minecraft:deepslate_diamond_ore"], xp: [3, 7] },
  { id: "emerald", blocks: ["minecraft:emerald_ore", "minecraft:deepslate_emerald_ore"], xp: [3, 7] },
  { id: "nether_quartz", blocks: ["minecraft:quartz_ore"], xp: [2, 5] },
  { id: "nether_gold", blocks: ["minecraft:nether_gold_ore"], xp: [0, 1] },
  { id: "ancient_debris", blocks: ["minecraft:ancient_debris"], xp: [0, 0] }
];
var FAMILY_BY_BLOCK = /* @__PURE__ */ new Map();
for (const family of ORE_FAMILIES) for (const block of family.blocks) FAMILY_BY_BLOCK.set(block, family);
var ORE_BLOCKS = new Set(FAMILY_BY_BLOCK.keys());
function familyOf(blockId) {
  return FAMILY_BY_BLOCK.get(blockId);
}
function breakSound(blockId) {
  if (blockId === "minecraft:ancient_debris") return "dig.ancient_debris";
  if (blockId === "minecraft:quartz_ore" || blockId === "minecraft:nether_gold_ore") return "dig.nether_gold_ore";
  if (blockId.includes("deepslate")) return "dig.deepslate";
  return "dig.stone";
}
var SMELTING = /* @__PURE__ */ new Map([
  ["minecraft:raw_iron", { output: "minecraft:iron_ingot", xpTenths: 7 }],
  ["minecraft:raw_copper", { output: "minecraft:copper_ingot", xpTenths: 7 }],
  ["minecraft:raw_gold", { output: "minecraft:gold_ingot", xpTenths: 10 }],
  ["minecraft:ancient_debris", { output: "minecraft:netherite_scrap", xpTenths: 20 }]
]);
var SMELTABLE_ORES = /* @__PURE__ */ new Set([
  "minecraft:iron_ore",
  "minecraft:deepslate_iron_ore",
  "minecraft:copper_ore",
  "minecraft:deepslate_copper_ore",
  "minecraft:gold_ore",
  "minecraft:deepslate_gold_ore",
  "minecraft:ancient_debris"
]);

// src/rules/stacks.ts
function mergeStacks(stacks, ops) {
  const out = [];
  for (const s of stacks) {
    let left = ops.amount(s);
    for (const o of out) {
      if (left <= 0) break;
      if (!ops.stackable(o, s)) continue;
      const space = ops.maxAmount(o) - ops.amount(o);
      if (space <= 0) continue;
      const move = Math.min(space, left);
      ops.setAmount(o, ops.amount(o) + move);
      left -= move;
    }
    while (left > 0) {
      const c = ops.clone(s);
      const n = Math.min(left, Math.max(1, ops.maxAmount(c)));
      ops.setAmount(c, n);
      out.push(c);
      left -= n;
    }
  }
  return out;
}
function makeStacks(typeId, count, ops) {
  const out = [];
  if (count <= 0) return out;
  const proto = ops.make(typeId);
  const max = Math.max(1, ops.maxAmount(proto));
  let left = Math.floor(count);
  while (left > 0) {
    const c = ops.clone(proto);
    const n = Math.min(left, max);
    ops.setAmount(c, n);
    out.push(c);
    left -= n;
  }
  return out;
}
function smeltStacks(stacks, ops) {
  const kept = [];
  const counts = /* @__PURE__ */ new Map();
  let xpTenths = 0;
  let smelted = 0;
  for (const s of stacks) {
    const recipe = SMELTING.get(ops.typeId(s));
    if (!recipe) {
      kept.push(s);
      continue;
    }
    const n = ops.amount(s);
    counts.set(recipe.output, (counts.get(recipe.output) ?? 0) + n);
    xpTenths += recipe.xpTenths * n;
    smelted += n;
  }
  const made = [];
  for (const [output, n] of counts) made.push(...makeStacks(output, n, ops));
  return { stacks: [...kept, ...made], xpTenths, smelted };
}

// src/rules/xp.ts
var ORB_VALUES = [2477, 1237, 617, 307, 149, 73, 37, 17, 7, 3, 1];
function splitIntoOrbs(total) {
  const orbs = [];
  let left = Math.max(0, Math.floor(total));
  for (const value of ORB_VALUES) {
    while (left >= value) {
      orbs.push(value);
      left -= value;
    }
  }
  return orbs;
}
function randomInt(min, max, rng) {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return lo + Math.floor(rng() * (hi - lo + 1));
}
function wholeXpFromTenths(tenths, rng) {
  const t = Math.max(0, Math.floor(tenths));
  const whole = Math.floor(t / 10);
  const fraction = t % 10 / 10;
  return whole + (fraction > 0 && rng() < fraction ? 1 : 0);
}

// src/game/stack-ops.ts
import { ItemStack as ItemStack2 } from "@minecraft/server";
var itemStackOps = {
  typeId: (s) => s.typeId,
  amount: (s) => s.amount,
  setAmount: (s, n) => {
    s.amount = n;
  },
  maxAmount: (s) => s.maxAmount,
  stackable: (a, b) => {
    try {
      return a.isStackableWith(b);
    } catch {
      return false;
    }
  },
  clone: (s) => s.clone(),
  make: (typeId) => new ItemStack2(typeId, 1)
};

// src/game/smelter.ts
var captures = /* @__PURE__ */ new Map();
var ownSpawns = /* @__PURE__ */ new Map();
var cellKey = (dimension, x, y, z) => `${dimension}|${x}|${y}|${z}`;
var CAPTURE_TICKS = 1;
function forgetOld(now) {
  for (const [key, c] of captures) if (now - c.tick > CAPTURE_TICKS) captures.delete(key);
  for (const [id, tick] of ownSpawns) if (now - tick > CAPTURE_TICKS + 1) ownSpawns.delete(id);
}
function markOwnSpawn(entity) {
  const now = system3.currentTick;
  forgetOld(now);
  ownSpawns.set(entity.id, now);
}
function tileDropsEnabled() {
  try {
    return world.gameRules.doTileDrops;
  } catch {
    return true;
  }
}
function smeltsWith(tool) {
  return isPickaxe(tool) && customLevels(tool).has("ore_smelter") && vanillaLevel(tool, "silk_touch") === 0;
}
function noteBreakForSmelting(event) {
  const block = event.block;
  if (!SMELTABLE_ORES.has(block.typeId)) return;
  const tool = event.itemStack;
  if (!tool || !smeltsWith(tool)) return;
  const mode = event.player.getGameMode();
  if (mode === GameMode2.Creative || mode === GameMode2.Spectator) return;
  if (!tileDropsEnabled()) return;
  const now = system3.currentTick;
  forgetOld(now);
  captures.set(cellKey(block.dimension.id, block.x, block.y, block.z), { tick: now });
}
function spawnOrbs(dimension, at, xp) {
  for (const value of splitIntoOrbs(xp)) {
    try {
      dimension.spawnXp(at, value);
    } catch {
      return;
    }
  }
}
function onEntitySpawn(event) {
  if (captures.size === 0) return;
  const entity = event.entity;
  if (entity.typeId !== "minecraft:item" || !entity.isValid) return;
  const now = system3.currentTick;
  forgetOld(now);
  if (ownSpawns.has(entity.id)) return;
  const at = entity.location;
  const dimension = entity.dimension;
  const key = cellKey(dimension.id, Math.floor(at.x), Math.floor(at.y), Math.floor(at.z));
  if (!captures.has(key)) return;
  const stack = entity.getComponent(EntityComponentTypes3.Item)?.itemStack;
  if (!stack || !SMELTING.has(stack.typeId)) return;
  const result = smeltStacks([stack], itemStackOps);
  let velocity;
  try {
    velocity = entity.getVelocity();
  } catch {
    velocity = void 0;
  }
  entity.remove();
  const spawned = [];
  try {
    for (const s of result.stacks) spawned.push(dimension.spawnItem(s, at));
  } catch {
    for (const e of spawned) {
      try {
        e.remove();
      } catch {
      }
    }
    try {
      markOwnSpawn(dimension.spawnItem(stack, at));
    } catch {
    }
    return;
  }
  for (const e of spawned) {
    markOwnSpawn(e);
    if (velocity) {
      try {
        e.clearVelocity();
        e.applyImpulse(velocity);
      } catch {
      }
    }
  }
  spawnOrbs(dimension, at, wholeXpFromTenths(result.xpTenths, Math.random));
}

// src/game/vein-miner.ts
import {
  EntityComponentTypes as EntityComponentTypes4,
  GameMode as GameMode3,
  ItemComponentTypes as ItemComponentTypes3,
  world as world3
} from "@minecraft/server";

// src/rules/durability.ts
function damageProbability(chancePercent, unbreaking) {
  const level = Math.max(0, Math.floor(unbreaking));
  const p = chancePercent / 100 / (level + 1);
  return Math.min(1, Math.max(0, p));
}
function rollsDamage(wear, rng) {
  if (wear.unbreakable) return false;
  const lo = Math.min(wear.chance.min, wear.chance.max);
  const hi = Math.max(wear.chance.min, wear.chance.max);
  const chance = lo === hi ? lo : lo + Math.floor(rng() * (hi - lo + 1));
  return rng() < damageProbability(chance, wear.unbreaking);
}
function wouldBreak(damage, maxDurability) {
  return damage + 1 > maxDurability;
}

// src/rules/job.ts
function runJob(spec, world5, rng) {
  const mined = [];
  const drops = [];
  const xp = [];
  let damage = 0;
  let skipped = 0;
  let stop = "complete";
  for (const target of spec.targets) {
    const type = world5.typeAt(target);
    if (type === void 0 || !spec.family.has(type)) {
      skipped++;
      continue;
    }
    const costsDurability = rollsDamage(spec.wear, rng);
    if (costsDurability && wouldBreak(spec.wear.damage + damage, spec.wear.maxDurability)) {
      stop = "durability";
      break;
    }
    let blockDrops = [];
    if (spec.collectDrops) {
      let generated;
      try {
        generated = world5.loot(target);
      } catch {
        stop = "error";
        break;
      }
      if (generated === void 0) {
        stop = "harvest";
        break;
      }
      blockDrops = generated;
    }
    let removed = false;
    try {
      removed = world5.clear(target);
    } catch {
      removed = false;
    }
    if (!removed) {
      stop = "error";
      break;
    }
    mined.push({ pos: target, type });
    for (const d of blockDrops) drops.push(d);
    if (costsDurability) damage++;
    xp.push(spec.miningXp ? randomInt(spec.miningXp[0], spec.miningXp[1], rng) : 0);
  }
  return { mined, drops, xp, damage, stop, skipped };
}

// src/rules/vein.ts
function offsets() {
  const faces = [];
  const edges = [];
  const corners = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const n = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        if (n === 1) faces.push({ x: dx, y: dy, z: dz });
        else if (n === 2) edges.push({ x: dx, y: dy, z: dz });
        else if (n === 3) corners.push({ x: dx, y: dy, z: dz });
      }
  return [...faces, ...edges, ...corners];
}
var NEIGHBOURS = offsets();
var posKey = (p) => `${p.x},${p.y},${p.z}`;
function findVein(origin, isMember, options, mayBreak = () => true) {
  const result = [];
  const max = Math.max(0, Math.floor(options.maxBlocks));
  if (max === 0) return result;
  const seen = /* @__PURE__ */ new Set([posKey(origin)]);
  const queue = [origin];
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head];
    for (const d of NEIGHBOURS) {
      const p = { x: at.x + d.x, y: at.y + d.y, z: at.z + d.z };
      const key = posKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      if (Math.abs(p.x - origin.x) > options.radius || Math.abs(p.y - origin.y) > options.radius || Math.abs(p.z - origin.z) > options.radius)
        continue;
      if (!isMember(p)) continue;
      queue.push(p);
      if (mayBreak(p)) {
        result.push(p);
        if (result.length >= max) return result;
      }
    }
  }
  return result;
}
function clampVeinLimit(raw, min, max, fallback) {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// src/game/settings.ts
import { world as world2 } from "@minecraft/server";
var VEIN_LIMIT_SETTING = "vmos:vein_limit";
var VEIN_LIMIT = { min: 8, max: 128, fallback: 64 };
var VEIN_RADIUS = 16;
function veinLimit() {
  let raw;
  try {
    raw = world2.getPackSettings()[VEIN_LIMIT_SETTING];
  } catch {
    raw = void 0;
  }
  return clampVeinLimit(raw, VEIN_LIMIT.min, VEIN_LIMIT.max, VEIN_LIMIT.fallback);
}

// src/game/vein-miner.ts
var EXHAUSTION_PER_BLOCK = 5e-3;
var MAX_SOUNDS = 4;
var center = (p) => ({ x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 });
function withNamespace(id) {
  return id.includes(":") ? id : `minecraft:${id}`;
}
function allowedBlocks(blocks, mode, tool) {
  if (mode !== GameMode3.Adventure) return new Set(blocks);
  let allowed = [];
  try {
    allowed = tool.getCanDestroy().map(withNamespace);
  } catch {
    allowed = [];
  }
  return new Set(blocks.filter((b) => allowed.includes(b)));
}
function supportBlocks(dimension, origin) {
  const out = /* @__PURE__ */ new Set();
  let players = [];
  try {
    players = dimension.getPlayers({ location: center(origin), maxDistance: VEIN_RADIUS + 4 });
  } catch {
    players = [];
  }
  for (const p of players) {
    const l = p.location;
    const y = Math.floor(l.y - 0.01);
    for (const dx of [-0.3, 0.3])
      for (const dz of [-0.3, 0.3]) out.add(posKey({ x: Math.floor(l.x + dx), y, z: Math.floor(l.z + dz) }));
  }
  return out;
}
function inventorySlot(player) {
  const container = player.getComponent(EntityComponentTypes4.Inventory)?.container;
  if (!container) return void 0;
  try {
    return container.getSlot(player.selectedSlotIndex);
  } catch {
    return void 0;
  }
}
function onBlockBroken(event) {
  const permutation = event.brokenBlockPermutation;
  const family = familyOf(permutation.type.id);
  if (!family) return;
  const before = event.itemStackBeforeBreak;
  if (!before || !isPickaxe(before) || !customLevels(before).has("vein_miner")) return;
  const player = event.player;
  if (!player.isValid || player.isSneaking) return;
  const mode = player.getGameMode();
  if (mode === GameMode3.Spectator) return;
  const after = event.itemStackAfterBreak;
  if (!after) return;
  const slot = inventorySlot(player);
  const tool = slot?.getItem();
  if (!slot || !tool || !sameItem(tool, after)) return;
  const dimension = event.dimension;
  const loot = world3.getLootTableManager();
  try {
    if (loot.generateLootFromBlockPermutation(permutation, tool) === void 0) return;
  } catch {
    return;
  }
  const origin = { x: event.block.x, y: event.block.y, z: event.block.z };
  const members = allowedBlocks(family.blocks, mode, tool);
  if (members.size === 0) return;
  const range = dimension.heightRange;
  const supports = supportBlocks(dimension, origin);
  const readType = (p) => {
    if (p.y < range.min || p.y >= range.max) return void 0;
    try {
      return dimension.getBlock(p)?.typeId;
    } catch {
      return void 0;
    }
  };
  const limit = veinLimit();
  const targets = findVein(
    origin,
    (p) => {
      const t = readType(p);
      return t !== void 0 && members.has(t);
    },
    { maxBlocks: limit - 1, radius: VEIN_RADIUS },
    (p) => !supports.has(posKey(p))
  );
  if (targets.length === 0) return;
  const creative = mode === GameMode3.Creative;
  const drops = !creative && tileDropsEnabled();
  const silk = vanillaLevel(tool, "silk_touch") > 0;
  const durability = tool.getComponent(ItemComponentTypes3.Durability);
  let chance = { min: 100, max: 100 };
  try {
    if (durability) chance = durability.getDamageChanceRange();
  } catch {
    chance = { min: 100, max: 100 };
  }
  const veinBlocks = {
    typeAt: readType,
    loot: (p) => {
      const block = dimension.getBlock(p);
      if (!block) throw new Error("block unavailable");
      return loot.generateLootFromBlock(block, tool);
    },
    clear: (p) => {
      const block = dimension.getBlock(p);
      if (!block) return false;
      block.setType("minecraft:air");
      return dimension.getBlock(p)?.typeId === "minecraft:air";
    }
  };
  const outcome = runJob(
    {
      targets,
      family: members,
      wear: {
        damage: damageOf(tool),
        maxDurability: durability?.maxDurability ?? 0,
        unbreakable: creative || !durability || durability.unbreakable,
        unbreaking: vanillaLevel(tool, "unbreaking"),
        chance
      },
      collectDrops: drops,
      miningXp: drops && !silk && family.xp[1] > 0 ? family.xp : void 0
    },
    veinBlocks,
    Math.random
  );
  if (outcome.mined.length === 0) {
    if (outcome.stop === "durability") actionBar(player, tr("vmos.notice.tool_low"));
    return;
  }
  if (outcome.damage > 0) {
    try {
      const fresh = slot.getItem();
      const comp = fresh?.getComponent(ItemComponentTypes3.Durability);
      if (fresh && comp && sameItem(fresh, tool)) {
        comp.damage = Math.min(comp.maxDurability, comp.damage + outcome.damage);
        slot.setItem(fresh);
      } else {
        warn("vein durability", "the pickaxe changed during the vein; durability not applied");
      }
    } catch (e) {
      warn("vein durability", e);
    }
  }
  const at = center(origin);
  if (drops) {
    let stacks = outcome.drops;
    let smeltTenths = 0;
    if (smeltsWith(tool)) {
      const smelted = smeltStacks(stacks, itemStackOps);
      stacks = smelted.stacks;
      smeltTenths = smelted.xpTenths;
    }
    for (const s of mergeStacks(stacks, itemStackOps)) {
      try {
        markOwnSpawn(dimension.spawnItem(s, at));
      } catch (e) {
        warn("vein drops", e);
      }
    }
    for (const xp of outcome.xp) spawnOrbs(dimension, at, xp);
    spawnOrbs(dimension, at, wholeXpFromTenths(smeltTenths, Math.random));
  }
  if (!creative) {
    try {
      const exhaustion = player.getComponent(EntityComponentTypes4.Exhaustion);
      if (exhaustion)
        exhaustion.setCurrentValue(
          Math.min(exhaustion.effectiveMax, exhaustion.currentValue + EXHAUSTION_PER_BLOCK * outcome.mined.length)
        );
    } catch {
    }
  }
  const step = Math.max(1, Math.ceil(outcome.mined.length / MAX_SOUNDS));
  for (let i = 0; i < outcome.mined.length; i += step) {
    const m = outcome.mined[i];
    try {
      dimension.playSound(breakSound(m.type), center(m.pos), { volume: 0.8 });
    } catch {
      break;
    }
  }
  if (outcome.stop === "durability") actionBar(player, tr("vmos.notice.tool_low"));
}

// src/main.ts
function guard(where, handler) {
  return (event) => {
    try {
      handler(event);
    } catch (e) {
      warn(where, e);
    }
  };
}
var watched = (item) => !!item && (isEnchantedBook(item) || isPickaxe(item));
world4.beforeEvents.playerBreakBlock.subscribe(guard("ore smelter", noteBreakForSmelting));
world4.afterEvents.entitySpawn.subscribe(guard("ore smelter", onEntitySpawn));
world4.afterEvents.playerBreakBlock.subscribe(guard("vein miner", onBlockBroken));
world4.beforeEvents.playerInteractWithBlock.subscribe(guard("anvil", onInteractBefore));
world4.afterEvents.playerInteractWithBlock.subscribe(guard("workstations", onInteractAfter));
world4.afterEvents.playerInventoryItemChange.subscribe(
  guard("upkeep", (event) => {
    if (watched(event.itemStack) || watched(event.beforeItemStack)) requestScan(event.player);
  }),
  { ignoreQuantityChange: true }
);
world4.afterEvents.playerSpawn.subscribe(
  guard("upkeep", (event) => {
    if (event.initialSpawn) requestScan(event.player);
  })
);
world4.afterEvents.playerLeave.subscribe(
  guard("upkeep", (event) => {
    forgetPlayer(event.playerId);
    forgetAnvilPlayer(event.playerId);
  })
);
