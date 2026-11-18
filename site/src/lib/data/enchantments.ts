/**
 * Minecraft: Bedrock Edition enchantments as of 26.60 (ids match Mojang's vanilla data list).
 * In the game, the table asks Minecraft which enchantments an item accepts; the item groups here
 * describe the usual result. Books accept every enchantment.
 */

export type GroupId =
	| 'sword'
	| 'axe'
	| 'pickaxe'
	| 'shovel'
	| 'hoe'
	| 'mace'
	| 'spear'
	| 'bow'
	| 'crossbow'
	| 'trident'
	| 'fishing_rod'
	| 'helmet'
	| 'chestplate'
	| 'leggings'
	| 'boots';

export interface ItemGroup {
	id: GroupId;
	name: string;
	/** texture under src/lib/assets/game */
	icon: string;
}

export const itemGroups: ItemGroup[] = [
	{ id: 'sword', name: 'Swords', icon: 'items/iron_sword' },
	{ id: 'axe', name: 'Axes', icon: 'items/iron_axe' },
	{ id: 'pickaxe', name: 'Pickaxes', icon: 'items/iron_pickaxe' },
	{ id: 'shovel', name: 'Shovels', icon: 'items/iron_shovel' },
	{ id: 'hoe', name: 'Hoes', icon: 'items/iron_hoe' },
	{ id: 'mace', name: 'Maces', icon: 'items/mace' },
	{ id: 'spear', name: 'Spears', icon: 'items/iron_spear' },
	{ id: 'bow', name: 'Bows', icon: 'items/bow_standby' },
	{ id: 'crossbow', name: 'Crossbows', icon: 'items/crossbow_standby' },
	{ id: 'trident', name: 'Tridents', icon: 'items/trident' },
	{ id: 'fishing_rod', name: 'Fishing rods', icon: 'items/fishing_rod_uncast' },
	{ id: 'helmet', name: 'Helmets', icon: 'items/iron_helmet' },
	{ id: 'chestplate', name: 'Chestplates', icon: 'items/iron_chestplate' },
	{ id: 'leggings', name: 'Leggings', icon: 'items/iron_leggings' },
	{ id: 'boots', name: 'Boots', icon: 'items/iron_boots' }
];

const ARMOR: GroupId[] = ['helmet', 'chestplate', 'leggings', 'boots'];
const DIGGERS: GroupId[] = ['axe', 'pickaxe', 'shovel', 'hoe'];
const ALL: GroupId[] = itemGroups.map((g) => g.id);

export interface Enchantment {
	id: string;
	name: string;
	max: number;
	/** what it does, in one line */
	effect: string;
	groups: GroupId[];
	curse?: boolean;
}

