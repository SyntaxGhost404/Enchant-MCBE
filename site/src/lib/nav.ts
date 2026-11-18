import { base } from '$app/paths';
import type { IconName } from './components/icons';

/** a site path with the deploy base (GitHub Pages serves the site from /<repository>/) */
export function href(path: string): string {
	return `${base}${path}`;
}

/** the path without the base, for comparing against links */
export function local(pathname: string): string {
	return base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
}

export const REPO_URL = 'https://github.com/SyntaxGhost404/Enchant-MCBE';
export const ORIGINAL_URL = 'https://github.com/DeathAruban/Enchant-MCBE';
export const SITE_URL = 'https://syntaxghost404.github.io/Enchant-MCBE/';

export interface NavItem {
	path: string;
	label: string;
	icon: IconName;
}

/** bottom tab bar on phones */
export const tabs: NavItem[] = [
	{ path: '/', label: 'Home', icon: 'home' },
	{ path: '/guide/', label: 'Guide', icon: 'book' },
	{ path: '/guide/prices/', label: 'Prices', icon: 'calculator' },
	{ path: '/download/', label: 'Download', icon: 'download' },
	{ path: '/help/', label: 'Help', icon: 'help' }
];

/** top bar on wide screens */
export const topNav: NavItem[] = [
	{ path: '/guide/', label: 'Guide', icon: 'book' },
	{ path: '/guide/prices/', label: 'Prices', icon: 'calculator' },
	{ path: '/guide/enchantments/', label: 'Enchantments', icon: 'gem' },
	{ path: '/download/', label: 'Download', icon: 'download' },
	{ path: '/changelog/', label: 'Changelog', icon: 'clock' },
	{ path: '/help/', label: 'Help', icon: 'help' }
];

export interface GuidePage {
	slug: string;
	title: string;
	/** one line for lists */
	blurb: string;
	icon: IconName;
}

export const guidePages: GuidePage[] = [
	{ slug: 'start', title: 'Get started', blurb: 'Craft the essence and the table, then place it.', icon: 'blocks' },
	{ slug: 'menus', title: 'Using the menus', blurb: 'Enchant, Disenchant and Transfer, screen by screen.', icon: 'list' },
	{ slug: 'prices', title: 'Prices', blurb: 'What everything costs, with a calculator.', icon: 'calculator' },
	{ slug: 'enchantments', title: 'Enchantments', blurb: 'Every enchantment, its top level and what it clashes with.', icon: 'gem' },
	{ slug: 'settings', title: 'Settings and config', blurb: 'Cost scaling in the world settings, and config.js.', icon: 'sliders' },
	{ slug: 'servers', title: 'Servers and Realms', blurb: 'Dedicated servers, Realms and scoreboard money.', icon: 'server' },
	{ slug: 'troubleshooting', title: 'Troubleshooting', blurb: 'Fixes for the problems players hit most.', icon: 'tools' }
];

export function guidePath(slug: string): string {
	return `/guide/${slug}/`;
}

export function isActive(current: string, path: string): boolean {
	if (path === '/') return current === '/';
	if (path === '/guide/') return current.startsWith('/guide/') && !current.startsWith('/guide/prices/');
	return current.startsWith(path);
}
