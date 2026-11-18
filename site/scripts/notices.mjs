// Writes static/licenses.txt: the licenses of the code, fonts and icons the website ships to visitors.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('..', import.meta.url));
const parts = [
	['Svelte', 'svelte/LICENSE.md', 'svelte'],
	['SvelteKit', '@sveltejs/kit/LICENSE', '@sveltejs/kit'],
	['three.js', 'three/LICENSE', 'three'],
	['pixelarticons (icons)', 'pixelarticons/LICENSE', 'pixelarticons'],
	['Pixelify Sans (font)', '@fontsource/pixelify-sans/LICENSE', '@fontsource/pixelify-sans'],
	['Atkinson Hyperlegible Next (font)', '@fontsource-variable/atkinson-hyperlegible-next/LICENSE', '@fontsource-variable/atkinson-hyperlegible-next'],
	['JetBrains Mono (font)', '@fontsource-variable/jetbrains-mono/LICENSE', '@fontsource-variable/jetbrains-mono']
];

let out = 'Licenses of the software, fonts and icons used by the Enchant+ website.\n';
out += 'Minecraft textures come from Mojang\'s sample resource pack (github.com/Mojang/bedrock-samples) under the Minecraft EULA.\n';
out += 'The add-on\'s own models, textures and menus are by Death_Aruban; see the packs\' license fields and terms.\n';
for (const [name, file, pkg] of parts) {
	const version = JSON.parse(readFileSync(join(site, 'node_modules', pkg, 'package.json'), 'utf8')).version;
	out += `\n\n==== ${name}, ${pkg} ${version} ====\n\n${readFileSync(join(site, 'node_modules', file), 'utf8').trim()}\n`;
}
mkdirSync(join(site, 'static'), { recursive: true });
writeFileSync(join(site, 'static', 'licenses.txt'), out);
console.log(`wrote static/licenses.txt (${parts.length} licenses)`);
