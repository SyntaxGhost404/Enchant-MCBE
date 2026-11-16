<p align="center">
     <a href="https://github.com/DeathAruban/Enchant-MCBE">
		<img src="https://github.com/DeathAruban/Enchant-MCBE/blob/main/img/enchant+.png" loading="eager" />
	</a><br>
    <b>Addon Enchant + for Minecraft: Bedrock Edition written in Json and javascript MC (Bedrock 26.60+ · Script API @minecraft/server 2.11.0 · @minecraft/server-ui 2.3.0)</b>
<p align="center">
	<a href="https://github.com/DeathAruban/Enchant-MCBE/releases/latest"><img alt="GitHub release (latest SemVer)" src="https://img.shields.io/github/v/release/DeathAruban/Enchant-MCBE?label=release&sort=semver"></a>
	<a href="https://github.com/DeathAruban/Enchant-MCBE/releases/latest"><img alt="GitHub release (latest by SemVer)" src="https://img.shields.io/github/downloads/DeathAruban/Enchant-MCBE/latest/total?sort=semver"></a>
<img alt="PingPong status" src="https://img.shields.io/pingpong/status/sp_7b7ce509b36c47ee9b20d041d018dc0a">
<br>
<a href="https://discord.gg/NKy9A9RAe8"><img src="https://img.shields.io/discord/935017716350320670?label=discord&color=7289DA&logo=discord" alt="Discord" /></a>
<a href="https://github.com//DeathAruban/Enchant-MCBE/releases"><img alt="GitHub all releases" src="https://img.shields.io/github/downloads/DeathAruban/Enchant-MCBE/total?label=downloads%40total"></a>
<img alt="YouTube Video Views" src="https://img.shields.io/youtube/views/QoqngsfcNZE?style=social">
<img alt="GitHub" src="https://img.shields.io/github/license/DeathAruban/Enchant-MCBE">
</p>

# Description
This behavior adds a new enchantment table to your world, allowing for maximum customization when enchanting your items. Currently, it supports vanilla enchantments. In future updates, support for custom enchantments will also be added.

## Language support 🌍
- English (United States)
- English (United Kingdom)
- if you find errors or your language is missing, send me a message, if you provide me with a correct translation I will add credits for support 🤝

# Check if the version or where you are using the addon is compatible

### Enchant+ 1.1.0 (this version)

Requires **Minecraft: Bedrock Edition 26.60 or newer** (packs use `min_engine_version` 1.26.60 and the scripts use `@minecraft/server` 2.11.0 / `@minecraft/server-ui` 2.3.0, which are only available from 26.60). Built and checked for the latest stable releases **26.60, 26.62 and 26.63**.

| Supported | World | Realms |Server Dedicated | Custom servers | Windows | Mobile | PS4/PS5 | Xbox | Nintendo Switch |
| ------- | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ |
| 26.60 – 26.63   |:white_check_mark: | :white_check_mark: | :white_check_mark: | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| 1.21.130 and older   | :x:  | :x: | :x: | :x: | :x: | :x: | :x: | :x: | :x: |

> The 1.1.0 update was validated against Mojang's official 26.60 resources (vanilla UI files, JSON schemas and Script API type definitions), but it has not yet been play-tested on every platform listed above. Please report any issue you find in-game.

### Enchant+ 1.0.5 (previous release, for older game versions)

| Supported | World | Realms |Server Dedicated | Custom servers | Windows | Mobile | PS4/PS5 | Xbox | Nintendo Switch |
| ------- | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ |
| 1.21.44   |:white_check_mark: | :white_check_mark: | :white_check_mark: | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| 1.21.0   |:white_check_mark: | :white_check_mark: | :white_check_mark: | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| 1.20.80   |:white_check_mark: | :white_check_mark: | :white_check_mark: | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| 1.20.71   |:white_check_mark: | :white_check_mark: | :white_check_mark: | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| previous versions   | :x:  | :x: | :x: | :x: | :x: | :x: | :x: | :x: | :x: | :x: | 

# How does it work (Old Version 1.0.4 ) New guide arrive
To make it work, the first thing you will need to do is build the enchantment table using this recipe:
<p align="center">
 <img src="https://github.com/DeathAruban/Enchant-MCBE/blob/main/img/craft.png" loading="eager" />
</p>
Now, when you place the created block in the crafting table, it will appear like this:
<p align="center">
 <img src="https://github.com/DeathAruban/Enchant-MCBE/blob/main/img/enchant_table_3d.png" loading="eager" />
</p>
When you interact with the block, obviously you should not have any blocks or items in your hand. This will open a UI which will show the items in your inventory that can be enchanted by the table. Under each item, there will be a slot name with a value. This is to help you understand where in your inventory your item is located. Here, you need to select the item you prefer to enchant
<p align="center">
 <img src="https://github.com/DeathAruban/Enchant-MCBE/blob/main/img/1.png" loading="eager" />
</p>
When you have selected the item to enchant, it will take you to this UI where you select which enchantments you want to apply. Remember, you must respect the principle of enchanting in Minecraft Bedrock, that you cannot put enchantments that cannot be combined, like Protection and Fire Protection. In vanilla, these are not enchantments that you can put together, and the same applies here.
<p align="center">
 <img src="https://github.com/DeathAruban/Enchant-MCBE/blob/main/img/2.png" loading="eager" />
