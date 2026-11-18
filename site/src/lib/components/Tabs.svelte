<script lang="ts" generics="T extends string">
	import { onMount, type Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';
	import { tick } from '$lib/state/haptics';

	interface Tab {
		id: T;
		label: string;
		icon?: IconName;
	}

	interface Props {
		tabs: Tab[];
		selected: T;
		label: string;
		panel: Snippet<[T]>;
	}

	let { tabs, selected = $bindable(), label, panel }: Props = $props();
	let scroller: HTMLDivElement | undefined = $state();
	let panels: HTMLElement[] = $state([]);
	let tabButtons: HTMLButtonElement[] = $state([]);
	let height = $state<number | undefined>(undefined);
	let scrollTimer: ReturnType<typeof setTimeout> | undefined;
	let programmatic = false;

	const index = $derived(Math.max(0, tabs.findIndex((t) => t.id === selected)));

	function measure() {
		const el = panels[index];
		if (el) height = el.offsetHeight;
	}

	function scrollToPanel(i: number, smooth: boolean) {
		const el = panels[i];
		if (!scroller || !el) return;
		programmatic = true;
		scroller.scrollTo({ left: el.offsetLeft, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
		setTimeout(() => (programmatic = false), 450);
	}

	function select(i: number) {
		const t = tabs[i];
		if (!t) return;
		selected = t.id;
		scrollToPanel(i, true);
		tick();
	}

	// swiping the panels selects the tab that ends up in view
	function onscroll() {
		if (programmatic || !scroller) return;
		clearTimeout(scrollTimer);
		scrollTimer = setTimeout(() => {
			if (!scroller) return;
			const i = Math.round(scroller.scrollLeft / scroller.clientWidth);
			const t = tabs[Math.max(0, Math.min(tabs.length - 1, i))];
			if (t && t.id !== selected) {
				selected = t.id;
				tick();
				tabButtons[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
			}
		}, 90);
	}

	function onkeydown(event: KeyboardEvent) {
		let i = index;
		if (event.key === 'ArrowRight') i = (index + 1) % tabs.length;
		else if (event.key === 'ArrowLeft') i = (index - 1 + tabs.length) % tabs.length;
		else if (event.key === 'Home') i = 0;
		else if (event.key === 'End') i = tabs.length - 1;
		else return;
		event.preventDefault();
		select(i);
		tabButtons[i]?.focus();
	}

	$effect(() => {
		void index;
		measure();
	});

	$effect(() => {
		const ro = new ResizeObserver(measure);
		for (const p of panels) if (p) ro.observe(p);
		return () => ro.disconnect();
	});

	onMount(() => {
		// start on the selected tab without animation
		requestAnimationFrame(() => scrollToPanel(index, false));
	});
</script>

<div class="tabs">
	<div class="list" role="tablist" aria-label={label} tabindex="-1" {onkeydown}>
		{#each tabs as t, i (t.id)}
			<button
				type="button"
				role="tab"
				class="tab sq r-12 sq-b"
				id="tab-{t.id}"
				aria-selected={t.id === selected}
				aria-controls="panel-{t.id}"
				tabindex={t.id === selected ? 0 : -1}
				bind:this={tabButtons[i]}
				onclick={() => select(i)}
			>
				{#if t.icon}<Icon name={t.icon} size={20} />{/if}
				<span>{t.label}</span>
			</button>
		{/each}
	</div>
	<div class="panels" bind:this={scroller} {onscroll} style:height={height ? `${height}px` : undefined}>
		{#each tabs as t, i (t.id)}
			<div
				class="panel"
				role="tabpanel"
				id="panel-{t.id}"
				aria-labelledby="tab-{t.id}"
				tabindex="0"
				bind:this={panels[i]}
				inert={t.id !== selected}
			>
				{@render panel(t.id)}
			</div>
		{/each}
	</div>
</div>

<style>
	.list {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		padding: 2px 2px var(--s3);
		margin: 0 -2px;
		scroll-snap-type: x proximity;
	}

	.list::-webkit-scrollbar {
		display: none;
	}

	.tab {
		--b: var(--line);
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 42px;
		padding: 0 14px;
		border: 0;
		background: var(--panel-2);
		color: var(--text-2);
		font-family: var(--font-ui);
		font-weight: 600;
		font-size: 0.9375rem;
		white-space: nowrap;
		scroll-snap-align: start;
		box-shadow: inset 0 0 0 1px var(--line);
		touch-action: manipulation;
		transition:
			background-color var(--t-fast) var(--ease),
			color var(--t-fast) var(--ease);
	}

	.tab:hover {
		color: var(--text);
	}

	.tab[aria-selected='true'] {
		--b: transparent;
		background: var(--text);
		color: var(--bg);
		box-shadow: none;
	}

	.panels {
		display: flex;
		align-items: flex-start;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		overscroll-behavior-x: contain;
		transition: height var(--t) var(--ease);
		-webkit-overflow-scrolling: touch;
	}

	.panels::-webkit-scrollbar {
		display: none;
	}

	.panel {
		flex: 0 0 100%;
		min-width: 0;
		scroll-snap-align: start;
		scroll-snap-stop: always;
		padding-top: var(--s2);
	}

	.panel:focus-visible {
		outline-offset: -2px;
	}
</style>
