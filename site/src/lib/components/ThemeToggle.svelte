<script lang="ts">
	import Icon from './Icon.svelte';
	import { theme } from '$lib/state/theme.svelte';

	const names = { system: 'System', light: 'Light', dark: 'Dark' } as const;
	const label = $derived(`Theme: ${names[theme.pref]}. Change theme`);
</script>

<button type="button" class="toggle sq r-12" onclick={() => theme.cycle()} aria-label={label} title={label}>
	{#if theme.pref === 'system'}
		<Icon name="monitor" size={24} />
	{:else if theme.pref === 'light'}
		<Icon name="sun" size={24} />
	{:else}
		<Icon name="moon" size={24} />
	{/if}
</button>

<style>
	.toggle {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		background: transparent;
		color: var(--text-2);
		touch-action: manipulation;
		transition:
			background-color var(--t-fast) var(--ease),
			transform var(--t-fast) var(--ease);
	}

	.toggle:hover {
		background: var(--panel-2);
		color: var(--text);
	}

	.toggle:active {
		transform: scale(0.92);
	}
</style>
