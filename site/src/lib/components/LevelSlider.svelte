<script lang="ts">
	import { tick } from '$lib/state/haptics';

	interface Props {
		value: number;
		min?: number;
		max: number;
		label: string;
		id: string;
		/** text shown for a value, e.g. Roman numerals */
		format?: (value: number) => string;
		onchange?: (value: number) => void;
	}

	let { value = $bindable(), min = 0, max, label, id, format = (v) => String(v), onchange }: Props = $props();
	const pct = $derived(max > min ? ((value - min) / (max - min)) * 100 : 100);
	const steps = $derived(Array.from({ length: max - min + 1 }, (_, i) => min + i));

	function oninput(event: Event) {
		const v = Number((event.currentTarget as HTMLInputElement).value);
		if (v !== value) {
			value = v;
			tick();
			onchange?.(v);
		}
	}
</script>

<div class="level">
	<div class="top">
		<label for={id}>{label}</label>
		<output for={id} class:zero={value === min}>{value === min && min === 0 ? 'None' : format(value)}</output>
	</div>
	<input
		type="range"
		{id}
		{min}
		{max}
		step="1"
		{value}
		{oninput}
		style="--p: {pct}%"
		aria-valuetext={value === 0 ? 'None' : format(value)}
	/>
	{#if steps.length <= 11}
		<div class="ticks" aria-hidden="true">
			{#each steps as s (s)}<span class:on={s <= value && s > min}></span>{/each}
		</div>
	{/if}
</div>

<style>
	.level {
		display: grid;
		gap: 6px;
	}

	.top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--s3);
	}

	label {
		font-family: var(--font-ui);
		font-weight: 600;
	}

	output {
		font-family: var(--font-ui);
		font-weight: 700;
		color: var(--xp);
		min-width: 3ch;
		text-align: right;
	}

	output.zero {
		color: var(--text-3);
	}

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 32px;
		margin: 0;
		background: transparent;
		cursor: pointer;
		touch-action: pan-y;
	}

	input[type='range']::-webkit-slider-runnable-track {
		height: 14px;
		border-radius: 5px;
		background:
			linear-gradient(var(--xp), var(--xp)) 0 0 / var(--p) 100% no-repeat,
			var(--slot);
		box-shadow:
			inset 0 0 0 1px var(--slot-line),
			inset 0 2px 0 rgb(0 0 0 / 0.25);
	}

	input[type='range']::-moz-range-track {
		height: 14px;
		border-radius: 5px;
		background: var(--slot);
		box-shadow: inset 0 0 0 1px var(--slot-line);
	}

	input[type='range']::-moz-range-progress {
		height: 14px;
		border-radius: 5px;
		background: var(--xp);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 26px;
		height: 30px;
		margin-top: -8px;
		border: 0;
		border-radius: 8px;
		corner-shape: squircle;
		background: var(--gold);
		box-shadow:
			inset 0 -4px 0 rgb(0 0 0 / 0.28),
			inset 0 2px 0 rgb(255 255 255 / 0.35);
		transition: transform var(--t-fast) var(--ease);
	}

	input[type='range']::-moz-range-thumb {
		width: 26px;
		height: 30px;
		border: 0;
		border-radius: 8px;
		background: var(--gold);
		box-shadow:
			inset 0 -4px 0 rgb(0 0 0 / 0.28),
			inset 0 2px 0 rgb(255 255 255 / 0.35);
	}

	input[type='range']:active::-webkit-slider-thumb {
		transform: scale(1.08);
	}

	input[type='range']:focus-visible {
		outline: none;
	}

	input[type='range']:focus-visible::-webkit-slider-thumb {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	.ticks {
		display: flex;
		justify-content: space-between;
		padding: 0 11px;
		margin-top: -4px;
	}

	.ticks span {
		width: 4px;
		height: 6px;
		background: var(--line-2);
	}

	.ticks span.on {
		background: var(--xp);
	}
</style>
