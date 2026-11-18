/** localStorage that never throws (private windows, blocked storage). */
export function load<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

export function save(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// storage unavailable: the value just isn't remembered
	}
}

export function remove(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch {
		// ignore
	}
}
