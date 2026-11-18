<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		tone?: 'note' | 'warn' | 'ok';
		title?: string;
		children: Snippet;
	}

	let { tone = 'note', title, children }: Props = $props();
</script>

<aside class="callout sq r-16 sq-b {tone}">
	<span class="ic"><Icon name={tone === 'warn' ? 'warning' : tone === 'ok' ? 'check' : 'info'} size={24} /></span>
	<div class="txt">
		{#if title}<strong class="ttl">{title}</strong>{/if}
		{@render children()}
	</div>
</aside>

<style>
	.callout {
		--b: var(--line);
		position: relative;
		display: flex;
		gap: var(--s3);
		padding: var(--s4);
		margin: 0 0 var(--s5);
		background: var(--panel-2);
		box-shadow: inset 0 0 0 1px var(--line);
	}

	.ic {
		color: var(--gold);
		flex: none;
		margin-top: 1px;
	}

	.warn .ic {
		color: var(--red);
	}

	.ok .ic {
		color: var(--accent);
	}

	.ttl {
		display: block;
		font-family: var(--font-ui);
		font-weight: 700;
		margin-bottom: 2px;
	}

	.txt :global(p:last-child) {
		margin-bottom: 0;
	}

	.txt {
		min-width: 0;
	}
</style>
