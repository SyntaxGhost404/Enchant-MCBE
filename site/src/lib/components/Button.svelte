<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';

	interface Props {
		href?: string;
		variant?: 'primary' | 'secondary' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		icon?: IconName;
		iconRight?: IconName;
		download?: string;
		external?: boolean;
		full?: boolean;
		type?: 'button' | 'submit';
		disabled?: boolean;
		label?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
		class?: string;
	}

	let {
		href,
		variant = 'primary',
		size = 'md',
		icon,
		iconRight,
		download,
		external = false,
		full = false,
		type = 'button',
		disabled = false,
		label,
		onclick,
		children,
		class: className = ''
	}: Props = $props();

	const iconSize = $derived(size === 'sm' ? 20 : 24);
</script>

{#snippet inner()}
	{#if icon}<Icon name={icon} size={iconSize} />{/if}
	{#if children}<span class="label">{@render children()}</span>{/if}
	{#if iconRight}<Icon name={iconRight} size={iconSize} />{/if}
{/snippet}

{#if href}
	<a
		class="btn sq sq-b {size === 'sm' ? 'r-12' : 'r-16'} {variant} {size} {className}"
		class:full
		{href}
		{download}
		aria-label={label}
		target={external ? '_blank' : undefined}
		rel={external ? 'noopener' : undefined}
		{onclick}
	>
		{@render inner()}
	</a>
{:else}
	<button
		class="btn sq sq-b {size === 'sm' ? 'r-12' : 'r-16'} {variant} {size} {className}"
		class:full
		{type}
		{disabled}
		aria-label={label}
		{onclick}
	>
		{@render inner()}
	</button>
{/if}

<style>
	.btn {
		--b: transparent;
		--face: var(--btn-green);
		--face-hover: var(--btn-green-hover);
		--lip: var(--btn-green-lip);
		--ink: #fff;
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 48px;
		padding: 0 20px 4px;
		border: 0;
		background: var(--face);
		color: var(--ink);
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.0625rem;
		line-height: 1.1;
		letter-spacing: 0.01em;
		text-decoration: none;
		white-space: nowrap;
		box-shadow:
			inset 0 -4px 0 var(--lip),
			inset 0 2px 0 rgb(255 255 255 / 0.14);
		transition:
			transform var(--t-fast) var(--ease),
			background-color var(--t-fast) var(--ease),
			box-shadow var(--t-fast) var(--ease);
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
	}

	.btn:hover {
		background: var(--face-hover);
		text-decoration: none;
	}

	.btn:active:not(:disabled) {
		transform: translateY(2px);
		padding-bottom: 2px;
		box-shadow:
			inset 0 -2px 0 var(--lip),
			inset 0 2px 0 rgb(0 0 0 / 0.12);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secondary {
		--face: var(--btn-gray);
		--face-hover: var(--btn-gray-hover);
		--lip: var(--btn-gray-lip);
	}

	:global([data-theme='light']) .secondary {
		--face: #e6d8ad;
		--face-hover: #eee2bd;
		--lip: #b39a62;
		--ink: #352a17;
	}

	.ghost {
		--b: var(--line-2);
		--face: transparent;
		--face-hover: var(--panel-2);
		--ink: var(--text);
		box-shadow: inset 0 0 0 1px var(--line-2);
		padding-bottom: 0;
	}

	.ghost:active:not(:disabled) {
		box-shadow: inset 0 0 0 1px var(--line-2);
		padding-bottom: 0;
		transform: translateY(1px);
	}

	.sm {
		min-height: 38px;
		padding: 0 14px 3px;
		font-size: 0.9375rem;
		gap: 8px;
	}

	.sm.ghost {
		padding-bottom: 0;
	}

	.lg {
		min-height: 56px;
		padding: 0 26px 4px;
		font-size: 1.1875rem;
	}

	.full {
		display: flex;
		width: 100%;
	}

	.label {
		display: inline-block;
	}
</style>
