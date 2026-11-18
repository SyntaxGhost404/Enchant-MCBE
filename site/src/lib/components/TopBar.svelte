<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { images } from '$lib/addon/assets';
	import { addon } from '$lib/addon';
	import { href, isActive, local, REPO_URL, topNav } from '$lib/nav';

	let scrolled = $state(false);
	const current = $derived(local(page.url.pathname));

	$effect(() => {
		const onscroll = () => (scrolled = window.scrollY > 4);
		onscroll();
		window.addEventListener('scroll', onscroll, { passive: true });
		return () => window.removeEventListener('scroll', onscroll);
	});
</script>

<header class="topbar" class:scrolled>
	<div class="inner wrap">
		<a class="brand" href={href('/')}>
			<img src={images.tableRender} alt="" width="34" height="34" />
			<span class="name">Enchant+</span>
			<span class="ver sq r-12 sq-b">{addon.version}</span>
		</a>
		<nav class="links" aria-label="Main">
			{#each topNav as item (item.path)}
				<a class="link sq r-12" href={href(item.path)} aria-current={isActive(current, item.path) ? 'page' : undefined}>{item.label}</a>
			{/each}
		</nav>
		<div class="tools">
			<ThemeToggle />
			<a class="icon-link sq r-12" href={REPO_URL} target="_blank" rel="noopener" aria-label="Source code on GitHub" title="Source code on GitHub">
				<Icon name="github" size={24} />
			</a>
		</div>
	</div>
</header>

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 50;
		height: var(--topbar);
		background: var(--bg);
		border-bottom: 1px solid transparent;
		transition: border-color var(--t) var(--ease);
	}

	.topbar.scrolled {
		border-bottom-color: var(--line);
	}

	.inner {
		display: flex;
		align-items: center;
		gap: var(--s4);
		height: 100%;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--text);
		text-decoration: none;
		margin-right: auto;
		min-height: 44px;
	}

	.brand img {
		display: block;
	}

	.name {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.25rem;
		letter-spacing: 0.01em;
	}

	.ver {
		--b: var(--line);
		position: relative;
		font-family: var(--font-ui);
		font-size: 0.75rem;
		padding: 2px 8px;
		background: var(--panel-2);
		color: var(--text-2);
		box-shadow: inset 0 0 0 1px var(--line);
		font-weight: 600;
	}

	.links {
		display: none;
		gap: 2px;
	}

	@media (min-width: 960px) {
		.links {
			display: flex;
		}
	}

	.link {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 12px;
		color: var(--text-2);
		text-decoration: none;
		font-family: var(--font-ui);
		font-weight: 600;
		font-size: 0.9375rem;
		transition:
			background-color var(--t-fast) var(--ease),
			color var(--t-fast) var(--ease);
	}

	.link:hover {
		color: var(--text);
		background: var(--panel-2);
	}

	.link[aria-current='page'] {
		color: var(--text);
		background: var(--panel-2);
		box-shadow: inset 0 -2px 0 var(--gold);
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.icon-link {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		color: var(--text-2);
		transition: background-color var(--t-fast) var(--ease);
	}

	.icon-link:hover {
		background: var(--panel-2);
		color: var(--text);
	}
</style>
