/**
 * Images and models used on the site. Add-on files are imported straight from the packs;
 * Minecraft textures come from Mojang's sample resource pack (src/lib/assets/game).
 */
import logoUrl from '$repo/img/enchant+.png';
import menuSelectUrl from '$repo/img/readme/menu-select.png';
import menuEnchantUrl from '$repo/img/readme/menu-enchant.png';
import menuRecapUrl from '$repo/img/readme/menu-recap.png';
import packIconUrl from '$repo/Enchant_Table_RP/pack_icon.png';
import essenceUrl from '$repo/Enchant_Table_RP/arucube/enchant_table/resources/items/enchant_essence.png';
import uiBackgroundUrl from '$repo/Enchant_Table_RP/arucube/enchant_table/resources/ui/background.png';
import tableRenderUrl from '$lib/assets/renders/table.png';
import obsidianRenderUrl from '$lib/assets/renders/obsidian.png';
import enchantingTableRenderUrl from '$lib/assets/renders/enchanting_table.png';

const gameFiles = import.meta.glob('$lib/assets/game/**/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

/** URL of a Minecraft texture, e.g. game('items/iron_sword') */
export function game(path: string): string {
	const key = Object.keys(gameFiles).find((k) => k.endsWith(`/game/${path}.png`));
	if (!key) throw new Error(`missing game texture ${path}`);
	return gameFiles[key];
}

export const images = {
	logo: logoUrl,
	packIcon: packIconUrl,
	essence: essenceUrl,
	tableRender: tableRenderUrl,
	uiBackground: uiBackgroundUrl,
	menus: { select: menuSelectUrl, enchant: menuEnchantUrl, recap: menuRecapUrl }
};


export interface ItemInfo {
	name: string;
	icon: string;
	/** 3D block renders are scaled smoothly; flat item textures stay pixel sharp */
	render?: boolean;
}

export function itemInfo(id: string, names: { essence: string; table: string }): ItemInfo {
	switch (id) {
		case 'minecraft:amethyst_shard':
			return { name: 'Amethyst Shard', icon: game('items/amethyst_shard') };
		case 'minecraft:lapis_lazuli':
			return { name: 'Lapis Lazuli', icon: game('items/dye_powder_blue') };
		case 'minecraft:glass_bottle':
			return { name: 'Glass Bottle', icon: game('items/potion_bottle_empty') };
		case 'minecraft:emerald':
			return { name: 'Emerald', icon: game('items/emerald') };
		case 'minecraft:obsidian':
			return { name: 'Obsidian', icon: obsidianRenderUrl, render: true };
		case 'minecraft:enchanting_table':
			return { name: 'Enchanting Table', icon: enchantingTableRenderUrl, render: true };
		case 'da:enchant_essence':
			return { name: names.essence, icon: essenceUrl };
		case 'da:enchant_table_plus':
			return { name: names.table, icon: tableRenderUrl, render: true };
		default:
			return { name: id.replace(/^.*:/, '').replace(/_/g, ' '), icon: game('items/book_normal') };
	}
}
