/**
 * Everything the site says about the add-on comes from the add-on's own files in this repository:
 * pack manifests, language files, recipes, config.js and the conflict table in item_list.js.
 * Change the packs and the site follows on the next build.
 */
import bpManifestText from '$repo/Enchant_Table_BP/manifest.json?raw';
import rpManifestText from '$repo/Enchant_Table_RP/manifest.json?raw';
import bpLangText from '$repo/Enchant_Table_BP/texts/en_US.lang?raw';
import rpLangText from '$repo/Enchant_Table_RP/texts/en_US.lang?raw';
import { config as addonConfig } from '$repo/Enchant_Table_BP/scripts/enchant_table/config.js';
import { enchant_incompatible } from '$repo/Enchant_Table_BP/scripts/enchant_table/src/item_list.js';
import { gameVersionLabel, parseJsonc, parseLang, stripCodes } from './parse';

type Version = string | number[];

interface Manifest {
	format_version: number;
	header: { name: string; description: string; uuid: string; version: Version; min_engine_version?: Version };
	modules: { type: string; uuid: string; version: Version }[];
	dependencies?: ({ uuid: string; version: Version } | { module_name: string; version: string })[];
	settings?: (
		| { type: 'label'; text: string }
		| { type: 'dropdown'; name: string; text: string; options: { name: string; text: string }[]; default: string }
	)[];
	metadata?: { authors?: string[]; url?: string; license?: string };
}

export function versionTuple(version: Version): number[] {
	return Array.isArray(version) ? version : version.split('.').map(Number);
}

export function versionText(version: Version): string {
	return versionTuple(version).join('.');
}

const bpManifest = parseJsonc<Manifest>(bpManifestText);
const rpManifest = parseJsonc<Manifest>(rpManifestText);
const bpLang = parseLang(bpLangText);
const rpLang = parseLang(rpLangText);

function packInfo(manifest: Manifest, lang: Record<string, string>, folder: string) {
	return {
		folder,
		name: lang[manifest.header.name] ?? manifest.header.name,
		description: lang[manifest.header.description] ?? manifest.header.description,
		uuid: manifest.header.uuid,
		version: versionTuple(manifest.header.version)
	};
}

const costSetting = bpManifest.settings?.find((s) => s.type === 'dropdown');
const costLabel = bpManifest.settings?.find((s) => s.type === 'label');

export interface CostMode {
	id: string;
	/** the option's text in the game's pack settings */
	label: string;
	isDefault: boolean;
}

export const costModes: CostMode[] =
	costSetting && costSetting.type === 'dropdown'
		? costSetting.options.map((o) => ({ id: o.name, label: o.text, isDefault: o.name === costSetting.default }))
		: [];

export const addon = {
	name: 'Enchant+',
	version: versionText(bpManifest.header.version),
	minEngine: versionText(bpManifest.header.min_engine_version ?? '0.0.0'),
	minGame: gameVersionLabel(versionText(bpManifest.header.min_engine_version ?? '0.0.0')),
	bp: packInfo(bpManifest, bpLang, 'Enchant_Table_BP'),
	rp: packInfo(rpManifest, rpLang, 'Enchant_Table_RP'),
	scriptModules: (bpManifest.dependencies ?? [])
		.filter((d): d is { module_name: string; version: string } => 'module_name' in d)
		.map((d) => ({ name: d.module_name, version: d.version })),
	costSetting: {
		id: costSetting && costSetting.type === 'dropdown' ? costSetting.name : '',
		title: costSetting?.text ?? '',
		/** the explanation shown above the setting in the game, without formatting codes */
		explanation: costLabel ? stripCodes(costLabel.text) : ''
	},
	authors: bpManifest.metadata?.authors ?? [],
	packLicense: bpManifest.metadata?.license ?? '',
	itemNames: {
		essence: rpLang['item.da:enchant_essence'] ?? 'Enchant Essence',
		table: rpLang['tile.da:enchant_table_plus.name'] ?? 'Enchantment Table'
	}
};

export interface AddonConfig {
	items: { state: boolean; id: string; amount: number; name: string };
	scores: { state: boolean; score_name: string; score_remove: number; display_name: string; refund: number; name: string };
	xp: { state: boolean; xp_remove: number; refund: number; name: string };
}

/** The values in config.js as shipped. */
export const defaultConfig: AddonConfig = JSON.parse(JSON.stringify(addonConfig));

/** Pairs that can't share an item, from the add-on's own table (ids without "minecraft:"). */
export const conflicts: Record<string, string[]> = (() => {
	const table = enchant_incompatible as Record<string, string[]>;
	const out: Record<string, Set<string>> = {};
	for (const [a, list] of Object.entries(table)) {
		for (const b of list) {
			(out[a] ??= new Set()).add(b);
			(out[b] ??= new Set()).add(a);
		}
	}
	return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
})();

export interface Recipe {
	id: string;
	result: { item: string; count: number };
	/** rows of item ids, null for empty slots */
	grid: (string | null)[][];
	tags: string[];
}

interface RecipeFile {
	'minecraft:recipe_shaped'?: {
		description: { identifier: string };
		tags?: string[];
		pattern: string[];
		key: Record<string, { item: string }>;
		result: { item: string; count?: number };
	};
}

const recipeTexts = import.meta.glob('$repo/Enchant_Table_BP/recipes/**/*.json', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export const recipes: Recipe[] = Object.values(recipeTexts)
	.map((text) => parseJsonc<RecipeFile>(text)['minecraft:recipe_shaped'])
	.filter((r): r is NonNullable<RecipeFile['minecraft:recipe_shaped']> => !!r)
	.map((r) => {
		const width = Math.max(...r.pattern.map((row) => row.length));
		const grid = r.pattern.map((row) =>
			Array.from({ length: width }, (_, i) => {
				const ch = row[i];
				return ch && ch !== ' ' ? (r.key[ch]?.item ?? null) : null;
			})
		);
		return { id: r.description.identifier, result: { item: r.result.item, count: r.result.count ?? 1 }, grid, tags: r.tags ?? [] };
	})
	// the essence first: it is needed for the table
	.sort((a, b) => (a.result.item === 'da:enchant_essence' ? -1 : b.result.item === 'da:enchant_essence' ? 1 : 0));
