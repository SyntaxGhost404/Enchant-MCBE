<script lang="ts">
	// A picture that opens full screen: pinch or double tap to zoom, drag to pan, swipe down to close.
	import Icon from './Icon.svelte';

	interface Props {
		src: string;
		alt: string;
		width: number;
		height: number;
		caption?: string;
	}

	let { src, alt, width, height, caption }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let stage: HTMLDivElement | undefined = $state();
	let scale = $state(1);
	let tx = $state(0);
	let ty = $state(0);
	let dismissY = $state(0);
	let animate = $state(true);

	const pointers = new Map<number, { x: number; y: number }>();
	let pinch: { dist: number; scale: number; mid: { x: number; y: number }; tx: number; ty: number } | null = null;
	let drag: { x: number; y: number; tx: number; ty: number } | null = null;
	let lastTap = 0;

	function open() {
		scale = 1;
		tx = ty = dismissY = 0;
		dialog?.showModal();
		document.documentElement.style.overflow = 'hidden';
	}

	function close() {
		dialog?.close();
	}

	function clamp() {
		if (!stage) return;
		const maxX = (stage.clientWidth * (scale - 1)) / 2;
		const maxY = (stage.clientHeight * (scale - 1)) / 2;
		tx = Math.max(-maxX, Math.min(maxX, tx));
		ty = Math.max(-maxY, Math.min(maxY, ty));
	}

	function zoomAt(next: number, x: number, y: number) {
		if (!stage) return;
		const r = stage.getBoundingClientRect();
		const cx = x - r.left - r.width / 2;
		const cy = y - r.top - r.height / 2;
		const k = next / scale;
		tx = cx - (cx - tx) * k;
		ty = cy - (cy - ty) * k;
		scale = next;
		if (scale <= 1.01) {
			scale = 1;
			tx = ty = 0;
		}
		clamp();
	}

	function down(event: PointerEvent) {
		stage?.setPointerCapture(event.pointerId);
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		animate = false;
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, tx, ty };
			drag = null;
		} else if (pointers.size === 1) {
			drag = { x: event.clientX, y: event.clientY, tx, ty };
		}
	}

	function move(event: PointerEvent) {
		if (!pointers.has(event.pointerId)) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pinch && pointers.size >= 2) {
			const [a, b] = [...pointers.values()];
			const dist = Math.hypot(a.x - b.x, a.y - b.y);
			const next = Math.max(1, Math.min(4, (pinch.scale * dist) / pinch.dist));
			scale = pinch.scale;
			tx = pinch.tx;
			ty = pinch.ty;
			zoomAt(next, pinch.mid.x, pinch.mid.y);
		} else if (drag) {
			const dx = event.clientX - drag.x;
			const dy = event.clientY - drag.y;
			if (scale > 1) {
				tx = drag.tx + dx;
				ty = drag.ty + dy;
				clamp();
			} else {
				dismissY = Math.max(0, dy);
			}
		}
	}

	function up(event: PointerEvent) {
		pointers.delete(event.pointerId);
		animate = true;
		if (pointers.size < 2) pinch = null;
		if (pointers.size === 0) {
			if (dismissY > 110) {
				close();
				return;
			}
			dismissY = 0;
			const moved = drag && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8;
			drag = null;
			if (!moved) {
				const now = event.timeStamp;
				if (now - lastTap < 300) {
					zoomAt(scale > 1 ? 1 : 2.5, event.clientX, event.clientY);
					lastTap = 0;
				} else {
					lastTap = now;
				}
			}
		}
	}

	function wheel(event: WheelEvent) {
		event.preventDefault();
		animate = false;
		zoomAt(Math.max(1, Math.min(4, scale * Math.exp(-event.deltaY * 0.002))), event.clientX, event.clientY);
	}
</script>

<figure class="zoom">
	<button type="button" class="thumb sq r-16" onclick={open} aria-label="Open larger: {alt}">
		<img {src} {alt} {width} {height} loading="lazy" decoding="async" />
		<span class="hint sq r-12" aria-hidden="true"><Icon name="expand" size={20} /></span>
	</button>
	{#if caption}<figcaption class="small muted">{caption}</figcaption>{/if}
</figure>

<dialog
	bind:this={dialog}
	class="viewer"
	aria-label={alt}
	onclose={() => (document.documentElement.style.overflow = '')}
	style="--dismiss: {dismissY}px"
>
	<div
		class="stage"
		bind:this={stage}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onwheel={wheel}
		role="presentation"
	>
		<img
			{src}
			{alt}
			{width}
			{height}
			class:animate
			style="transform: translate({tx}px, {ty + dismissY}px) scale({scale}); opacity: {1 - Math.min(dismissY / 400, 0.5)}"
			draggable="false"
		/>
	</div>
	<div class="bar">
		<span class="small">Pinch or double tap to zoom</span>
		<button type="button" class="x sq r-12" onclick={close} aria-label="Close">
			<Icon name="close" size={24} />
		</button>
	</div>
</dialog>

<style>
	.zoom {
		margin: 0 0 var(--s5);
	}

	.thumb {
		position: relative;
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: var(--panel-2);
		cursor: zoom-in;
		overflow: hidden;
	}

	.thumb img {
		display: block;
		width: 100%;
		height: auto;
		transition: transform 300ms var(--ease);
	}

	.thumb:hover img {
		transform: scale(1.012);
	}

	.hint {
		position: absolute;
		right: 10px;
		bottom: 10px;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		background: rgb(20 18 16 / 0.82);
		color: #f1ebe0;
	}

	figcaption {
		margin-top: var(--s2);
	}

	.viewer {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: rgb(10 9 8 / calc(0.94 - var(--dismiss) / 900));
		color: #f1ebe0;
	}

	.viewer[open] {
		display: flex;
		flex-direction: column;
	}

	.viewer::backdrop {
		background: transparent;
	}

	.stage {
		flex: 1;
		display: grid;
		place-items: center;
		overflow: hidden;
		touch-action: none;
		cursor: grab;
	}

	.stage img {
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		user-select: none;
		-webkit-user-select: none;
		will-change: transform;
	}

	.stage img.animate {
		transition:
			transform 220ms var(--ease),
			opacity 220ms var(--ease);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
		padding: var(--s3) var(--s4) calc(var(--s3) + var(--safe-bottom));
		color: #c4bbac;
	}

	.x {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		background: #2f2b27;
		color: #f1ebe0;
	}
</style>
