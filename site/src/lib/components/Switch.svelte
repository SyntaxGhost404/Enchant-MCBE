<script lang="ts">
	import { tick } from '$lib/state/haptics';

	interface Props {
		checked: boolean;
		label: string;
		id: string;
		onchange?: (checked: boolean) => void;
	}

	let { checked = $bindable(), label, id, onchange }: Props = $props();
</script>

<label class="sw" for={id}>
	<span class="lbl">{label}</span>
	<button
		{id}
		type="button"
		role="switch"
		aria-checked={checked}
		aria-label={label}
		class="track sq r-12"
		onclick={() => {
			checked = !checked;
			tick();
			onchange?.(checked);
		}}
	>
		<span class="knob sq r-12"></span>
	</button>
</label>

<style>
	.sw {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
		min-height: 44px;
		cursor: pointer;
	}

	.lbl {
		font-family: var(--font-ui);
		font-weight: 600;
	}

	.track {
		position: relative;
		width: 56px;
		height: 32px;
		flex: none;
		border: 0;
		padding: 0;
		background: var(--slot);
		box-shadow: inset 0 0 0 1px var(--slot-line);
		transition: background-color var(--t) var(--ease);
	}

	.track[aria-checked='true'] {
		background: var(--btn-green);
		box-shadow: inset 0 -3px 0 var(--btn-green-lip);
	}

	.knob {
		position: absolute;
		top: 4px;
		left: 4px;
		width: 24px;
		height: 24px;
		--r: 12px;
		background: #f1ebe0;
		box-shadow: inset 0 -3px 0 rgb(0 0 0 / 0.2);
		transition: transform var(--t) var(--ease-spring);
	}

	@supports not (corner-shape: squircle) {
		.knob {
			clip-path: var(--sq-fill-12);
		}
	}

	.track[aria-checked='true'] .knob {
		transform: translateX(24px);
	}
</style>
