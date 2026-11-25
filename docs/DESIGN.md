# Design

How Vein Miner & Ore Smelter works, and why it is built this way. Player-facing behaviour is in the
[README](../README.md).

## Platform facts this rests on

Checked against the 26.60 metadata in Mojang's bedrock-samples (`v1.26.60.5`), the official API typings
(`@minecraft/server` 2.11.0) and the Minecraft Creator documentation:

- Bedrock has no data-driven custom enchantments, so both enchantments are emulated with scripts.
- `LootTableManager.generateLootFromBlock(block, tool)` returns the drops "as if it had been mined" with that
  tool, and `undefined` when the tool cannot harvest the block. Ore drops in Bedrock are not loot table
  files, so this is the only way to get the game's own Fortune, Silk Touch and tier rules.
- `Dimension.spawnXp` spawns a real experience orb, which Mending repairs from.
- Items that do not stack can hold dynamic properties; lore holds up to 20 lines and accepts raw messages
  (translatable text).
- Before-events run read-only; after-events can change the world. All reads used in before-events
  (`getDynamicProperty`, `getRawLore`, `getComponent`, `getGameMode`, block reads) are allowed there.
- Bedrock tools break when damage would exceed `maxDurability` (an iron pickaxe has 250 and 251 uses).
- Vanilla values used: mining XP coal 0-2, redstone 1-5, lapis and quartz 2-5, diamond and emerald 3-7,
  nether gold 0-1, metal ores and ancient debris none; furnace XP 0.7 (iron, copper), 1 (gold), 2
  (netherite scrap); Unbreaking keeps a tool use with chance 1 - 1/(level + 1); anvil book multipliers 4 for
  Silk Touch and 2 for Fortune or Mending; prior work penalty 2^n - 1; 40 levels is too expensive; 12% anvil
  wear per use; 0.005 exhaustion per mined block.

## Identity and persistence

Each enchantment has three things: its book item (`vmos:vein_miner_book`, `vmos:ore_smelter_book`), an item
dynamic property on the pickaxe (`vmos:vein_miner`, `vmos:ore_smelter`, holding the level), and a lore line.

- **Books** are identified by their item type alone. Lore on a book is only for show, so a book cannot lose
  its enchantment. Books do not stack (like vanilla enchanted books), carry the vanilla `item.enchanted_book.name`
  name, glint, uncommon rarity and the `minecraft:bookshelf_books` tag.
- **Pickaxes** carry both records. Either one counts, and the upkeep pass restores the missing one. Lore
  lines are written as translatable raw messages (`{"translate": "vmos.lore.vein_miner"}`) on top of the lore;
  every other line, string or raw message, is kept exactly. If the 20 lines are full, the item data alone
  keeps the enchantment and no foreign line is ever dropped.
- If the game ever hands translated lines back in a form the code does not recognise, the add-on switches to
  plain text lines for the rest of the session. Writes happen only when something is missing and a slot is
  not rewritten within a second of its last write, so a record can never be rewritten in a loop.

## Vein Miner

`src/game/vein-miner.ts`, with the decisions in `src/rules/`.

1. The game breaks the first block normally (sound, particles, its drops, its XP, its durability point).
2. In the `playerBreakBlock` after-event, the vein starts only if: the block is an ore; the item before the
   break is a pickaxe with Vein Miner; the player is not sneaking and not a spectator; the pickaxe still
   exists after the break; the item in the hand is identical to the game's "item after break" (so a swapped
   or changed item is never touched); and the pickaxe can harvest that ore.
3. `findVein` (breadth-first, 26 neighbours ordered faces, edges, corners) collects up to limit - 1 blocks of
   the same family within 16 blocks on each axis, reading each position once and never reading outside the
   world or an unloaded chunk. Blocks under a player's feet stay part of the vein but are not mined.
4. `runJob` handles each block in order: still an ore of the vein? roll durability; stop if the roll would
   take the last point; get the drops from the engine (stop if the tool cannot harvest); remove the block
   (stop if that fails); only then record drops, XP and the durability point. Nothing is recorded for a block
   still in the world, and nothing is lost for a block that was removed.
