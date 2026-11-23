import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
	'/',
	'/guide/',
	'/guide/start/',
	'/guide/menus/',
	'/guide/prices/',
	'/guide/enchantments/',
	'/guide/settings/',
	'/guide/servers/',
	'/guide/troubleshooting/',
	'/download/',
	'/changelog/',
	'/compatibility/',
	'/help/',
	'/report/'
];

function watchErrors(page: Page) {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(m.text());
	});
	return errors;
}

const isPhone = (name: string) => name === 'phone';

test.describe('every page', () => {
	for (const path of PAGES) {
		test(`loads cleanly: ${path}`, async ({ page }) => {
			const errors = watchErrors(page);
			await page.goto(path);
			await expect(page.locator('h1')).toHaveCount(1);
			await expect(page).toHaveTitle(/Enchant\+/);
			const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			expect(overflow, 'no sideways scrolling').toBeLessThanOrEqual(0);
			expect(errors).toEqual([]);
		});

		for (const scheme of ['light', 'dark'] as const) {
			test(`has no accessibility violations (${scheme}): ${path}`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: scheme });
				await page.goto(path);
				await page.evaluate(() => document.fonts.ready);
				const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
				const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')}`);
				expect(summary).toEqual([]);
			});
		}
	}

	test('unknown pages show the 404 page', async ({ page }) => {
		await page.goto('/no-such-page/');
		await expect(page.locator('h1')).toHaveText('This page is missing');
	});
});

test('navigation reaches every section', async ({ page }, info) => {
	await page.goto('/');
	if (isPhone(info.project.name)) {
		const bar = page.getByRole('navigation', { name: 'Sections' });
		await bar.getByRole('link', { name: 'Prices' }).click();
		await expect(page).toHaveURL(/\/guide\/prices\/$/);
		await expect(bar.getByRole('link', { name: 'Prices' })).toHaveAttribute('aria-current', 'page');
		await bar.getByRole('link', { name: 'Help' }).click();
		await expect(page).toHaveURL(/\/help\/$/);
	} else {
		const nav = page.getByRole('navigation', { name: 'Main' });
		await nav.getByRole('link', { name: 'Enchantments' }).click();
		await expect(page).toHaveURL(/\/guide\/enchantments\/$/);
		await nav.getByRole('link', { name: 'Changelog' }).click();
		await expect(page.locator('h1')).toHaveText('What changed');
	}
});

test.describe('price calculator', () => {
	const xp = (page: Page) => page.locator('#calculator .stat').nth(0).locator('.stat-value');
	const essence = (page: Page) => page.locator('#calculator .stat').nth(1).locator('.stat-value');

	test('matches the add-on prices', async ({ page }) => {
		await page.goto('/guide/prices/');
		await expect(xp(page)).toHaveText('15');
		await expect(essence(page)).toHaveText('15');
		await page.getByRole('radio', { name: 'Transfer', exact: true }).click();
		await expect(xp(page)).toHaveText('8');
		await expect(essence(page)).toHaveText('8');
		await page.getByRole('radio', { name: 'Disenchant', exact: true }).click();
		await expect(xp(page)).toHaveText('7');
		await page.getByRole('radio', { name: 'Enchant', exact: true }).click();
		await page.locator('label.mode', { hasText: 'Flat XP' }).click();
		await expect(xp(page)).toHaveText('3');
		await expect(essence(page)).toHaveText('15');
		await expect(page).toHaveURL(/mode=flat_xp/);
	});

	test('warns about clashing enchantments and keeps the setup in the link', async ({ page }) => {
		await page.goto('/guide/prices/');
		await page.getByRole('radio', { name: 'Pick enchantments', exact: true }).click();
		await page.locator('#pick-sharpness').fill('3');
		await page.locator('#pick-smite').fill('1');
		await expect(page.locator('.blocked')).toContainText('Sharpness and Smite');
		await expect(xp(page)).toHaveText('12');
		await expect(page).toHaveURL(/item=sword/);
		await page.reload();
		await expect(page.locator('#pick-sharpness')).toHaveValue('3');
		await expect(xp(page)).toHaveText('12');
	});

	test('custom amounts change the result', async ({ page }) => {
		await page.goto('/guide/prices/');
		await page.getByRole('button', { name: /Custom amounts/ }).click();
		await page.locator('#cfg-xp').fill('5');
		await page.locator('#cfg-xp').blur();
		await expect(xp(page)).toHaveText('25');
		await expect(page).toHaveURL(/cfg=/);
	});
});

test('enchantment explorer filters and links clashes', async ({ page }) => {
	await page.goto('/guide/enchantments/');
	await page.getByRole('radio', { name: 'Bows', exact: true }).click();
	await expect(page.locator('#e-infinity')).toBeVisible();
	await expect(page.locator('#e-sharpness')).toHaveCount(0);
	await page.getByPlaceholder('Search').fill('mend');
	await expect(page.locator('.ench')).toHaveCount(1);
	await page.locator('#e-mending').getByRole('link', { name: 'Infinity' }).click();
	await expect(page.locator('#e-infinity')).toHaveClass(/flash/);
});

