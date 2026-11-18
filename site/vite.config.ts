import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	// the add-on's files live one folder up
	server: { fs: { allow: ['..'] } },
	// images stay separate files: cached once, not repeated inside every page
	build: { assetsInlineLimit: 0 },
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
