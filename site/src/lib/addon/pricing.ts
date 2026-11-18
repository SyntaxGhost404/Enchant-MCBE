/**
 * Prices on the site are computed by the add-on's own pricing code (scripts/enchant_table/src/costs.js),
 * not a copy of it. The world's Cost scaling setting is passed through the @minecraft/server stand-in,
 * and config.js values can be overridden for "what if" calculations.
 */
import { setPackSettings } from '@minecraft/server';
import {
	COST_MODE_SETTING,
	COST_MODES,
	DEFAULT_COST_MODE,
	disenchantRefund,
	enchantCost,
	transferCost
} from '$repo/Enchant_Table_BP/scripts/enchant_table/src/costs.js';
import { config as liveConfig } from '$repo/Enchant_Table_BP/scripts/enchant_table/config.js';
import type { AddonConfig } from './index';

export type Operation = 'enchant' | 'transfer' | 'disenchant';

export const costModeIds = Object.keys(COST_MODES) as string[];
export const defaultCostMode: string = DEFAULT_COST_MODE;

/** How a Cost scaling option charges XP and essence. */
export function modeRules(mode: string): { xpPerLevel: boolean; essencePerLevel: boolean } {
	const modes = COST_MODES as Record<string, { xpPerLevel: boolean; essencePerLevel: boolean }>;
	return modes[mode] ?? modes[DEFAULT_COST_MODE];
}

export type ConfigOverrides = {
	[S in keyof AddonConfig]?: Partial<AddonConfig[S]>;
};

export interface Price {
	/** XP levels taken (Enchant, Transfer) or given back (Disenchant) */
	xp: number;
	/** Enchant Essence taken; Disenchant never gives essence back */
	essence: number;
	/** scoreboard money taken or given back */
	money: number;
}

function withSettings<T>(mode: string, overrides: ConfigOverrides | undefined, run: () => T): T {
	const cfg = liveConfig as unknown as AddonConfig;
	const saved = JSON.parse(JSON.stringify(cfg)) as AddonConfig;
	setPackSettings({ [COST_MODE_SETTING]: mode });
	try {
		if (overrides) {
			for (const section of Object.keys(overrides) as (keyof AddonConfig)[]) {
				Object.assign(cfg[section], overrides[section]);
			}
		}
		return run();
	} finally {
		for (const section of Object.keys(saved) as (keyof AddonConfig)[]) {
			Object.assign(cfg[section], saved[section]);
		}
		setPackSettings({});
	}
}

/**
 * What one operation costs or gives back, exactly as the add-on charges it.
 * @param levels enchantment levels added (Enchant), moved (Transfer) or removed (Disenchant)
 * @param emptiesItem Disenchant only: whether every enchantment comes off the item
 */
export function price(
	operation: Operation,
	levels: number,
	mode: string = DEFAULT_COST_MODE,
	overrides?: ConfigOverrides,
	emptiesItem = true
): Price {
	const n = Math.max(0, Math.floor(levels));
	return withSettings(mode, overrides, () => {
		if (operation === 'disenchant') {
			const r = disenchantRefund(n, emptiesItem);
			return { xp: r.xp, essence: 0, money: r.score };
		}
		const c = operation === 'transfer' ? transferCost(n) : enchantCost(n);
		return { xp: c.xp, essence: c.essence, money: c.score };
	});
}
