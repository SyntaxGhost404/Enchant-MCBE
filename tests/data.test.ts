import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { ENCHANTMENTS } from '../src/rules/enchantments';
import { VEIN_LIMIT, VEIN_LIMIT_SETTING } from '../src/game/settings';

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const json = (p: string) => JSON.parse(read(p));
const bp = json('VeinMinerOreSmelter_BP/manifest.json');
const rp = json('VeinMinerOreSmelter_RP/manifest.json');
const pkg = json('package.json');

function walk(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]
  );
}

function lang(): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of read('VeinMinerOreSmelter_RP/texts/en_US.lang').split('\n')) {
    if (!line.trim() || line.startsWith('##')) continue;
    const i = line.indexOf('=');
    out.set(line.slice(0, i), line.slice(i + 1));
  }
  return out;
}

describe('packs', () => {
  it('have matching versions, dependencies and script modules', () => {
    expect(bp.header.version).toBe(pkg.version);
    expect(rp.header.version).toBe(pkg.version);
    expect(bp.dependencies).toContainEqual({ uuid: rp.header.uuid, version: rp.header.version });
    expect(rp.dependencies).toContainEqual({ uuid: bp.header.uuid, version: bp.header.version });
    const modules = Object.fromEntries(
      bp.dependencies.filter((d: { module_name?: string }) => d.module_name).map((d: { module_name: string; version: string }) => [d.module_name, d.version])
    );
    expect(modules).toEqual({
      '@minecraft/server': pkg.devDependencies['@minecraft/server'],
      '@minecraft/server-ui': pkg.devDependencies['@minecraft/server-ui']
    });
    const uuids = [bp.header.uuid, rp.header.uuid, ...bp.modules.map((m: { uuid: string }) => m.uuid), ...rp.modules.map((m: { uuid: string }) => m.uuid)];
    expect(new Set(uuids).size).toBe(uuids.length);
    expect(bp.header.min_engine_version).toBe('1.26.60');
  });

  it('offers the vein limit setting the script reads', () => {
    const slider = bp.settings.find((s: { type: string }) => s.type === 'slider');
    expect(slider).toMatchObject({ name: VEIN_LIMIT_SETTING, min: VEIN_LIMIT.min, max: VEIN_LIMIT.max, default: VEIN_LIMIT.fallback });
    expect((slider.default - slider.min) % slider.step).toBe(0);
    expect((slider.max - slider.min) % slider.step).toBe(0);
  });

  it('defines one book item per enchantment, like a vanilla enchanted book', () => {
    const textures = json('VeinMinerOreSmelter_RP/textures/item_texture.json').texture_data;
    const items = walk('VeinMinerOreSmelter_BP/items').map((f) => json(f)['minecraft:item']);
    expect(items.map((i) => i.description.identifier).sort()).toEqual(ENCHANTMENTS.map((e) => e.book).sort());
    for (const item of items) {
      const c = item.components;
      expect(c['minecraft:max_stack_size']).toBe(1);
      expect(c['minecraft:glint']).toBe(true);
      expect(c['minecraft:display_name'].value).toBe('item.enchanted_book.name');
      expect(c['minecraft:tags'].tags).toEqual(expect.arrayContaining(['vmos:enchanted_book', 'minecraft:bookshelf_books']));
      expect(textures[c['minecraft:icon']]).toBeDefined();
    }
  });

  it('has text for every translation key the scripts use', () => {
    const text = lang();
    const used = new Set<string>();
    for (const f of walk('src')) for (const m of read(f).matchAll(/'(vmos\.[a-z_.]+)'/g)) used.add(m[1]!);
    const failures = read('src/game/anvil.ts').match(/type Failure =([^;]+);/)![1]!.match(/'([a-z_]+)'/g)!;
    for (const f of failures) used.add(`vmos.anvil.fail.${f.replace(/'/g, '')}`);
    for (const e of ENCHANTMENTS) used.add(e.loreKey).add(e.nameKey);
    const missing = [...used].filter((k) => !text.has(k));
    expect(missing).toEqual([]);
    // the translated lore line shows the same text the loot tables write
    for (const e of ENCHANTMENTS) expect(text.get(e.loreKey)).toBe(e.plainLore);
  });

  it('keeps player-facing text free of dash characters', () => {
    const dashes = /[‒–—―−]/;
    for (const [k, v] of lang()) expect(dashes.test(v), k).toBe(false);
    for (const s of bp.settings) expect(dashes.test(s.text ?? '')).toBe(false);
    expect(dashes.test(bp.header.description + rp.header.description)).toBe(false);
  });

  it('writes the same book lore in every loot table', () => {
    const plain = new Map(ENCHANTMENTS.map((e) => [e.book, e.plainLore]));
    const files = walk('VeinMinerOreSmelter_BP/loot_tables/vmos');
    expect(files.length).toBe(15);
    for (const f of files) {
      for (const entry of json(f).pools[0].entries.slice(1)) {
        expect(entry.functions).toEqual([{ function: 'set_lore', lore: [plain.get(entry.name)] }]);
      }
    }
  });

  it('ships a script built from the current source', async () => {
    const out = await build({
      entryPoints: [join(root, 'src/main.ts')],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      target: 'es2022',
      external: ['@minecraft/server', '@minecraft/server-ui'],
      minify: false,
      legalComments: 'none',
      charset: 'utf8',
      banner: { js: `// Vein Miner & Ore Smelter ${pkg.version}. Built from src/ by tools/build.mjs; edit the TypeScript, not this file.` },
      logLevel: 'silent'
    });
    expect(read('VeinMinerOreSmelter_BP/scripts/main.js')).toBe(out.outputFiles[0]!.text);
  });
});
