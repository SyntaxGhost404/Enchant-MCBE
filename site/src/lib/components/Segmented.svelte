<script lang="ts" generics="T extends string">
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';
	import { tick } from '$lib/state/haptics';

	interface Option {
		value: T;
		label: string;
		icon?: IconName;
	}

	interface Props {
		options: Option[];
		value: T;
		label: string;
		onchange?: (value: T) => void;
		full?: boolean;
	}

	let { options, value = $bindable(), label, onchange, full = false }: Props = $props();

	let buttons: HTMLButtonElement[] = $state([]);
	let track: HTMLDivElement | undefined = $state();
	let indicator = $state({ left: 0, width: 0, ready: false });

	function measure() {
		const i = options.findIndex((o) => o.value === value);
		const el = buttons[i];
		if (!el || !track) return;
		indicator = { left: el.offsetLeft, width: el.offsetWidth, ready: true };
	}

	$effect(() => {
		void value;
		measure();
	});

	$effect(() => {
		if (!track) return;
		const ro = new ResizeObserver(measure);
		ro.observe(track);
		return () => ro.disconnect();
	});

	function choose(v: T) {
		if (v === value) return;
		value = v;
		tick();
		onchange?.(v);
	}

	function onkeydown(event: KeyboardEvent) {
		const i = options.findIndex((o) => o.value === value);
		let next = i;
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (i + 1) % options.length;
		else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (i - 1 + options.length) % options.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = options.length - 1;
		else return;
		event.preventDefault();
		choose(options[next].value);
		buttons[next]?.focus();
	}
</script>

<div class="seg sq r-16 sq-b" class:full role="radiogroup" aria-label={label} bind:this={track} tabindex="-1" {onkeydown}>
	<span
		class="thumb sq r-12 sq-b"
		class:ready={indicator.ready}
		style="transform: translateX({indicator.left}px); width: {indicator.width}px"
		aria-hidden="true"
	></span>
	{#each options as option, i (option.value)}
		<button
			type="button"
			role="radio"
			class="opt sq r-12"
			aria-checked={option.value === value}
			tabindex={option.value === value ? 0 : -1}
			bind:this={buttons[i]}
			onclick={() => choose(option.value)}
		>
			{#if option.icon}<Icon name={option.icon} size={20} />{/if}
			<span>{option.label}</span>
		</button>
	{/each}
</div>

<style>
	.seg {
		--b: var(--line);
		position: relative;
		display: inline-flex;
		gap: 2px;
		padding: 4px;
		background: var(--panel-2);
		box-shadow: inset 0 0 0 1px var(--line);
		max-width: 100%;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.seg::-webkit-scrollbar {
		display: none;
	}

	.full {
		display: flex;
		width: 100%;
	}

	.full .opt {
		flex: 1;
	}

	.thumb {
		--b: var(--line-2);
		position: absolute;
		top: 4px;
		bottom: 4px;
		left: 0;
		background: var(--panel);
		box-shadow:
			inset 0 0 0 1px var(--line-2),
			inset 0 -2px 0 var(--line-2);
		opacity: 0;
	}

	.thumb.ready {
		opacity: 1;
		transition:
			transform var(--t) var(--ease-spring),
			width var(--t) var(--ease);
	}

	.opt {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 40px;
		padding: 0 14px;
		border: 0;
		background: transparent;
		color: var(--text-2);
		font-family: var(--font-ui);
		font-weight: 600;
		font-size: 0.9375rem;
		white-space: nowrap;
		touch-action: manipulation;
		transition: color var(--t-fast) var(--ease);
	}

	.opt[aria-checked='true'] {
		color: var(--text);
	}

	.opt:hover {
		color: var(--text);
	}
</style>
