<script lang="ts">
	import Icon from './Icon.svelte';
	import { toasts } from '$lib/state/toast.svelte';
	import { tick } from '$lib/state/haptics';

	interface Props {
		text: string;
		label?: string;
		done?: string;
		compact?: boolean;
	}

	let { text, label = 'Copy', done = 'Copied', compact = false }: Props = $props();
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		let ok = false;
		try {
			await navigator.clipboard.writeText(text);
			ok = true;
		} catch {
			const area = document.createElement('textarea');
			area.value = text;
			area.setAttribute('readonly', '');
			area.style.position = 'fixed';
			area.style.opacity = '0';
			document.body.appendChild(area);
			area.select();
			try {
				ok = document.execCommand('copy');
			} catch {
				ok = false;
			}
			area.remove();
		}
		if (ok) {
			copied = true;
			tick();
			toasts.show(done);
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1600);
		} else {
			toasts.show('Copy failed. Select the text instead.', 'info');
		}
	}
</script>

<button type="button" class="copy sq r-12" class:compact class:copied onclick={copy} aria-label={compact ? label : undefined}>
	<span class="swap">
		<span class="i a"><Icon name="copy" size={20} /></span>
		<span class="i b"><Icon name="check" size={20} /></span>
	</span>
	{#if !compact}<span>{copied ? done : label}</span>{/if}
</button>

<style>
	.copy {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 36px;
		min-width: 36px;
		justify-content: center;
		padding: 0 12px;
		border: 0;
		background: var(--panel-3);
		color: var(--text);
		font-family: var(--font-ui);
		font-size: 0.875rem;
		touch-action: manipulation;
		transition:
			background-color var(--t-fast) var(--ease),
			transform var(--t-fast) var(--ease);
		font-weight: 600;
	}

	.copy:hover {
		background: var(--line);
	}

	.copy:active {
		transform: scale(0.96);
	}

	.compact {
		padding: 0;
		width: 36px;
	}

	.swap {
		position: relative;
		width: 20px;
		height: 20px;
	}

	.i {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		transition:
			opacity var(--t) var(--ease),
			transform var(--t) var(--ease-spring);
	}

	.b {
		opacity: 0;
		transform: scale(0.4);
		color: var(--accent);
	}

	.copied .a {
		opacity: 0;
		transform: scale(0.4);
	}

	.copied .b {
		opacity: 1;
		transform: scale(1);
	}
</style>
