<script lang="ts">
	import CopyButton from './CopyButton.svelte';

	interface Props {
		code: string;
		title?: string;
	}

	let { code, title }: Props = $props();
</script>

<figure class="code sq r-16 sq-line">
	<figcaption class="head">
		<span class="title">{title ?? ''}</span>
		<CopyButton text={code} />
	</figcaption>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable code must be reachable by keyboard) -->
	<pre tabindex="0" aria-label={title ? `${title}, code` : 'Code'}><code>{code}</code></pre>
</figure>

<style>
	.code {
		position: relative;
		margin: 0 0 var(--s5);
		background: var(--code-bg);
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
		padding: var(--s2) var(--s2) var(--s2) var(--s4);
		border-bottom: 1px solid var(--line);
	}

	.title {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		color: var(--text-3);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	pre {
		margin: 0;
		padding: var(--s4);
		overflow-x: auto;
		font-size: 0.8125rem;
		line-height: 1.6;
		-webkit-overflow-scrolling: touch;
	}

	code {
		font-family: var(--font-mono);
		color: var(--text);
	}
</style>
