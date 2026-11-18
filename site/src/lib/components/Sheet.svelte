<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		open: boolean;
		title: string;
		children: Snippet;
	}

	let { open = $bindable(false), title, children }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let panel: HTMLDivElement | undefined = $state();
	let closing = $state(false);
	let dragY = $state(0);
	let dragging = $state(false);
	let startY = 0;
	let lastY = 0;
	let lastT = 0;
	let velocity = 0;
	const titleId = `sheet-${Math.random().toString(36).slice(2, 8)}`;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			closing = false;
			dialog.showModal();
			document.documentElement.style.overflow = 'hidden';
		} else if (!open && dialog.open && !closing) {
			finishClose();
		}
	});

	function finishClose() {
		if (!dialog) return;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		closing = true;
		const done = () => {
			dialog?.close();
			closing = false;
			dragY = 0;
			document.documentElement.style.overflow = '';
		};
		if (reduce) done();
		else setTimeout(done, 200);
	}

	function down(event: PointerEvent) {
		if (event.button !== 0) return;
		if ((event.target as HTMLElement).closest('button')) return;
		dragging = true;
		startY = lastY = event.clientY;
		lastT = event.timeStamp;
		velocity = 0;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent) {
		if (!dragging) return;
		const dt = Math.max(1, event.timeStamp - lastT);
		velocity = (event.clientY - lastY) / dt;
		lastY = event.clientY;
		lastT = event.timeStamp;
		const dy = event.clientY - startY;
		// resist dragging upwards
		dragY = dy > 0 ? dy : dy / 6;
	}

	function up() {
		if (!dragging) return;
		dragging = false;
		const height = panel?.offsetHeight ?? 400;
		if (dragY > height * 0.28 || velocity > 0.55) {
			open = false;
		} else {
			dragY = 0;
		}
	}
</script>

<dialog
	bind:this={dialog}
	class="sheet"
	class:closing
	aria-labelledby={titleId}
	onclose={() => {
		open = false;
		document.documentElement.style.overflow = '';
	}}
	onclick={(event) => {
		if (event.target === dialog) open = false;
	}}
>
	<div
		class="panel sq r-28 sq-b"
		class:dragging
		bind:this={panel}
		style:transform={dragY ? `translateY(${dragY}px)` : undefined}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions (drag to close is a touch extra; Esc and the Close button do the same) -->
		<div class="grab" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
			<span class="handle sq r-12" aria-hidden="true"></span>
			<div class="head">
				<h2 id={titleId}>{title}</h2>
				<button type="button" class="x sq r-12" aria-label="Close" onclick={() => (open = false)}>
					<Icon name="close" size={24} />
				</button>
			</div>
		</div>
		<div class="content">
			{@render children()}
		</div>
	</div>
</dialog>

<style>
	.sheet {
		position: fixed;
		inset: 0;
		width: 100%;
		max-width: none;
		height: 100%;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text);
		display: none;
		align-items: flex-end;
		justify-content: center;
		overscroll-behavior: contain;
	}

	.sheet[open] {
		display: flex;
	}

	.sheet::backdrop {
		background: var(--overlay);
		animation: fade-in var(--t) var(--ease);
	}

	.sheet.closing::backdrop {
		opacity: 0;
		transition: opacity 200ms var(--ease);
	}

	.panel {
		--b: var(--line-2);
		position: relative;
		width: 100%;
		max-width: 560px;
		max-height: min(86dvh, 760px);
		display: flex;
		flex-direction: column;
		background: var(--panel);
		box-shadow: inset 0 0 0 1px var(--line-2);
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		padding-bottom: var(--safe-bottom);
		animation: slide-up 260ms var(--ease);
		transition: transform 220ms var(--ease);
		touch-action: pan-y;
	}

	.panel.dragging {
		transition: none;
	}

	.closing .panel {
		transform: translateY(105%) !important;
		transition: transform 200ms var(--ease);
	}

	@media (min-width: 900px) {
		.sheet {
			align-items: center;
		}
		.panel {
			border-bottom-left-radius: var(--r);
			border-bottom-right-radius: var(--r);
			padding-bottom: 0;
			animation-name: pop-in;
		}
		.closing .panel {
			transform: scale(0.97) !important;
			opacity: 0;
			transition:
				transform 180ms var(--ease),
				opacity 180ms var(--ease);
		}
		.handle {
			display: none;
		}
	}

	.grab {
		padding: var(--s2) var(--s3) 0 var(--s5);
		cursor: grab;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.handle {
		display: block;
		width: 44px;
		height: 5px;
		margin: 2px auto var(--s2);
		background: var(--line-2);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
		padding-bottom: var(--s2);
	}

	.head h2 {
		margin: 0;
		font-size: var(--fs-lg);
	}

	.x {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		background: var(--panel-2);
		color: var(--text);
	}

	.x:hover {
		background: var(--panel-3);
	}

	.content {
		overflow-y: auto;
		padding: var(--s2) var(--s5) var(--s6);
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}

	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
	}

	@keyframes pop-in {
		from {
			transform: scale(0.97);
			opacity: 0;
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}
</style>
