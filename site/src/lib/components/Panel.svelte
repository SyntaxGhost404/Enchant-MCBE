<script lang="ts">
	import type { Snippet } from 'svelte';
	import Gem from './Gem.svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';

	interface Props {
		title?: string;
		icon?: IconName;
		gems?: boolean;
		id?: string;
		tag?: 'section' | 'div' | 'article';
		headingLevel?: 2 | 3;
		actions?: Snippet;
		children: Snippet;
		class?: string;
	}

	let { title, icon, gems = false, id, tag = 'section', headingLevel = 2, actions, children, class: className = '' }: Props = $props();
</script>

<svelte:element this={tag} class="panel sq r-22 sq-line {className}" {id}>
	{#if title}
		<header class="strip">
			<svelte:element this={headingLevel === 2 ? 'h2' : 'h3'} class="strip-title">
				{#if icon}<Icon name={icon} size={20} />{/if}
				{title}
			</svelte:element>
			{#if actions}<div class="strip-actions">{@render actions()}</div>{/if}
		</header>
	{/if}
	<div class="body" class:gems>
		{@render children()}
	</div>
	{#if gems}
		<Gem corner="bl" />
		<Gem corner="br" />
	{/if}
</svelte:element>

<style>
	.panel {
		position: relative;
		background: var(--panel);
		overflow: hidden;
	}

	.strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
		min-height: 48px;
		padding: var(--s2) var(--s4) var(--s2) var(--s5);
		background: var(--header-strip);
		color: #fff;
		box-shadow: inset 0 -1px 0 rgb(0 0 0 / 0.35);
	}

	.strip-title {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		font-size: 1.125rem;
		line-height: 1.2;
	}

	.strip-actions {
		display: flex;
		gap: var(--s2);
	}

	.body {
		padding: var(--s5);
	}

	.body.gems {
		padding-bottom: var(--s7);
	}

	@media (min-width: 700px) {
		.body {
			padding: var(--s6);
		}
		.body.gems {
			padding-bottom: var(--s8);
		}
	}
</style>
