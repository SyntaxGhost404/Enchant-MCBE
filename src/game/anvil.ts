/**
 * Applying a Vein Miner or Ore Smelter book at a vanilla anvil.
 *
 * The vanilla anvil screen only understands vanilla enchantments, so using an anvil while holding one of
 * these books opens a small menu instead: pick a pickaxe, see the cost, confirm. Nothing changes until the
 * player confirms. At that moment everything is checked again in one synchronous step: the anvil is still
 * there and in reach, the book is still in the same slot, the pickaxe is exactly the item that was shown,
 * the cost is unchanged and the player has the levels. Only then are the pickaxe, the book and the levels
 * changed, and a failed write rolls the earlier ones back. Closing the menu, leaving the game, moving an
 * item or walking away costs nothing.
 */

import {
  BlockPermutation,
  EntityComponentTypes,
  GameMode,
  ItemComponentTypes,
  system,
  type Block,
  type Container,
  type ItemStack,
  type Player,
  type PlayerInteractWithBlockAfterEvent,
  type PlayerInteractWithBlockBeforeEvent,
  type RawMessage,
  type Vector3
} from '@minecraft/server';
import {
  ActionFormData,
  FormCancelationReason,
  MessageFormData,
  type ActionFormResponse,
  type MessageFormResponse
} from '@minecraft/server-ui';
import { ANVIL_DAMAGE_CHANCE, ANVIL_SET, TOO_EXPENSIVE, bookApplyCost, damagedAnvil } from '../rules/anvil';
import { WORK_PROPERTY, enchantmentOfBook, ENCHANTMENTS, type CustomEnchantment } from '../rules/enchantments';
import { customLevels, isPickaxe, sameItem, vanillaLevel, writeLevels } from './items';
import { actionBar, chat, tr, warn } from './notify';
import { endGrindSession, startGrindSession } from './upkeep';

/** Vanilla closes an anvil screen when the player moves this far away. */
const REACH = 8;

const ICONS: Record<string, string> = {
  'minecraft:wooden_pickaxe': 'textures/items/wood_pickaxe',
  'minecraft:stone_pickaxe': 'textures/items/stone_pickaxe',
  'minecraft:copper_pickaxe': 'textures/items/copper_pickaxe',
  'minecraft:iron_pickaxe': 'textures/items/iron_pickaxe',
  'minecraft:golden_pickaxe': 'textures/items/gold_pickaxe',
  'minecraft:diamond_pickaxe': 'textures/items/diamond_pickaxe',
  'minecraft:netherite_pickaxe': 'textures/items/netherite_pickaxe'
};

interface AnvilRef {
  readonly dimension: string;
  readonly location: Vector3;
}

interface Candidate {
  readonly slot: number;
  readonly item: ItemStack;
  readonly cost: number;
}

const open = new Set<string>();
const hinted = new Set<string>();

function inventory(player: Player): Container | undefined {
  return player.getComponent(EntityComponentTypes.Inventory)?.container;
}

function usesOf(item: ItemStack): number {
  let v: unknown;
  try {
    v = item.getDynamicProperty(WORK_PROPERTY);
  } catch {
    v = undefined;
  }
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function costFor(item: ItemStack, e: CustomEnchantment): number {
  const from = customLevels(item).get(e.key) ?? 0;
  return bookApplyCost(e.bookMultiplier, from, e.maxLevel, usesOf(item));
}

/** Pickaxes can take the book when they do not have it yet and can carry item data (not stackable). */
function canTake(item: ItemStack, e: CustomEnchantment): boolean {
  return isPickaxe(item) && item.maxAmount === 1 && (customLevels(item).get(e.key) ?? 0) < e.maxLevel;
}

function itemName(item: ItemStack): RawMessage {
  if (item.nameTag) return { text: item.nameTag };
  return { translate: item.localizationKey };
}

function durabilityText(item: ItemStack): RawMessage | undefined {
  try {
    const d = item.getComponent(ItemComponentTypes.Durability);
    if (!d || d.unbreakable || d.maxDurability <= 0) return undefined;
    const left = Math.max(0, Math.round(((d.maxDurability - d.damage) / d.maxDurability) * 100));
    return tr('vmos.anvil.durability', `${left}%`);
  } catch {
    return undefined;
  }
}

function listCustom(item: ItemStack): RawMessage | undefined {
  const levels = customLevels(item);
  const names = ENCHANTMENTS.filter((e) => levels.has(e.key)).map((e) => tr(e.nameKey));
  if (names.length === 0) return undefined;
  if (names.length === 1) return tr('vmos.anvil.has_one', names[0]!);
  return tr('vmos.anvil.has_two', names[0]!, names[1]!);
}

function lines(...parts: (RawMessage | undefined)[]): RawMessage {
  const out: RawMessage[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (out.length) out.push({ text: '\n' });
    out.push(p);
  }
  return { rawtext: out };
}

async function show<R extends ActionFormResponse | MessageFormResponse>(
  player: Player,
  form: { show(p: Player): Promise<R> }
): Promise<R | undefined> {
  // The player can be busy for a moment (chat open, another screen closing); try a few times.
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!player.isValid) return undefined;
    const res = await form.show(player);
    if (!res.canceled || res.cancelationReason !== FormCancelationReason.UserBusy) return res;
    await system.waitTicks(10);
  }
  return undefined;
}

