# Changelog

The website's changelog page is built from this file.

## 1.1.0

Released: 18 November 2026
Needs: Minecraft: Bedrock Edition 26.60 or newer

### New

- **Cost scaling setting.** XP and Enchant Essence can each be charged per enchantment level or once per operation. Pick it in the world's Behavior Pack settings.
- **Cheaper transfers.** A Transfer costs half of what an Enchant would.
- **Clear conflict messages.** Enchantments that can't go together are listed in chat before anything is charged, including pairs only the game enforces, such as Infinity and Mending.
- **Companion website** with the full guide, a price calculator, downloads and bug reports.

### Fixed

- Enchant Essence now scales with the levels you add, as players expected (original issue 7).
- The glow around the sphere never stopped. After a few hours it filled the game's memory, which could hide the sphere and scramble textures.
- The sphere now disappears with its table every time, explosions included. Spheres left behind by older versions are removed within seconds.
- Pistons can no longer push the table away from its sphere.
- Using the table while holding a block no longer flashes that block on the table.
- Nothing is charged when an operation can't finish. A transfer onto a stack of books with a full inventory is refused before anything is taken.
- Prices round up and refunds round down, so no mix of Enchant, Transfer and Disenchant can create XP or money.
- The item list works with the current game interface. Two layout errors on the transfer screens are gone, and long player names fit in the profile panel.
- Copper tools and armor, spears and the golden sword have menu icons.
- The sphere has its own render settings, so it no longer fills the content log with errors.
- The table recipe asks for the right enchanting table item.

### Changed

- Rebuilt for Minecraft 26.60 with Script API `@minecraft/server` 2.11.0 and `@minecraft/server-ui` 2.3.0, and current block, item and entity formats.
- The behavior pack uses manifest format 3, which adds the settings screen.
- The scripts are readable and commented.

## 1.0.5

Released: 18 November 2024
Needs: Minecraft: Bedrock Edition 1.21.44 or older

- The last version of the original add-on by Death_Aruban. It stays on the `main` branch and in the [original repository](https://github.com/DeathAruban/Enchant-MCBE).
