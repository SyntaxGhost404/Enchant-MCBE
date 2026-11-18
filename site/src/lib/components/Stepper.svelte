<script lang="ts">
	import Icon from './Icon.svelte';
	import { tick } from '$lib/state/haptics';

	interface Props {
		value: number;
		min?: number;
		max?: number;
		label: string;
		id: string;
		onchange?: (value: number) => void;
	}

	let { value = $bindable(), min = 0, max = 99, label, id, onchange }: Props = $props();
	let repeatTimer: ReturnType<typeof setTimeout> | undefined;

	function set(v: number) {
		const next = Math.min(max, Math.max(min, Math.round(v)));
		if (next !== value) {
			value = next;
			tick(4);
			onchange?.(next);
		}
	}

	// press and hold to keep counting
	function hold(delta: number) {
		set(value + delta);
		let delay = 380;
		const run = () => {
			set(value + delta);
			delay = Math.max(50, delay * 0.8);
			repeatTimer = setTimeout(run, delay);
		};
		repeatTimer = setTimeout(run, delay);
	}

	function release() {
		clearTimeout(repeatTimer);
	}
</script>

<div class="stepper">
	<label for={id} class="lbl">{label}</label>
	<div class="row sq r-16 sq-b">
		<button
			type="button"
			class="b sq r-12"
			aria-label="Fewer"
			disabled={value <= min}
			onpointerdown={(e) => {
				if (e.button === 0) hold(-1);
			}}
			onpointerup={release}
			onpointerleave={release}
			onpointercancel={release}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					set(value - 1);
				}
			}}
		>
			<Icon name="minus" size={24} />
		</button>
		<input
			{id}
			type="number"
			inputmode="numeric"
			{min}
			{max}
			{value}
			onchange={(e) => set(Number((e.currentTarget as HTMLInputElement).value))}
			class="num"
		/>
		<button
			type="button"
			class="b sq r-12"
			aria-label="More"
			disabled={value >= max}
			onpointerdown={(e) => {
				if (e.button === 0) hold(1);
			}}
			onpointerup={release}
			onpointerleave={release}
			onpointercancel={release}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					set(value + 1);
				}
			}}
		>
			<Icon name="plus" size={24} />
		</button>
	</div>
</div>

<style>
	.stepper {
		display: grid;
		gap: 6px;
	}

	.lbl {
		font-family: var(--font-ui);
		font-weight: 600;
	}

	.row {
		--b: var(--line);
		position: relative;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px;
		background: var(--panel-2);
		box-shadow: inset 0 0 0 1px var(--line);
		width: max-content;
	}

	.b {
		display: grid;
		place-items: center;
		width: 48px;
		height: 44px;
		border: 0;
		background: var(--panel-3);
		color: var(--text);
		touch-action: manipulation;
		user-select: none;
		-webkit-user-select: none;
		transition:
			transform var(--t-fast) var(--ease),
			background-color var(--t-fast) var(--ease);
	}

	.b:hover:not(:disabled) {
		background: var(--line);
	}

	.b:active:not(:disabled) {
		transform: scale(0.94);
	}

	.b:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	input {
		width: 3.5ch;
		min-width: 64px;
		height: 44px;
		border: 0;
		background: transparent;
		text-align: center;
		font-family: var(--font-ui);
		font-weight: 700;
		font-size: 1.375rem;
		color: var(--text);
		-moz-appearance: textfield;
		appearance: textfield;
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
