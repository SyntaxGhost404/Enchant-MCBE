/**
 * Horizontal swipe on touch screens (vertical scrolling stays with the browser).
 * Swipes that start on controls or on sideways scrolling content are ignored.
 */
export interface SwipeOptions {
	onswipe: (direction: 'left' | 'right') => void;
	/** live offset while dragging, 0 when released */
	ondrag?: (dx: number) => void;
	enabled?: boolean;
}

const IGNORE = 'input, textarea, select, button, [role="slider"], [role="tablist"], [data-no-swipe], pre, canvas, .table-wrap, .panels, dialog';

export function swipe(node: HTMLElement, options: SwipeOptions) {
	let opts = options;
	let tracking = false;
	let decided = false;
	let horizontal = false;
	let startX = 0;
	let startY = 0;
	let startT = 0;
	let dx = 0;

	function scrollsSideways(el: HTMLElement | null): boolean {
		for (let n = el; n && n !== node; n = n.parentElement) {
			if (n.scrollWidth > n.clientWidth + 2) {
				const o = getComputedStyle(n).overflowX;
				if (o === 'auto' || o === 'scroll') return true;
			}
		}
		return false;
	}

	function down(event: PointerEvent) {
		if (event.pointerType !== 'touch' || opts.enabled === false) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest(IGNORE) || scrollsSideways(target)) return;
		tracking = true;
		decided = false;
		horizontal = false;
		startX = event.clientX;
		startY = event.clientY;
		startT = event.timeStamp;
		dx = 0;
	}

	function move(event: PointerEvent) {
		if (!tracking) return;
		const mx = event.clientX - startX;
		const my = event.clientY - startY;
		if (!decided) {
			if (Math.abs(mx) < 12 && Math.abs(my) < 12) return;
			decided = true;
			horizontal = Math.abs(mx) > Math.abs(my) * 1.5;
			if (!horizontal) {
				tracking = false;
				return;
			}
		}
		dx = mx;
		opts.ondrag?.(dx);
	}

	function up(event: PointerEvent) {
		if (!tracking) return;
		tracking = false;
		if (!horizontal) return;
		opts.ondrag?.(0);
		const speed = Math.abs(dx) / Math.max(1, event.timeStamp - startT);
		if (Math.abs(dx) > Math.min(110, node.clientWidth * 0.28) || (speed > 0.55 && Math.abs(dx) > 40)) {
			opts.onswipe(dx < 0 ? 'left' : 'right');
		}
	}

	function cancel() {
		if (tracking && horizontal) opts.ondrag?.(0);
		tracking = false;
	}

	node.addEventListener('pointerdown', down, { passive: true });
	node.addEventListener('pointermove', move, { passive: true });
	node.addEventListener('pointerup', up, { passive: true });
	node.addEventListener('pointercancel', cancel, { passive: true });

	return {
		update(next: SwipeOptions) {
			opts = next;
		},
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', cancel);
		}
	};
}
