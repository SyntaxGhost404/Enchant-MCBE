<script lang="ts">
	// "How it works": swipe through the three screens on phones, side by side on wide screens.
	import { images } from '$lib/addon/assets';

	const steps = [
		{ n: 1, title: 'Pick an item', text: 'Every enchantable item in your inventory, with a search box.', img: images.menus.select, w: 1314, h: 750, alt: 'Select Item menu' },
		{ n: 2, title: 'Set the levels', text: 'One slider for each enchantment the item can take.', img: images.menus.enchant, w: 732, h: 750, alt: 'Add Enchant menu with sliders' },
		{ n: 3, title: 'Check the price', text: 'The recap shows the total. Nothing is taken until you confirm.', img: images.menus.recap, w: 1314, h: 750, alt: 'Menu Recap with the total cost' }
	];

	let track: HTMLOListElement | undefined = $state();
	let active = $state(0);

	function onscroll() {
		if (!track) return;
		const card = track.firstElementChild as HTMLElement | null;
		if (!card) return;
		active = Math.max(0, Math.min(steps.length - 1, Math.round(track.scrollLeft / (card.offsetWidth + 12))));
	}

	function go(i: number) {
		const card = track?.children[i] as HTMLElement | undefined;
		if (!track || !card) return;
		track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (the carousel scrolls sideways and must be reachable by keyboard) -->
<ol class="steps" bind:this={track} {onscroll} data-no-swipe tabindex="0" aria-label="How it works, step by step">
	{#each steps as s (s.n)}
		<li class="step sq r-22 sq-line">
			<div class="shot">
				<img src={s.img} alt={s.alt} width={s.w} height={s.h} loading="lazy" decoding="async" />
			</div>
			<div class="txt">
				<span class="n num">{s.n}</span>
				<div>
					<h3>{s.title}</h3>
					<p class="muted">{s.text}</p>
				</div>
			</div>
		</li>
	{/each}
</ol>
<div class="dots" role="tablist" aria-label="Steps">
	{#each steps as s, i (s.n)}
		<button type="button" role="tab" class="dot" class:on={i === active} aria-selected={i === active} aria-label="Step {s.n}: {s.title}" onclick={() => go(i)}></button>
	{/each}
</div>

<style>
	.steps {
		list-style: none;
		margin: 0 calc(-1 * var(--s4));
		padding: 0 var(--s4);
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 86%;
		gap: 12px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-padding: 0 var(--s4);
		scrollbar-width: none;
		overscroll-behavior-x: contain;
	}

	.steps::-webkit-scrollbar {
		display: none;
	}

	@media (min-width: 900px) {
		.steps {
			margin: 0;
			padding: 0;
			grid-auto-flow: row;
			grid-template-columns: repeat(3, 1fr);
			overflow: visible;
		}
		.dots {
			display: none !important;
		}
	}

	.step {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr;
		align-content: start;
		margin: 0;
		background: var(--panel);
		overflow: hidden;
		scroll-snap-align: start;
	}

	.shot {
		position: relative;
		aspect-ratio: 16 / 10;
		min-height: 0;
		overflow: hidden;
		background: #15110d;
		border-bottom: 1px solid var(--line);
	}

	.shot img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.txt {
		display: flex;
		gap: var(--s3);
		padding: var(--s4) var(--s5) var(--s5);
	}

	.n {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		flex: none;
		background: var(--gold);
		color: #2a2108;
		font-family: var(--font-ui);
		font-weight: 800;
		border-radius: 10px;
		corner-shape: squircle;
	}

	h3 {
		margin: 4px 0 4px;
		font-size: var(--fs-md);
	}

	.txt p {
		margin: 0;
	}

	.dots {
		display: flex;
		justify-content: center;
		gap: 6px;
		margin-top: var(--s4);
	}

	.dot {
		width: 22px;
		height: 6px;
		padding: 0;
		border: 0;
		background: var(--line-2);
		border-radius: 2px;
		transition:
			width var(--t) var(--ease),
			background-color var(--t) var(--ease);
		position: relative;
	}

	/* a bigger touch target than the bar itself */
	.dot::after {
		content: '';
		position: absolute;
		inset: -14px -4px;
	}

	.dot.on {
		width: 40px;
		background: var(--gold);
	}
</style>
