<script lang="ts">
	// The green corner gems of the add-on's menus, drawn from its own menu texture.
	import { images } from '$lib/addon/assets';

	interface Props {
		corner?: 'tl' | 'tr' | 'bl' | 'br';
		scale?: number;
	}

	let { corner = 'bl', scale = 2 }: Props = $props();
	const origin = { tl: [1, 25], tr: [222, 25], bl: [1, 240], br: [222, 240] } as const;
	const style = $derived(
		`width:${9 * scale}px;height:${9 * scale}px;background-image:url("${images.uiBackground}");` +
			`background-size:${232 * scale}px ${250 * scale}px;background-position:${-origin[corner][0] * scale}px ${-origin[corner][1] * scale}px`
	);
</script>

<span class="gem {corner}" {style} aria-hidden="true"></span>

<style>
	.gem {
		position: absolute;
		display: block;
		image-rendering: pixelated;
		pointer-events: none;
	}
	.tl {
		top: 7px;
		left: 7px;
	}
	.tr {
		top: 7px;
		right: 7px;
	}
	.bl {
		bottom: 7px;
		left: 7px;
	}
	.br {
		bottom: 7px;
		right: 7px;
	}
</style>
