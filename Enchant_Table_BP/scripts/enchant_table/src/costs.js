/**
 * Enchant+ 1.1.0: what an Enchant, Transfer or Disenchant costs or gives back.
 *
 * The amounts are set in config.js (xp.xp_remove, items.amount, scores.score_remove and the refund shares).
 * Whether XP and Enchant Essence are paid for every enchantment level or once per operation is chosen in the
 * world settings: Behavior Packs -> Enchant+ -> Settings (gear icon) -> "Cost scaling". The setting is declared
 * in the behavior pack's manifest.json and read every time a price is calculated, so a change applies at once.
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
 * Price of one Enchant or Transfer that adds or moves `levels` enchantment levels in total.
 * Scoreboard money (when it is turned on in config.js) is always paid per level.
 * @param {number} levels
 * @returns {{ xp: number, score: number, essence: number }}
 */
export function operationCost(levels) {
  const mode = getCostMode();
  return {
    xp: config.xp.state ? (mode.xpPerLevel ? levels : 1) * config.xp.xp_remove : 0,
    score: config.scores.state ? levels * config.scores.score_remove : 0,
    essence: config.items.state ? (mode.essencePerLevel ? levels : 1) * config.items.amount : 0
  };
}

/**
 * XP and scoreboard money given back by one Disenchant that removes `levels` enchantment levels in total.
 * With a flat XP cost the XP refund is flat too, so enchanting and disenchanting can never create XP.
 * Enchant Essence is not given back.
 * @param {number} levels
 * @returns {{ xp: number, score: number }}
 */
export function disenchantRefund(levels) {
  const mode = getCostMode();
  return {
    xp: config.xp.state ? Math.floor((mode.xpPerLevel ? levels : 1) * config.xp.xp_remove * config.xp.refund) : 0,
    score: config.scores.state ? Math.floor(levels * config.scores.score_remove * config.scores.refund) : 0
  };
}
