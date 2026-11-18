<script lang="ts" generics="T extends string">
	import { tick } from '$lib/state/haptics';

	interface Option {
		value: T;
		label: string;
	}

	interface Props {
		options: Option[];
		value: T;
		label: string;
		name: string;
	}

	let { options, value = $bindable(), label, name }: Props = $props();
</script>

<div class="grid" role="radiogroup" aria-label={label}>
	{#each options as o (o.value)}
		<label class="opt sq r-12 sq-b" class:on={o.value === value} class:b2={o.value === value}>
			<input type="radio" {name} value={o.value} bind:group={value} onchange={() => tick()} />
			<span>{o.label}</span>
		</label>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}

	@media (min-width: 700px) {
		.grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.opt {
		--b: var(--line);
		position: relative;
		display: grid;
		place-items: center;
		min-height: 44px;
		padding: 6px 10px;
		background: var(--panel-2);
		box-shadow: inset 0 0 0 1px var(--line);
		font-family: var(--font-ui);
		font-weight: 600;
		font-size: 0.9375rem;
		text-align: center;
		color: var(--text-2);
		cursor: pointer;
		touch-action: manipulation;
		transition:
			background-color var(--t-fast) var(--ease),
			transform var(--t-fast) var(--ease);
	}

	.opt:active {
		transform: scale(0.97);
	}

	.opt.on {
		--b: var(--gold);
		background: var(--panel-3);
		color: var(--text);
		box-shadow: inset 0 0 0 2px var(--gold);
	}

	.opt input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.opt:has(input:focus-visible) {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
</style>
