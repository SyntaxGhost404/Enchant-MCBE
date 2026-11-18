/**
 * Stand-in for the game's `@minecraft/server` module.
 * The add-on's scripts (costs.js, item_list.js) import it; on the website they get this instead,
 * so the site runs the add-on's real pricing code. Only what those files touch is provided.
 */
type PackSettings = Record<string, string | number | boolean>;

let packSettings: PackSettings = {};

/** What `world.getPackSettings()` returns, i.e. the world's Behavior Pack settings. */
export function setPackSettings(settings: PackSettings): void {
	packSettings = { ...settings };
}

export const world = {
	getPackSettings(): PackSettings {
		return packSettings;
	},
	scoreboard: {
		getObjective: () => undefined,
		addObjective: () => ({})
	}
};
