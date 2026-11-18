import { defineConfig, devices } from '@playwright/test';

const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
	testDir: 'tests',
	fullyParallel: true,
	retries: 0,
	reporter: [['list']],
	webServer: {
		command: 'npm run build && npx vite preview --port 4174 --strictPort',
		port: 4174,
		reuseExistingServer: !process.env.CI,
		timeout: 300_000
	},
	use: { baseURL: 'http://localhost:4174', trace: 'off' },
	projects: [
		{ name: 'phone', use: { ...devices['Pixel 7'], launchOptions: { args: gl } } },
		{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 }, launchOptions: { args: gl } } }
	]
});
