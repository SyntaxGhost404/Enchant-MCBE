/** Theme preference: follows the system unless the visitor picks light or dark. */
export type ThemePref = 'system' | 'light' | 'dark';

const order: ThemePref[] = ['system', 'light', 'dark'];

class ThemeState {
	pref = $state<ThemePref>('system');
	resolved = $state<'light' | 'dark'>('dark');
	#media: MediaQueryList | undefined;

	init() {
		try {
			const saved = localStorage.getItem('theme');
			this.pref = saved === 'light' || saved === 'dark' ? saved : 'system';
		} catch {
			this.pref = 'system';
		}
		this.#media = matchMedia('(prefers-color-scheme: light)');
		this.#media.addEventListener('change', () => this.apply());
		this.apply();
	}

	set(pref: ThemePref) {
		this.pref = pref;
		try {
			if (pref === 'system') localStorage.removeItem('theme');
			else localStorage.setItem('theme', pref);
		} catch {
			// not remembered, still applied
		}
		this.apply();
	}

	cycle() {
		this.set(order[(order.indexOf(this.pref) + 1) % order.length]);
	}

	apply() {
		const light = this.pref === 'light' || (this.pref === 'system' && !!this.#media?.matches);
		this.resolved = light ? 'light' : 'dark';
		document.documentElement.dataset.theme = this.resolved;
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#efe7d6' : '#131210');
	}
}

export const theme = new ThemeState();
