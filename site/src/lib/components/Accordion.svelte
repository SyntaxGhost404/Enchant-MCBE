<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		title: string;
		id?: string;
		open?: boolean;
		children: Snippet;
	}

	let { title, id, open = false, children }: Props = $props();
</script>

<details class="acc sq r-16 sq-line" {id} {open}>
	<summary>
		<span class="t">{title}</span>
		<span class="chev"><Icon name="chevron-down" size={24} /></span>
	</summary>
	<div class="a">
		{@render children()}
	</div>
</details>

<style>
	.acc {
		position: relative;
		background: var(--panel);
		margin: 0 0 var(--s2);
	}

	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
		min-height: 56px;
		padding: var(--s3) var(--s3) var(--s3) var(--s5);
		cursor: pointer;
		list-style: none;
		font-family: var(--font-ui);
		font-weight: 600;
		font-size: 1.0625rem;
		line-height: 1.3;
		touch-action: manipulation;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary:hover .t {
		color: var(--text);
	}

	.chev {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		flex: none;
		color: var(--text-3);
		transition: transform var(--t) var(--ease);
	}

	.acc[open] .chev {
		transform: rotate(180deg);
	}

	.a {
		padding: 0 var(--s5) var(--s4);
		color: var(--text-2);
	}

	.a :global(p:last-child),
	.a :global(ul:last-child),
	.a :global(ol:last-child) {
		margin-bottom: 0;
	}

	/* smooth opening where supported */
	.acc::details-content {
		block-size: 0;
		overflow: hidden;
		transition:
			block-size var(--t) var(--ease),
			content-visibility var(--t) allow-discrete;
	}

	.acc[open]::details-content {
		block-size: auto;
	}
</style>
