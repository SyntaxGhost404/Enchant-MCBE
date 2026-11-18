<script lang="ts">
	interface Props {
		icon?: string;
		name?: string;
		count?: number;
		size?: number;
		/** 3D block renders are scaled smoothly; flat textures stay pixel sharp */
		render?: boolean;
		highlight?: boolean;
	}

	let { icon, name = '', count, size = 56, render = false, highlight = false }: Props = $props();
	const imgSize = $derived(Math.round(size * (render ? 0.82 : 0.64)));
</script>

<span
	class="holder"
	style="--size: {size}px"
	role={icon ? 'img' : undefined}
	aria-label={icon ? name + (count && count > 1 ? `, ${count}` : '') : undefined}
	aria-hidden={icon ? undefined : 'true'}
>
	<span class="slot sq r-12 sq-b" class:highlight class:b2={highlight}>
		{#if icon}
			<img src={icon} alt="" width={imgSize} height={imgSize} class:pixel={!render} draggable="false" />
			{#if count && count > 1}<span class="count num">{count}</span>{/if}
		{/if}
	</span>
	{#if icon}<span class="tip sq r-12" aria-hidden="true">{name}</span>{/if}
</span>

<style>
	.holder {
		position: relative;
		display: inline-block;
		width: var(--size);
		height: var(--size);
		flex: none;
		border-radius: 12px;
		corner-shape: squircle;
		outline-offset: 3px;
	}

	.slot {
		--b: var(--slot-line);
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: var(--slot);
		box-shadow:
			inset 0 0 0 1px var(--slot-line),
			inset 2px 2px 0 rgb(0 0 0 / 0.28),
			inset -2px -2px 0 rgb(255 255 255 / 0.05);
	}

	.highlight {
		--b: var(--gold);
		box-shadow:
			inset 0 0 0 2px var(--gold),
			inset 2px 2px 0 rgb(0 0 0 / 0.28);
	}

	img {
		display: block;
		pointer-events: none;
		user-select: none;
	}

	.count {
		position: absolute;
		right: 5px;
		bottom: 2px;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: calc(var(--size) * 0.3);
		color: #fff;
		text-shadow: 2px 2px 0 #3a3a3a;
		line-height: 1;
	}

	.tip {
		position: absolute;
		left: 50%;
		bottom: calc(100% + 8px);
		transform: translate(-50%, 4px);
		padding: 6px 10px;
		background: #1c1a17;
		color: #f1ebe0;
		box-shadow: inset 0 0 0 1px #4b443c;
		font-family: var(--font-ui);
		font-size: 0.875rem;
		line-height: 1.2;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		z-index: 20;
		transition:
			opacity var(--t-fast) var(--ease),
			transform var(--t-fast) var(--ease);
		font-weight: 600;
	}

	.holder:hover .tip {
		opacity: 1;
		transform: translate(-50%, 0);
	}
</style>