</p>
Once you have added the enchantments you desire, confirm with the button below which will take you to a similar UI. This will give you a summary of the enchantments you are adding and the final price. Obviously, you can either confirm or cancel. If you confirm, the corresponding amount of XP indicated will be removed from you.
<p align="center">
 <img src="https://github.com/DeathAruban/Enchant-MCBE/blob/main/img/3.png" loading="eager" />
</p>
# Cost Xp
Instead, if you want to change the price to enchant your items, just go to:

```json5
Enchant_Table_BP/scripts/enchant_table/config.js
```
Open the config file and change the values. Each payment method can be turned on or off with `state`:
```json5
 items:{ state:true, id:'da:enchant_essence', amount:3 },   // items taken per operation
 scores:{ state:false, score_name:'money', score_remove:10, refund:0.6 },   // scoreboard cost per enchantment level
 xp:{ state:true, xp_remove:3, refund:0.5 }   // XP levels per enchantment level
```

# What's new in 1.1.0 (update for Minecraft: Bedrock Edition 26.60+)
- Updated for the latest stable Minecraft: Bedrock Edition (26.60 / 26.62 / 26.63): manifests now target engine version 1.26.60 and the latest stable Script API (`@minecraft/server` 2.11.0, `@minecraft/server-ui` 2.3.0).
- Scripts migrated to the Script API 2.x: `runCommandAsync()` (removed by Mojang) was replaced and the menu sliders use the new `slider()` options.
- The table is now a block with a custom component (`da:enchant_table`, Minecraft 1.21.90+): the game treats it like a vanilla crafting table, so using it opens the menu and a held block is only placed on it while sneaking. Its floating sphere is added and removed together with the block, however the block is placed or destroyed.
- Custom menus updated for the current server form UI: the button list binding follows vanilla (`#form_button_contents`, used since 1.21.70) and the fallback form layout matches vanilla 26.60.
- Block, item and entity files moved to the current format versions (block 1.26.60, item 1.26.50, entity 1.26.60), validated against Mojang's official schemas.
- Menu icons added for the new enchantable items: copper tools and armor, and all spears.
- The scripts are now readable source code (with type annotations for editors); the existing gameplay, menus, prices and messages are unchanged.

### Bug fixes
- Enchantments that the game refuses to combine (for example Infinity and Mending on a bow, Loyalty or Channeling with Riptide, Depth Strider and Frost Walker) are now listed in chat as not compatible, like Breach and Density, instead of a generic error. The add-on also asks the game directly, so pairs added in future versions are caught too. An enchantment that conflicts with one the item already has is no longer offered, and a transfer is checked against the receiving item's enchantments.
- The table's glow particles never ended: each table created 20 new particle emitters per second that stayed forever. After a few hours this used up the game's memory, which could make the sphere invisible and scramble block textures. The particles now disappear normally.
- A table destroyed by an explosion (or in any other way) now removes its floating sphere. Spheres left behind by older versions are removed automatically within a few seconds, and pistons can no longer move the table away from its sphere (like the vanilla enchanting table).
- Using the table while holding a block no longer shows that block on the table for a moment.
- Fixed the two menu errors in the content log on the transfer screens (`'image'` could not be resolved, unsolvable layout for `panel_name` / `item_text_scroll`). Long player names now wrap inside the Profile panel instead of running past its edge.
- The protection against double clicks is now per player, so one player opening the menu no longer blocks other players for half a second.
- Transferring enchantments to a stack of books with a full inventory crashed after taking the XP/items, the enchantments and a book. The transfer is now refused before anything is taken.
- Transferring an enchantment onto an item that already had it replaced the existing level instead of adding to it (Sharpness I + II became Sharpness II). Levels now add up as shown on the confirmation screen.
- If the game refuses an enchantment, nothing is charged any more (the result is prepared before the cost is taken).
- The golden sword now shows its icon in the menus.
- The crafting recipe of the table now uses the correct `minecraft:enchanting_table` item id.

# How to install

## 🖥️ Computer

📁.mcaddon version
- Download the enchant+.mcaddon version
- click on it to open and it will automatically insert it into the game
- 
📦.zip version
- go to 
 ```bash
%userprofile%\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\
```
- pull the texture into the resources folder instead the behavior into the behaviors folder

## 📱 Mobile

📁.mcaddon version
- Download the enchant+.mcaddon version
- click on it to open and it will automatically insert it into the game

📦.zip version
- download or use an application to manage files in the phone, I recommend this [RS Gestore File - Explorer EX](https://play.google.com/store/apps/details?id=com.rs.explorer.filemanager&hl=it&gl=US)
- (ANDROID & AMAZON FIRE OS) go to 
 ```bash
/Android/data/com.mojang.minecraftpe/files/games/com.mojang/
```

- (APPLE IOS ) go to

 ```bash
/On My iPhone/Minecraft/games/com.mojang/
```

- pull the texture into the resources folder instead the behavior into the behaviors folder

## 🕹️ Console (PS4/PS5/Switch/Xbox and other)

📦.zip version
- create dedicated bedrock realm or server
- pull the texture into the resources folder instead the behavior into the behaviors folder (Realm or Server)
- enter the realm or the server and you will find your component,remember to enable the settings necessary for operation listed before
- ⛔you can't put it directly in the console, the manufacturer things don't allow to import external files, it is possible only in case you have made a modification of your console

## For more info visit my discord or watch the video guide on my channel
- ✉️ Discord Link : [Click](https://discord.gg/NKy9A9RAe8)
- 💻 Youtube Link :[Click](https://www.youtube.com/watch?v=QoqngsfcNZE&ab_channel=Death_Aruban%E2%84%A2)

## Thank you for choosing this component and to appreciate how it works 😄
