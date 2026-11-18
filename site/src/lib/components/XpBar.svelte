<script lang="ts">
	// Reading progress drawn with Minecraft's own experience bar sprites.
	import { game } from '$lib/addon/assets';

	interface Props {
		progress: number;
	}

	let { progress }: Props = $props();
	const empty = game('ui/experiencebarempty');
	const full = game('ui/experiencebarfull');
</script>

<div class="xp" style="--empty: url('{empty}'); --full: url('{full}')" aria-hidden="true">
	<div class="fill" style="width: {Math.max(0, Math.min(1, progress)) * 100}%"></div>
</div>

<style>
	.xp {
		position: relative;
		height: 10px;
		border-style: solid;
		border-width: 2px 12px;
		border-image: var(--empty) 1 6 fill / 2px 12px stretch;
		image-rendering: pixelated;
	}

	.fill {
		position: absolute;
		top: -2px;
		bottom: -2px;
		left: -12px;
		min-width: 0;
		max-width: calc(100% + 24px);
		border-style: solid;
		border-width: 0 2px;
		border-image: var(--full) 0 1 fill / 0 2px stretch;
		image-rendering: pixelated;
		transition: width 120ms linear;
	}
</style>
