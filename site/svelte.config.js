import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

// The repository root: the site reads the add-on's own files (manifests, config.js, pricing code,
// recipes, models, textures) from here, so it always describes the packs it ships with.
const repo = fileURLToPath(new URL('..', import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ pages: 'build', assets: 'build', fallback: '404.html', strict: true }),
		// GitHub Pages serves the site from /<repository>/; BASE_PATH is set by the deploy workflow.
		paths: { base: process.env.BASE_PATH ?? '', relative: false },
		alias: {
			$repo: repo,
			// The add-on's scripts import the game's module; in the browser they get a small stand-in.
			'@minecraft/server': 'src/lib/addon/minecraft-server-shim.ts'
		},
		prerender: { entries: ['*'], handleHttpError: 'fail', handleMissingId: 'fail' }
	}
};

export default config;