test('the download is a real file with the listed size', async ({ page, request }) => {
	await page.goto('/download/');
	const link = page.getByRole('link', { name: /^Download 1\./ }).first();
	const href = await link.getAttribute('href');
	expect(href).toMatch(/\.mcaddon$/);
	expect(await link.getAttribute('download')).toBe('Enchant+ 1.1.1.mcaddon');
	const res = await request.get(href!);
	expect(res.ok()).toBe(true);
	const body = await res.body();
	expect(body.subarray(0, 2).toString()).toBe('PK');
	const listed = Number((await page.locator('dd.num').first().textContent())!.replace(/\D/g, ''));
	expect(Math.round(body.length / 1024)).toBe(listed);
});

test('bug report fills the GitHub form and keeps the draft', async ({ page, context }) => {
	// The test checks the link, not GitHub itself: a stand in page answers instead, so GitHub's login
	// redirect for visitors who aren't signed in can't change the address.
	await context.route('https://github.com/**', (route) =>
		route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>GitHub</title>' })
	);
	await page.goto('/report/');
	const open = page.getByRole('button', { name: 'Open on GitHub' });
	await expect(open).toBeDisabled();
	await page.getByLabel(/Short summary/).fill('Sphere goes missing');
	await page.getByLabel(/What happened/).fill('After a /kill the sphere is gone.');
	await page.getByText('Android', { exact: true }).click();
	await page.getByLabel(/Minecraft version/).fill('26.60');
	await expect(open).toBeEnabled();
	const [popup] = await Promise.all([context.waitForEvent('page'), open.click()]);
	await popup.waitForURL(/^https:\/\/github\.com\//);
	const url = new URL(popup.url());
	expect(url.pathname).toMatch(/\/issues\/new$/);
	expect(url.searchParams.get('template')).toBe('bug_report.yml');
	expect(url.searchParams.get('device')).toBe('Android');
	expect(url.searchParams.get('minecraft-version')).toBe('26.60');
	await popup.close();
	await page.reload();
	await expect(page.getByLabel(/Short summary/)).toHaveValue('Sphere goes missing');
});

test('theme choice is applied and remembered', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.getByRole('button', { name: /Theme: System/ }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('guide pages turn with a sideways swipe on phones', async ({ page }, info) => {
	test.skip(!isPhone(info.project.name), 'touch only');
	await page.goto('/guide/start/');
	const box = (await page.locator('article.article p').nth(1).boundingBox())!;
	await page.evaluate(
		async ({ x, y }) => {
			const el = document.elementFromPoint(x, y)!;
			const fire = (type: string, cx: number) =>
				el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', isPrimary: true, pointerId: 7, clientX: cx, clientY: y }));
			fire('pointerdown', x + 120);
			for (let i = 1; i <= 8; i++) {
				await new Promise((r) => setTimeout(r, 16));
				fire('pointermove', x + 120 - i * 25);
			}
			fire('pointerup', x - 80);
		},
		{ x: box.x + box.width / 2, y: box.y + box.height / 2 }
	);
	await expect(page).toHaveURL(/\/guide\/menus\/$/);
});

test('guide page list opens as a sheet and closes', async ({ page }, info) => {
	test.skip(!isPhone(info.project.name), 'the sidebar is used on wide screens');
	await page.goto('/guide/prices/');
	await page.getByRole('button', { name: /Guide/ }).first().click();
	const sheet = page.getByRole('dialog', { name: 'Guide' });
	await expect(sheet).toBeVisible();
	await sheet.getByRole('link', { name: /Enchantments/ }).click();
	await expect(page).toHaveURL(/\/guide\/enchantments\/$/);
	await expect(sheet).toBeHidden();
});

test('menu pictures open full screen', async ({ page }) => {
	await page.goto('/guide/menus/');
	await page.getByRole('button', { name: /Open larger: Select Item/ }).click();
	const viewer = page.getByRole('dialog', { name: /Select Item menu/ });
	await expect(viewer).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(viewer).toBeHidden();
});

test('the 3D view starts', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.viewer canvas')).toHaveClass(/live/, { timeout: 15_000 });
	await page.getByRole('button', { name: 'Reset the view' }).click();
});

test('config builder writes a valid config.js', async ({ page }) => {
	await page.goto('/guide/settings/');
	await page.locator('#b-xp-remove').fill('7');
	await page.locator('#b-xp-remove').blur();
	const code = await page.locator('#builder pre code').textContent();
	expect(code).toContain('xp_remove:7');
	const parsed = new Function(code!.replace('export const config =', 'return'))();
	expect(parsed.xp.xp_remove).toBe(7);
	expect(parsed.items.amount).toBe(3);
});

test('pages work offline after the first visit', async ({ page, context }, info) => {
	test.skip(info.project.name !== 'desktop', 'once is enough');
	await page.goto('/');
	await page.evaluate(async () => {
		const reg = await navigator.serviceWorker.ready;
		return !!reg.active;
	});
	await page.reload();
	await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
	await context.setOffline(true);
	await page.goto('/guide/troubleshooting/');
	await expect(page.locator('h1')).toHaveText('Troubleshooting');
	await page.goto('/guide/prices/');
	await expect(page.locator('#calculator .stat-value').first()).toHaveText('15');
	await context.setOffline(false);
});
