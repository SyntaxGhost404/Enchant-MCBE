import { describe, expect, it } from 'vitest';
import { addon, conflicts, costModes, defaultConfig, recipes } from './index';
import { price } from './pricing';
import { parseJsonc, parseLang, gameVersionLabel } from './parse';
import { enchantments } from '$lib/data/enchantments';
import { releases } from '$lib/data/changelog';

// ids from Mojang's vanilla data (bedrock-samples 26.60, metadata/vanilladata_modules/mojang-enchantments.json)
const MOJANG_IDS = [
	'aqua_affinity', 'bane_of_arthropods', 'binding', 'blast_protection', 'infinity', 'breach', 'channeling', 'density',
	'depth_strider', 'efficiency', 'feather_falling', 'fire_aspect', 'fire_protection', 'flame', 'fortune', 'frost_walker',
	'impaling', 'knockback', 'looting', 'loyalty', 'luck_of_the_sea', 'lunge', 'lure', 'mending', 'multishot', 'piercing',
	'power', 'projectile_protection', 'protection', 'punch', 'quick_charge', 'respiration', 'riptide', 'sharpness',
	'silk_touch', 'smite', 'soul_speed', 'swift_sneak', 'thorns', 'unbreaking', 'vanishing', 'wind_burst'
];

describe('add-on files', () => {
	it('reads the manifests and language files', () => {
		expect(addon.version).toBe('1.1.1');
		expect(addon.minGame).toBe('26.60');
		expect(addon.bp.uuid).toBe('2252a380-edfc-408d-ac4f-118a1128d251');
		expect(addon.rp.uuid).toBe('edeb2cdc-791e-4edb-b279-0a53f4fae3d5');
		expect(addon.bp.version).toEqual([1, 1, 1]);
		expect(addon.scriptModules).toEqual([
			{ name: '@minecraft/server', version: '2.11.0' },
			{ name: '@minecraft/server-ui', version: '2.3.0' }
		]);
		expect(addon.itemNames.essence).toBe('Enchant Essence');
		expect(addon.bp.name).toBe('Enchant+ [ BP ]');
	});

	it('lists the Cost scaling options from the manifest', () => {
		expect(costModes.map((m) => m.id)).toEqual(['both_per_level', 'flat_xp', 'flat_essence', 'both_flat']);
		expect(costModes.find((m) => m.isDefault)?.id).toBe('both_per_level');
		expect(addon.costSetting.title).toBe('Cost scaling');
	});

	it('reads both recipes, essence first', () => {
		expect(recipes.map((r) => r.result)).toEqual([
			{ item: 'da:enchant_essence', count: 6 },
			{ item: 'da:enchant_table_plus', count: 1 }
		]);
		expect(recipes[0].grid).toEqual([
			['minecraft:amethyst_shard', 'minecraft:lapis_lazuli'],
			['minecraft:glass_bottle', null]
		]);
		expect(recipes[1].grid[2]).toEqual(['minecraft:obsidian', 'minecraft:enchanting_table', 'minecraft:obsidian']);
	});

	it('makes the conflict table symmetric', () => {
		expect(conflicts.infinity).toContain('mending');
		expect(conflicts.mending).toContain('infinity');
		expect(conflicts.loyalty).toEqual(['riptide']);
		for (const [a, list] of Object.entries(conflicts)) for (const b of list) expect(conflicts[b]).toContain(a);
	});

	it('keeps config.js defaults', () => {
		expect(defaultConfig.xp.xp_remove).toBe(3);
		expect(defaultConfig.items.amount).toBe(3);
		expect(defaultConfig.xp.refund).toBe(0.5);
		expect(defaultConfig.scores.state).toBe(false);
	});
});

describe('prices from the add-on code', () => {
	// the README example: Sharpness III + Unbreaking II = 5 levels
	it.each([
		['both_per_level', [15, 15], [8, 8], 7],
		['flat_xp', [3, 15], [2, 8], 1],
		['flat_essence', [15, 3], [8, 2], 7],
		['both_flat', [3, 3], [2, 2], 1]
	])('%s', (mode, enchant, transfer, refund) => {
		expect(price('enchant', 5, mode)).toEqual({ xp: enchant[0], essence: enchant[1], money: 0 });
		expect(price('transfer', 5, mode)).toEqual({ xp: transfer[0], essence: transfer[1], money: 0 });
		expect(price('disenchant', 5, mode)).toEqual({ xp: refund, essence: 0, money: 0 });
	});

	it('gives no XP back for a partial disenchant with a flat XP cost', () => {
		expect(price('disenchant', 2, 'flat_xp', undefined, false).xp).toBe(0);
		expect(price('disenchant', 2, 'both_per_level', undefined, false).xp).toBe(3);
	});

	it('applies config overrides only for that call', () => {
		expect(price('enchant', 5, 'both_per_level', { xp: { xp_remove: 5 } }).xp).toBe(25);
		expect(price('enchant', 5, 'both_per_level').xp).toBe(15);
		expect(price('enchant', 5, 'both_per_level', { scores: { state: true } }).money).toBe(50);
		expect(price('transfer', 5, 'both_per_level', { scores: { state: true } }).money).toBe(30);
	});

	it('never lets a transfer cost less than its refund', () => {
		for (let levels = 1; levels <= 30; levels++)
			for (const mode of costModes.map((m) => m.id)) {
				const t = price('transfer', levels, mode, { xp: { refund: 0.9 } });
				const d = price('disenchant', levels, mode, { xp: { refund: 0.9 } });
				expect(t.xp).toBeGreaterThanOrEqual(d.xp);
			}
	});
});

describe('site data', () => {
	it('covers every vanilla enchantment', () => {
		expect(enchantments.map((e) => e.id).sort()).toEqual([...MOJANG_IDS].sort());
		for (const e of enchantments) expect(e.groups.length).toBeGreaterThan(0);
	});

	it('reads the changelog', () => {
		// the newest entry matches the packs; its sections vary from release to release
		expect(releases[0].version).toBe(addon.version);
		expect(releases[0].facts.Released).toMatch(/2026/);
		expect(releases[0].groups.length).toBeGreaterThan(0);
		for (const r of releases) {
			// '' is a plain list without a heading, as in 1.0.5
			for (const g of r.groups) expect(['New', 'Fixed', 'Changed', '']).toContain(g.title);
		}
		// a release with every kind of section parses in order
		const big = releases.find((r) => r.version === '1.1.0');
		expect(big?.groups.map((g) => g.title)).toEqual(['New', 'Fixed', 'Changed']);
		expect(releases.at(-1)?.version).toBe('1.0.5');
	});

	it('parses the small formats', () => {
		expect(parseJsonc('{"a": "http://x" // c\n, /* b */ "b": 2}')).toEqual({ a: 'http://x', b: 2 });
		expect(parseLang('a.b=§dHello §f[ X ]\n## comment\nc=d')).toEqual({ 'a.b': 'Hello [ X ]', c: 'd' });
		expect(gameVersionLabel('1.26.60')).toBe('26.60');
	});
});
