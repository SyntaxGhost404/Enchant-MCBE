<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';
	import posterUrl from '$lib/assets/renders/room.webp';
	import type { SceneController } from '$lib/three/scene';

	let host: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	let live = $state(false);
	let touched = $state(false);
	let controller: SceneController | undefined;

	onMount(() => {
		let disposed = false;
		let visible = false;
		const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

		const sync = () => controller?.setRunning(visible && document.visibilityState === 'visible');

		async function start() {
			if (controller || disposed || !canvas) return;
			const probe = document.createElement('canvas');
			if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return;
			try {
				const { createScene } = await import('$lib/three/scene');
				if (disposed) return;
				controller = await createScene(canvas, { reducedMotion });
				if (disposed) {
					controller.dispose();
					return;
				}
				controller.onInteract(() => (touched = true));
				live = true;
				sync();
			} catch (error) {
				console.warn('3D view unavailable', error);
			}
		}

		const io = new IntersectionObserver(
			(entries) => {
				visible = entries[0]?.isIntersecting ?? false;
				if (visible && !controller) {
					const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
					if (idle) idle(() => start(), { timeout: 1200 });
					else setTimeout(start, 300);
				}
				sync();
			},
			{ rootMargin: '120px' }
		);
		if (host) io.observe(host);
		document.addEventListener('visibilitychange', sync);

		return () => {
			disposed = true;
			io.disconnect();
			document.removeEventListener('visibilitychange', sync);
			controller?.dispose();
			controller = undefined;
		};
	});
</script>

<div class="viewer sq r-28" bind:this={host} data-no-swipe>
	<img class="poster" src={posterUrl} alt="The Enchant+ table with its floating sphere in a room lined with bookshelves" width="1600" height="1000" fetchpriority="high" />
	<canvas bind:this={canvas} class:live aria-label="3D view of the Enchant+ table. Drag to turn it, pinch to zoom."></canvas>
	{#if live}
		<div class="hud">
			<span class="hint sq r-12" class:gone={touched}>Drag to look around</span>
			<button type="button" class="reset sq r-12" onclick={() => controller?.resetView()} aria-label="Reset the view" title="Reset the view">
				<Icon name="reload" size={20} />
			</button>
		</div>
	{/if}
</div>

<style>
	.viewer {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: #15110d;
		box-shadow: inset 0 0 0 1px var(--line);
	}

	@media (min-width: 700px) {
		.viewer {
			aspect-ratio: 16 / 11;
		}
	}

	.poster,
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.poster {
		object-fit: cover;
	}

	canvas {
		display: block;
		opacity: 0;
		transition: opacity 500ms var(--ease);
		cursor: grab;
	}

	canvas:active {
		cursor: grabbing;
	}

	canvas.live {
		opacity: 1;
	}

	.hud {
		position: absolute;
		left: 12px;
		right: 12px;
		bottom: 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s2);
		pointer-events: none;
	}

	.hint {
		padding: 7px 12px;
		background: rgb(20 17 13 / 0.78);
		color: #f1ebe0;
		font-family: var(--font-display);
		font-size: 0.875rem;
		transition: opacity 400ms var(--ease);
	}

	.hint.gone {
		opacity: 0;
	}

	.reset {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 0;
		background: rgb(20 17 13 / 0.78);
		color: #f1ebe0;
		pointer-events: auto;
	}

	.reset:hover {
		background: rgb(20 17 13 / 0.92);
	}
</style>
