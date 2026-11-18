/** Short confirmations ("Copied") shown at the bottom of the screen. */
export interface Toast {
	id: number;
	text: string;
	tone: 'ok' | 'info';
}

class ToastState {
	items = $state<Toast[]>([]);
	#next = 1;

	show(text: string, tone: Toast['tone'] = 'ok', ms = 2200) {
		const id = this.#next++;
		this.items = [...this.items.slice(-2), { id, text, tone }];
		setTimeout(() => this.dismiss(id), ms);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toasts = new ToastState();
