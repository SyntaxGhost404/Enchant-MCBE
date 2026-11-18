# Enchant+ website

The companion site for the add-on: guide, price calculator, enchantment list, config builder, downloads,
changelog and bug reports. It is built from the add-on's own files, so it always matches the packs next to it:

| The site shows | Read from |
| --- | --- |
| Version, game version, Script API modules, pack names and UUIDs | `Enchant_Table_BP/manifest.json`, `Enchant_Table_RP/manifest.json`, `texts/en_US.lang` |
| Prices and the Cost scaling options | `scripts/enchant_table/src/costs.js` (run as is) and `config.js` |
| Enchantments that can't go together | `enchant_incompatible` in `scripts/enchant_table/src/item_list.js` |
| Recipes | `Enchant_Table_BP/recipes/` |
| The 3D table, sphere animation and glow particles | `Enchant_Table_RP/models/`, `animations/`, `particles/` and their textures |
| The download, its size and SHA-256 | both pack folders, zipped at build time by `scripts/package-addon.mjs` |
| The changelog | `../CHANGELOG.md` |
| The bug report fields | `../.github/ISSUE_TEMPLATE/bug_report.yml` (field ids must match `src/lib/report.ts`) |

The add-on's scripts import `@minecraft/server`; in the browser that name points to a small stand-in,
`src/lib/addon/minecraft-server-shim.ts`.

## Work on it

Node 20.19 or newer.

```sh
npm ci
npm run dev        # http://localhost:5173
npm run check      # types and Svelte checks
npm test           # unit tests, then end-to-end tests on a phone and a desktop viewport
npm run build      # static site in build/, followed by the copy and colour checks
```

`npm run build` fails if visible text contains dashes used as punctuation or emoji, or if the CSS uses
purple, violet, pink or bright blue (`scripts/check-site.mjs`). Prerendering fails on any broken link.

## Publish

`.github/workflows/site.yml` tests the site and publishes it to GitHub Pages at
https://syntaxghost404.github.io/Enchant-MCBE/ once Pages is turned on (Settings, Pages, Source: GitHub
Actions). For another address, change `SITE_URL` in `src/lib/nav.ts` and the links in the pack descriptions,
the manifest's settings label and the issue template.

## Credits

Minecraft textures come from Mojang's sample resource pack, used under the Minecraft EULA and usage
guidelines. Icons: pixelarticons (MIT). Fonts: Pixelify Sans, Atkinson Hyperlegible Next and JetBrains Mono
(SIL Open Font License). `npm run build` writes all licenses to `licenses.txt` on the site.
