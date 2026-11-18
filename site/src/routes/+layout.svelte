<script lang="ts">
	import '@fontsource/pixelify-sans/500.css';
	import '@fontsource/pixelify-sans/600.css';
	import '@fontsource/pixelify-sans/700.css';
	import '@fontsource-variable/atkinson-hyperlegible-next';
	import '@fontsource-variable/jetbrains-mono';
	import '$lib/styles/app.css';
	import { onMount, type Snippet } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import TopBar from '$lib/components/TopBar.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import { theme } from '$lib/state/theme.svelte';
	import { guidePages, local } from '$lib/nav';

	let { children }: { children: Snippet } = $props();

	onMount(() => theme.init());

	function guideIndex(pathname: string): number {
		const m = local(pathname).match(/^\/guide\/([a-z]+)\/$/);
		return m ? guidePages.findIndex((g) => g.slug === m[1]) : -1;
	}

	// page changes cross-fade; moving through the guide slides in reading direction
	onNavigate((navigation) => {
		if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (!navigation.to || navigation.from?.url.pathname === navigation.to.url.pathname) return;
		const from = guideIndex(navigation.from?.url.pathname ?? '');
		const to = guideIndex(navigation.to.url.pathname);
		const root = document.documentElement;
		root.dataset.nav = from >= 0 && to >= 0 && from !== to ? (to > from ? 'forward' : 'back') : '';
		return new Promise((resolve) => {
			const transition = document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
			transition.finished.finally(() => delete root.dataset.nav);
		});
	});
</script>

<a class="skip sq r-12" href="#main">Skip to content</a>
<TopBar />
<main id="main" tabindex="-1">
	{@render children()}
</main>
<Footer />
<TabBar />
<Toaster />

<style>
	.skip {
		position: fixed;
		left: var(--s3);
		top: -100px;
		z-index: 100;
		padding: var(--s3) var(--s4);
		background: var(--text);
		color: var(--bg);
		font-family: var(--font-display);
		text-decoration: none;
	}

	.skip:focus {
		top: var(--s3);
	}

	main {
		display: block;
		min-height: 60vh;
		outline: none;
	}
</style>
