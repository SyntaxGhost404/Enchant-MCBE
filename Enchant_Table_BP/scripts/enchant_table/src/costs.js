/**
 * Enchant+ 1.1.1 for Minecraft: Bedrock Edition 26.60+
 * What an Enchant, Transfer or Disenchant costs or gives back.
 *
 * The amounts are set in config.js (xp.xp_remove, items.amount, scores.score_remove and the refund shares).
 * Whether XP and Enchant Essence are paid for every enchantment level or once per operation is chosen in the
 * world settings: Behavior Packs -> Enchant+ [ BP ] -> gear button -> "Cost scaling". The setting is declared
 * in the behavior pack's manifest.json and read every time a price is calculated, so a change applies at once.
 *
 * Rules that keep every combination of operations fair:
 * - Prices are rounded up to whole numbers and refunds rounded down.
 * - Transfer costs half of the Enchant price of the moved levels, but never less than disenchanting them gives back.
 * - With a flat XP cost, Disenchant gives XP back only when it removes every enchantment from the item.
 * - Refund shares are limited to 0-100% and invalid amounts count as 0.
 *
 * Based on Enchant+ by Death_Aruban: https://github.com/DeathAruban/Enchant-MCBE
 */

import { world } from "@minecraft/server";
import { config } from "../config";

/** Name of the "Cost scaling" pack setting (manifest.json, "settings"). */
export const COST_MODE_SETTING = "da:cost_mode";

/** Options of the setting: whether XP and Enchant Essence are paid per enchantment level (true) or once (false). */
export const COST_MODES = {
  both_per_level: { xpPerLevel: true, essencePerLevel: true },
  flat_xp: { xpPerLevel: false, essencePerLevel: true },
  flat_essence: { xpPerLevel: true, essencePerLevel: false },
  both_flat: { xpPerLevel: false, essencePerLevel: false }
};

/** Default option, also used when the setting cannot be read. */
export const DEFAULT_COST_MODE = "both_per_level";

/**
 * The cost mode chosen in the world settings.
 * @returns {{ xpPerLevel: boolean, essencePerLevel: boolean }}
 */
export function getCostMode() {
  let value;
  try {
    value = world.getPackSettings()[COST_MODE_SETTING];
  } catch {
    value = undefined;
  }
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(COST_MODES, value)
    ? COST_MODES[value]
    : COST_MODES[DEFAULT_COST_MODE];
}

/**
 * A config.js amount as a number of at least 0; anything else (negative, text, missing) counts as 0.
 * @param {unknown} value
 * @returns {number}
 */
function amountOf(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/**
 * A config.js refund share limited to 0-1 (0% to 100%); anything else counts as 0.
 * @param {unknown} value
 * @returns {number}
 */
function shareOf(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), 1) : 0;
}

/**
 * Whole numbers: prices are rounded up and refunds rounded down, so rounding never gives anything away.
 * Values are first rounded to 6 decimals so floating point noise (0.1 x 30 = 3.0000000000000004) is ignored.
 */
const roundUp = (/** @type {number} */ value) => Math.ceil(Math.round(value * 1e6) / 1e6);
const roundDown = (/** @type {number} */ value) => Math.floor(Math.round(value * 1e6) / 1e6);

/**
 * Exact (not yet rounded) Enchant price of `levels` enchantment levels in one operation.
 * Scoreboard money (when it is turned on in config.js) is always paid per level.
 * @param {number} levels
 * @param {{ xpPerLevel: boolean, essencePerLevel: boolean }} mode
 * @returns {{ xp: number, score: number, essence: number }}
 */
function enchantPrice(levels, mode) {
  return {
    xp: config.xp.state ? (mode.xpPerLevel ? levels : 1) * amountOf(config.xp.xp_remove) : 0,
    score: config.scores.state ? levels * amountOf(config.scores.score_remove) : 0,
    essence: config.items.state ? (mode.essencePerLevel ? levels : 1) * amountOf(config.items.amount) : 0
  };
}

/**
 * Refund for removing `levels` levels: the refund share of their Enchant price, rounded down.
 * A flat XP price buys any number of levels in one Enchant, so its share is only given back when the
 * Disenchant leaves the item without enchantments; otherwise removing levels one at a time would create XP.
 * @param {number} levels
 * @param {boolean} emptiesItem
 * @param {{ xpPerLevel: boolean, essencePerLevel: boolean }} mode
 * @returns {{ xp: number, score: number }}
 */
function refundFor(levels, emptiesItem, mode) {
  const price = enchantPrice(levels, mode);
  return {
    xp: mode.xpPerLevel || emptiesItem ? roundDown(price.xp * shareOf(config.xp.refund)) : 0,
    score: roundDown(price.score * shareOf(config.scores.refund))
  };
}

/**
 * Price of one Enchant that adds `levels` enchantment levels in total.
 * @param {number} levels
 * @returns {{ xp: number, score: number, essence: number }}
 */
export function enchantCost(levels) {
  const price = enchantPrice(levels, getCostMode());
  return { xp: roundUp(price.xp), score: roundUp(price.score), essence: roundUp(price.essence) };
}

/**
 * Price of one Transfer that moves `levels` enchantment levels in total: half of what Enchant would cost for
 * those levels (rounded up), but never less than what disenchanting them could give back, so moving
 * enchantments and then disenchanting them can never create XP or money (for example with looted gear).
 * @param {number} levels
 * @returns {{ xp: number, score: number, essence: number }}
 */
export function transferCost(levels) {
  const mode = getCostMode();
  const price = enchantPrice(levels, mode);
  const refund = refundFor(levels, true, mode);
  return {
    xp: Math.max(roundUp(price.xp / 2), refund.xp),
    score: Math.max(roundUp(price.score / 2), refund.score),
    essence: roundUp(price.essence / 2)
  };
}

/**
 * XP and scoreboard money given back by one Disenchant that removes `levels` enchantment levels in total.
 * Enchant Essence is not given back.
 * @param {number} levels
 * @param {boolean} emptiesItem true when the item has no enchantments left afterwards
 * @returns {{ xp: number, score: number }}
 */
export function disenchantRefund(levels, emptiesItem) {
  return refundFor(levels, emptiesItem, getCostMode());
}
