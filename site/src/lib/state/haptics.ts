/** A very short vibration on devices that support it, for slider steps and confirmations. */
export function tick(ms = 6): void {
	try {
		if (typeof navigator !== 'undefined' && 'vibrate' in navigator && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
			navigator.vibrate(ms);
		}
	} catch {
		// unsupported
	}
}