export const enchantments: Enchantment[] = [
	{ id: 'aqua_affinity', name: 'Aqua Affinity', max: 1, effect: 'Mine at normal speed underwater.', groups: ['helmet'] },
	{ id: 'bane_of_arthropods', name: 'Bane of Arthropods', max: 5, effect: 'More damage to spiders, bees and other arthropods.', groups: ['sword', 'axe', 'mace', 'spear'] },
	{ id: 'binding', name: 'Curse of Binding', max: 1, effect: 'Once worn, the item stays on until it breaks or you die.', groups: ARMOR, curse: true },
	{ id: 'blast_protection', name: 'Blast Protection', max: 4, effect: 'Less damage and knockback from explosions.', groups: ARMOR },
	{ id: 'breach', name: 'Breach', max: 4, effect: "Hits ignore part of the target's armor.", groups: ['mace'] },
	{ id: 'channeling', name: 'Channeling', max: 1, effect: 'A thrown trident calls lightning during thunderstorms.', groups: ['trident'] },
	{ id: 'density', name: 'Density', max: 5, effect: 'Smash attacks hit harder the farther you fall.', groups: ['mace'] },
	{ id: 'depth_strider', name: 'Depth Strider', max: 3, effect: 'Move faster underwater.', groups: ['boots'] },
	{ id: 'efficiency', name: 'Efficiency', max: 5, effect: 'Mine faster.', groups: DIGGERS },
	{ id: 'feather_falling', name: 'Feather Falling', max: 4, effect: 'Less fall damage.', groups: ['boots'] },
	{ id: 'fire_aspect', name: 'Fire Aspect', max: 2, effect: 'Sets targets on fire.', groups: ['sword', 'mace', 'spear'] },
	{ id: 'fire_protection', name: 'Fire Protection', max: 4, effect: 'Less fire damage, and you burn for less time.', groups: ARMOR },
	{ id: 'flame', name: 'Flame', max: 1, effect: 'Arrows set targets on fire.', groups: ['bow'] },
	{ id: 'fortune', name: 'Fortune', max: 3, effect: 'Some blocks drop more items.', groups: DIGGERS },
	{ id: 'frost_walker', name: 'Frost Walker', max: 2, effect: 'Water freezes into ice under your feet.', groups: ['boots'] },
	{ id: 'impaling', name: 'Impaling', max: 5, effect: 'More damage to mobs in water or rain.', groups: ['trident'] },
	{ id: 'infinity', name: 'Infinity', max: 1, effect: 'Shooting does not use up arrows. You still need one.', groups: ['bow'] },
	{ id: 'knockback', name: 'Knockback', max: 2, effect: 'Hits push targets farther back.', groups: ['sword', 'spear'] },
	{ id: 'looting', name: 'Looting', max: 3, effect: 'Mobs drop more loot.', groups: ['sword', 'spear'] },
	{ id: 'loyalty', name: 'Loyalty', max: 3, effect: 'A thrown trident flies back to you.', groups: ['trident'] },
	{ id: 'luck_of_the_sea', name: 'Luck of the Sea', max: 3, effect: 'Better treasure when fishing.', groups: ['fishing_rod'] },
	{ id: 'lunge', name: 'Lunge', max: 3, effect: 'Spear jabs carry you forward.', groups: ['spear'] },
	{ id: 'lure', name: 'Lure', max: 3, effect: 'Fish bite sooner.', groups: ['fishing_rod'] },
	{ id: 'mending', name: 'Mending', max: 1, effect: 'XP you pick up repairs the item.', groups: ALL },
	{ id: 'multishot', name: 'Multishot', max: 1, effect: 'Shoots three arrows at once.', groups: ['crossbow'] },
	{ id: 'piercing', name: 'Piercing', max: 4, effect: 'Arrows pass through several mobs.', groups: ['crossbow'] },
	{ id: 'power', name: 'Power', max: 5, effect: 'Arrows deal more damage.', groups: ['bow'] },
	{ id: 'projectile_protection', name: 'Projectile Protection', max: 4, effect: 'Less damage from arrows, tridents and fireballs.', groups: ARMOR },
	{ id: 'protection', name: 'Protection', max: 4, effect: 'Less damage from most sources.', groups: ARMOR },
	{ id: 'punch', name: 'Punch', max: 2, effect: 'Arrows push targets farther back.', groups: ['bow'] },
	{ id: 'quick_charge', name: 'Quick Charge', max: 3, effect: 'The crossbow loads faster.', groups: ['crossbow'] },
	{ id: 'respiration', name: 'Respiration', max: 3, effect: 'Breathe longer underwater.', groups: ['helmet'] },
	{ id: 'riptide', name: 'Riptide', max: 3, effect: 'In water or rain, the trident throws you instead.', groups: ['trident'] },
	{ id: 'sharpness', name: 'Sharpness', max: 5, effect: 'More melee damage.', groups: ['sword', 'axe', 'spear'] },
	{ id: 'silk_touch', name: 'Silk Touch', max: 1, effect: 'Mined blocks drop themselves.', groups: DIGGERS },
	{ id: 'smite', name: 'Smite', max: 5, effect: 'More damage to undead mobs.', groups: ['sword', 'axe', 'mace', 'spear'] },
	{ id: 'soul_speed', name: 'Soul Speed', max: 3, effect: 'Walk faster on soul sand and soul soil.', groups: ['boots'] },
	{ id: 'swift_sneak', name: 'Swift Sneak', max: 3, effect: 'Move faster while sneaking.', groups: ['leggings'] },
	{ id: 'thorns', name: 'Thorns', max: 3, effect: 'Attackers sometimes get hurt.', groups: ARMOR },
	{ id: 'unbreaking', name: 'Unbreaking', max: 3, effect: 'The item wears out more slowly.', groups: ALL },
	{ id: 'vanishing', name: 'Curse of Vanishing', max: 1, effect: 'The item disappears when you die.', groups: ALL, curse: true },
	{ id: 'wind_burst', name: 'Wind Burst', max: 3, effect: 'Smash attacks launch you back into the air.', groups: ['mace'] }
];

export const enchantmentById: Record<string, Enchantment> = Object.fromEntries(enchantments.map((e) => [e.id, e]));

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export function roman(level: number): string {
	return ROMAN[level] ?? String(level);
}