function anvilCenter(a: AnvilRef): Vector3 {
  return { x: a.location.x + 0.5, y: a.location.y + 0.5, z: a.location.z + 0.5 };
}

function distance(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function damageAnvil(block: Block): void {
  const next = damagedAnvil(block.typeId);
  const at = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
  if (next === undefined) {
    block.setType('minecraft:air');
    block.dimension.playSound('random.anvil_break', at);
    return;
  }
  if (next === block.typeId) return;
  const facing = block.permutation.getState('minecraft:cardinal_direction');
  const states = facing === undefined ? undefined : { 'minecraft:cardinal_direction': facing };
  block.setPermutation(BlockPermutation.resolve(next, states as never));
}

type Failure =
  | 'moved'
  | 'anvil_gone'
  | 'too_far'
  | 'book_moved'
  | 'pickaxe_changed'
  | 'already'
  | 'cost_changed'
  | 'too_expensive'
  | 'levels'
  | 'write_failed';

function fail(player: Player, why: Failure, cost?: number): void {
  const message = why === 'levels' ? tr('vmos.anvil.fail.levels', String(cost ?? 0)) : tr(`vmos.anvil.fail.${why}`);
  actionBar(player, message);
  try {
    player.playSound('note.bass');
  } catch {
    // cosmetic
  }
}

/** The transaction. Synchronous: nothing else in the world runs between the checks and the writes. */
function apply(player: Player, e: CustomEnchantment, anvil: AnvilRef, bookSlot: number, pick: Candidate): void {
  if (!player.isValid) return;
  if (player.dimension.id !== anvil.dimension) return fail(player, 'moved');
  const dimension = player.dimension;
  let block: Block | undefined;
  try {
    block = dimension.getBlock(anvil.location);
  } catch {
    block = undefined;
  }
  if (!block || !ANVIL_SET.has(block.typeId)) return fail(player, 'anvil_gone');
  if (distance(player.location, anvilCenter(anvil)) > REACH) return fail(player, 'too_far');

  const container = inventory(player);
  if (!container) return fail(player, 'write_failed');
  const book = container.getItem(bookSlot);
  if (!book || book.typeId !== e.book) return fail(player, 'book_moved');
  const pickSlot = container.getSlot(pick.slot);
  const pickaxe = pickSlot.getItem();
  if (!pickaxe || !sameItem(pickaxe, pick.item)) return fail(player, 'pickaxe_changed');
  if (!canTake(pickaxe, e)) return fail(player, 'already');
  const cost = costFor(pickaxe, e);
  if (cost !== pick.cost) return fail(player, 'cost_changed');

  const creative = player.getGameMode() === GameMode.Creative;
  if (!creative && cost >= TOO_EXPENSIVE) return fail(player, 'too_expensive');
  if (!creative && player.level < cost) return fail(player, 'levels', cost);

  const result = pickaxe.clone();
  const levels = customLevels(result);
  levels.set(e.key, e.maxLevel);
  if (!writeLevels(result, levels)) return fail(player, 'write_failed');
  try {
    result.setDynamicProperty(WORK_PROPERTY, usesOf(pickaxe) + 1);
  } catch {
    // the use count only raises later prices; the enchantment itself is recorded
  }

  try {
    pickSlot.setItem(result);
  } catch {
    return fail(player, 'write_failed');
  }
  try {
    container.setItem(bookSlot, undefined);
  } catch {
    pickSlot.setItem(pickaxe);
    return fail(player, 'write_failed');
  }
  if (!creative) {
    try {
      player.addLevels(-cost);
    } catch {
      pickSlot.setItem(pickaxe);
      container.setItem(bookSlot, book);
      return fail(player, 'write_failed');
    }
  }

  try {
    dimension.playSound('random.anvil_use', anvilCenter(anvil));
    if (!creative && Math.random() < ANVIL_DAMAGE_CHANCE) damageAnvil(block);
  } catch (err) {
    warn('anvil wear', err);
  }
  actionBar(player, tr('vmos.anvil.done', tr(e.nameKey), itemName(result)));
}

async function openMenu(player: Player, e: CustomEnchantment, anvil: AnvilRef, bookSlot: number): Promise<void> {
  const container = inventory(player);
  if (!container) return;
  const book = container.getItem(bookSlot);
  if (!book || book.typeId !== e.book) return;

  const candidates: Candidate[] = [];
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
    const none = new ActionFormData()
      .title(tr('vmos.anvil.title', name))
      .body(tr(already > 0 ? 'vmos.anvil.none_left' : 'vmos.anvil.none', name))
      .button(tr('vmos.anvil.ok'));
    await show(player, none);
    return;
  }

  const menu = new ActionFormData()
    .title(tr('vmos.anvil.title', name))
    .body(
      lines(
        tr(e.key === 'vein_miner' ? 'vmos.anvil.about.vein_miner' : 'vmos.anvil.about.ore_smelter'),
        { text: '' },
        creative ? tr('vmos.anvil.creative') : tr('vmos.anvil.levels', String(player.level)),
        already > 0 ? tr('vmos.anvil.skipped', String(already), name) : undefined
      )
    );
  for (const c of candidates) {
    const label = lines(itemName(c.item), creative ? undefined : tr('vmos.anvil.cost', String(c.cost)));
    menu.button(label, ICONS[c.item.typeId]);
  }
  const picked = await show(player, menu);
  if (!picked || picked.canceled || picked.selection === undefined) return;
  const pick = candidates[picked.selection];
  if (!pick) return;

  const silkNote =
    e.key === 'ore_smelter' && vanillaLevel(pick.item, 'silk_touch') > 0 ? tr('vmos.anvil.silk_note') : undefined;
  const confirm = new MessageFormData()
    .title(tr('vmos.anvil.title', name))
    .body(
      lines(
        tr('vmos.anvil.confirm', name, itemName(pick.item)),
        durabilityText(pick.item),
        listCustom(pick.item),
        creative ? undefined : tr('vmos.anvil.cost', String(pick.cost)),
        silkNote
      )
    )
    .button1(tr('vmos.anvil.apply'))
    .button2(tr('vmos.anvil.cancel'));
  const answer = await show(player, confirm);
  if (!answer || answer.canceled || answer.selection !== 0) return;
  apply(player, e, anvil, bookSlot, pick);
}

