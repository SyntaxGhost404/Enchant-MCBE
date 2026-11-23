/**
 * Enchant+ 1.1.1 for Minecraft: Bedrock Edition 26.60+
 * Entry point of the behavior pack's scripts. Loads the Enchant+ table and, when switched on below,
 * tells players how many plugins are loaded when they join.
 *
 * Based on Enchant+ by Death_Aruban: https://github.com/DeathAruban/Enchant-MCBE
 */

import { world } from '@minecraft/server'

import "./enchant_table/src/inject";


/**
 * Join message "N plugin(s) loaded successfully!": true shows it, false hides it (default).
 */
const { state: isActive } = { state: false };


/**
 * Plugins counted by the join message. Add an entry for each other script add-on that is loaded from this pack.
 */

const plugin_list = {
    1: {
        name: "Enchant Plus +",
        description: "Enchanting table that lets you choose every enchantment and level, remove enchantments and move them between items.",
        version: "1.1.1"
    }
};

world.afterEvents.playerSpawn.subscribe(({ initialSpawn, player }) => {
    if (!initialSpawn || !isActive) return;

    const pluginCount = Object.keys(plugin_list).length;
    player.sendMessage({
        rawtext: [{
            "translate": `§f[ §bPlugin System§f ] §a${pluginCount} plugin(s) loaded successfully!`
        }]
    });
});
