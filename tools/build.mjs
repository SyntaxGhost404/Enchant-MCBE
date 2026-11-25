// Bundles src/ into the behavior pack's single script file. The game provides @minecraft/server and
// @minecraft/server-ui, so they stay as imports. Output is readable (not minified) on purpose: content
// log stack traces then point at code a person can follow.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'VeinMinerOreSmelter_BP/scripts/main.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  external: ['@minecraft/server', '@minecraft/server-ui'],
  minify: false,
  legalComments: 'none',
  charset: 'utf8',
  banner: {
    js: `// Vein Miner & Ore Smelter ${pkg.version}. Built from src/ by tools/build.mjs; edit the TypeScript, not this file.`
  },
  logLevel: 'warning'
});
console.log('built VeinMinerOreSmelter_BP/scripts/main.js');
