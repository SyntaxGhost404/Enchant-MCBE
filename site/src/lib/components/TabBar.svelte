<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { href, isActive, local, tabs } from '$lib/nav';
	import { tick } from '$lib/state/haptics';

	const current = $derived(local(page.url.pathname));
</script>

<nav class="tabbar" aria-label="Sections">
	{#each tabs as item (item.path)}
		{@const active = isActive(current, item.path)}
		<a href={href(item.path)} class="tab" class:active aria-current={active ? 'page' : undefined} onclick={() => tick(4)}>
			<span class="ic sq r-12"><Icon name={item.icon} size={24} /></span>
			<span class="lbl">{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	.tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 60;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		height: calc(var(--tabbar) + var(--safe-bottom));
		padding: 6px 6px var(--safe-bottom);
		background: var(--bg-2);
		border-top: 1px solid var(--line);
	}

	@media (min-width: 960px) {
		.tabbar {
			display: none;
		}
	}

	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		color: var(--text-3);
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: 0.75rem;
		font-weight: 600;
		touch-action: manipulation;
		-webkit-user-select: none;
		user-select: none;
	}

	.ic {
		display: grid;
		place-items: center;
		width: 52px;
		height: 30px;
		transition:
			background-color var(--t) var(--ease),
			transform var(--t-fast) var(--ease);
	}

	.tab:active .ic {
		transform: scale(0.9);
	}

	.active {
		color: var(--text);
	}

	.active .ic {
		background: var(--panel-3);
		color: var(--gold);
	}
</style>