5. In the same tick, the pickaxe in the hand is checked again and its durability raised by the recorded
   points, the drops are smelted (Ore Smelter, no Silk Touch), merged within each item's stack limit and
   spawned at the first block, and XP is spawned as orbs, one set per block.

Everything happens synchronously inside one after-event: the player cannot swap the tool, other scripts
cannot run in between, and no stale copy of the pickaxe is ever written back. With the 128 block maximum a
vein reads at most about 3,300 positions and generates at most 127 loot rolls, a fraction of a tick.

## Ore Smelter

The engine drops the first block's items itself, so they are smelted as they appear, in
`src/game/smelter.ts`:

- In the `playerBreakBlock` before-event (read-only), if the pickaxe smelts (Ore Smelter, no Silk Touch), the
  player is not in Creative and `doTileDrops` is on, the exact block cell is remembered with the tick.
- In the `entitySpawn` after-event, an item entity that appears inside a remembered cell during that tick or
  the next, and is raw iron, copper, gold or ancient debris, is replaced by the same number of smelted items
  at the same spot with the same motion. The original is removed first; if spawning failed, it is put back.
- Items the add-on spawns itself are never converted again. Everything else (items already there, items
  next to the cell, items another player drops) is ignored.

Vein drops are generated by the add-on, so they are smelted before they are spawned. Furnace XP is counted in
tenths so 0.7 + 0.7 + 0.7 is exactly 2.1, and the fraction is the chance of one more point, as in a furnace.
Each break and each vein has its own count.

## The anvil menu

`src/game/anvil.ts`. Using an anvil while holding one of the books cancels the vanilla interaction and opens
an action form (pickaxes that can take the book, with their costs), then a confirmation. The transaction runs
synchronously after the confirmation and checks, in order: player still valid and in the same dimension;
the anvil block still there and within 8 blocks; the book still in the same slot; the pickaxe identical to
the one listed; the cost unchanged; the levels available (unless Creative). Then it writes the new pickaxe,
removes the book and takes the levels, rolling back the earlier writes if a later one fails. Anvil wear
keeps the anvil's facing.

## Grindstone detection

`src/game/upkeep.ts`. On opening a grindstone, each enchanted pickaxe the player carries gets a note with a
session id, its damage and its number of non-curse vanilla enchantments. During the session (until the player
uses another block, or 5 minutes), a pickaxe whose note matches the session and that now has no non-curse
enchantments and either had some or has less damage is a grindstone result: both records and the anvil use
count are removed. A pickaxe that kept only its lore and no item data at all is also a rebuilt result.
Stackable items cannot carry notes and are never judged.

## Loot tables

`tools/loot.py` copies each covered vanilla table and replaces its enchanted book entry with a reference to a
sub-table (same weight) holding the original entry (weight 10, or 18 for the bastion's Soul Speed book) and
one entry for each new book (weight 1, with a plain lore line, since loot tables cannot translate). The check
mode rebuilds each vanilla table from the shipped pair and compares it with the SHA-256 fingerprint of
Mojang's file in `tools/loot-lock.json`, verifies weights, names and the book entries left alone, and the
generator proves with exact fractions that the book rate per chest is unchanged and no other entry's chance
moved.

## Testing

- `tests/rules.test.ts`: the pure rules, including statistical checks of Unbreaking and furnace rounding.
- `tests/vein-miner.test.ts` and `tests/anvil-upkeep.test.ts`: the real game modules running against
  `tests/fake/`, a stand-in for the parts of the API they use (slots vs item copies, non-stackable item data,
  the lore limit, loaded and unloaded blocks, item and XP entities, forms).
- `tests/lore-fallback.test.ts`: the plain text fallback, in its own module so its session state is isolated.
- `tests/data.test.ts`: manifests, versions, items, translations for every key the code uses, loot lore,
  and that the shipped `main.js` is exactly the build of the current source.

The stand-in cannot prove how the real engine behaves; the README lists what still needs a check in game.