/** Before-event: a book used on an anvil opens the menu instead of the vanilla screen. */
export function onInteractBefore(event: PlayerInteractWithBlockBeforeEvent): void {
  const item = event.itemStack;
  if (!item) return;
  const e = enchantmentOfBook(item.typeId);
  if (!e || !ANVIL_SET.has(event.block.typeId)) return;
  event.cancel = true;
  if (!event.isFirstEvent) return;
  const player = event.player;
  if (open.has(player.id)) return;
  open.add(player.id);
  const anvil: AnvilRef = {
    dimension: event.block.dimension.id,
    location: { x: event.block.x, y: event.block.y, z: event.block.z }
  };
  const bookSlot = player.selectedSlotIndex;
  system.run(() => {
    openMenu(player, e, anvil, bookSlot)
      .catch((err: unknown) => {
        if (player.isValid) warn('anvil menu', err);
      })
      .finally(() => open.delete(player.id));
  });
}

function carriesCustom(player: Player): boolean {
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

/** After-event: workstation bookkeeping, and a one-time tip the first time a player opens an anvil. */
export function onInteractAfter(event: PlayerInteractWithBlockAfterEvent): void {
  const player = event.player;
  const id = event.block.typeId;
  if (id === 'minecraft:grindstone') {
    if (event.isFirstEvent) startGrindSession(player);
    return;
  }
  endGrindSession(player);
  if (ANVIL_SET.has(id) && !hinted.has(player.id) && carriesCustom(player)) {
    hinted.add(player.id);
    chat(player, tr('vmos.tip.anvil'));
  }
}

export function forgetAnvilPlayer(id: string): void {
  open.delete(id);
  hinted.delete(id);
}
