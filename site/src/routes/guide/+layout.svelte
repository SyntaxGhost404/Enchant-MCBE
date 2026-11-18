<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick as nextTick } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import XpBar from '$lib/components/XpBar.svelte';
	import { swipe } from '$lib/actions/swipe';
	import { guidePages, guidePath, href, local } from '$lib/nav';
	import { tick } from '$lib/state/haptics';

	let { children }: { children: Snippet } = $props();

	const current = $derived(local(page.url.pathname));
	const index = $derived(guidePages.findIndex((g) => current === guidePath(g.slug)));
	const prev = $derived(index > 0 ? guidePages[index - 1] : null);
	const next = $derived(index >= 0 && index < guidePages.length - 1 ? guidePages[index + 1] : null);

	let navOpen = $state(false);
	let progress = $state(0);
	let dragX = $state(0);
	let article: HTMLElement | undefined = $state();
	let toc = $state<{ id: string; text: string }[]>([]);
	let activeId = $state('');

	// headings for "On this page", refreshed on every page change
	$effect(() => {
		void current;
		let observer: IntersectionObserver | undefined;
		nextTick().then(() => {
			if (!article) return;
			const heads = [...article.querySelectorAll<HTMLHeadingElement>('h2[id]')];
			toc = heads.map((h) => ({ id: h.id, text: h.textContent?.trim() ?? '' }));
			activeId = toc[0]?.id ?? '';
			observer = new IntersectionObserver(
				(entries) => {
					const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
					if (visible[0]) activeId = visible[0].target.id;
				},
				{ rootMargin: '-80px 0px -65% 0px' }
			);
			heads.forEach((h) => observer?.observe(h));
		});
		return () => observer?.disconnect();
	});

	// reading progress
	$effect(() => {
		void current;
		const update = () => {
			if (!article) return;
			const r = article.getBoundingClientRect();
			const total = r.height - window.innerHeight * 0.6;
			progress = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
		};
		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	});

	function go(target: { slug: string } | null) {
		if (!target) return;
		tick(8);
		goto(href(guidePath(target.slug)));
	}
</script>

{#if index >= 0}
	<div class="guide wrap">
		<aside class="side" aria-label="Guide">
			<p class="side-title">Guide</p>
			<ol>
				{#each guidePages as g, i (g.slug)}
					<li>
						<a href={href(guidePath(g.slug))} class="sq r-12" aria-current={i === index ? 'page' : undefined}>
							<span class="n num">{i + 1}</span>
							<span>{g.title}</span>
						</a>
					</li>
				{/each}
			</ol>
		</aside>

		<div class="main">
			<div class="sub">
				<button type="button" class="pages sq r-12" onclick={() => (navOpen = true)} aria-haspopup="dialog">
					<Icon name="list" size={20} />
					<span>Guide</span>
					<span class="count num">{index + 1} of {guidePages.length}</span>
				</button>
				<div class="bar"><XpBar {progress} /></div>
			</div>

			<article
				class="article"
				bind:this={article}
				class:dragging={dragX !== 0}
				style:transform={dragX ? `translateX(${dragX}px)` : undefined}
				use:swipe={{
					onswipe: (dir) => go(dir === 'left' ? next : prev),
					ondrag: (dx) => {
						const allowed = (dx < 0 && next) || (dx > 0 && prev);
						dragX = allowed ? Math.max(-56, Math.min(56, dx * 0.3)) : 0;
					}
				}}
			>
				{@render children()}
			</article>

			<nav class="pager" aria-label="Previous and next page">
				{#if prev}
					<a class="pg prev sq r-16 sq-line" href={href(guidePath(prev.slug))}>
						<Icon name="chevron-left" size={24} />
						<span><small>Previous</small>{prev.title}</span>
					</a>
				{:else}
					<span></span>
				{/if}
				{#if next}
					<a class="pg next sq r-16 sq-line" href={href(guidePath(next.slug))}>
						<span><small>Next</small>{next.title}</span>
						<Icon name="chevron-right" size={24} />
					</a>
				{/if}
			</nav>
			<p class="swipe-hint small muted">Swipe sideways to turn the page.</p>
		</div>

		{#if toc.length > 1}
			<aside class="toc" aria-label="On this page">
				<p class="side-title">On this page</p>
				<ul>
					{#each toc as h (h.id)}
						<li><a href="#{h.id}" class:active={h.id === activeId}>{h.text}</a></li>
					{/each}
				</ul>
			</aside>
		{/if}
	</div>

	<Sheet bind:open={navOpen} title="Guide">
		<ol class="sheet-list">
			{#each guidePages as g, i (g.slug)}
				<li>
					<a href={href(guidePath(g.slug))} class="sq r-16 sq-b" class:b2={i === index} aria-current={i === index ? 'page' : undefined} onclick={() => (navOpen = false)}>
						<span class="ic"><Icon name={g.icon} size={24} /></span>
						<span class="txt"><strong>{g.title}</strong><span class="small muted">{g.blurb}</span></span>
					</a>
				</li>
			{/each}
		</ol>
	</Sheet>
{:else}
	{@render children()}
{/if}

<style>
	.guide {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--s7);
		padding-top: var(--s4);
	}

	@media (min-width: 960px) {
		.guide {
			grid-template-columns: 230px minmax(0, 1fr);
			padding-top: var(--s7);
		}
	}

	@media (min-width: 1240px) {
		.guide {
			grid-template-columns: 230px minmax(0, var(--reading)) 1fr;
		}
	}

	.side,
	.toc {
		display: none;
	}

	@media (min-width: 960px) {
		.side {
			display: block;
			position: sticky;
			top: calc(var(--topbar) + var(--s6));
			align-self: start;
		}
	}

	@media (min-width: 1240px) {
		.toc {
			display: block;
			position: sticky;
			top: calc(var(--topbar) + var(--s6));
			align-self: start;
			max-width: 240px;
		}
	}

	.side-title {
		font-family: var(--font-ui);
		font-size: var(--fs-sm);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-3);
		margin-bottom: var(--s2);
		font-weight: 700;
	}

	.side ol,
	.toc ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.side li,
	.toc li {
		margin: 0;
	}

	.side a {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 40px;
		padding: 0 10px;
		color: var(--text-2);
		text-decoration: none;
		font-family: var(--font-ui);
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.side a:hover {
		background: var(--panel-2);
		color: var(--text);
	}

	.side a[aria-current='page'] {
		background: var(--panel-2);
		color: var(--text);
		box-shadow: inset 2px 0 0 var(--gold);
	}

	.n {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		font-size: 0.8125rem;
		color: var(--text-3);
		background: var(--panel-3);
		border-radius: 6px;
		corner-shape: squircle;
	}

	.side a[aria-current='page'] .n {
		background: var(--gold);
		color: #2a2108;
	}

	.toc a {
		display: block;
		padding: 5px 0 5px 12px;
		border-left: 2px solid var(--line);
		color: var(--text-3);
		text-decoration: none;
		font-size: var(--fs-sm);
		line-height: 1.35;
	}

	.toc a:hover {
		color: var(--text);
	}

	.toc a.active {
		color: var(--text);
		border-left-color: var(--gold);
	}

	.main {
		min-width: 0;
	}

	.sub {
		position: sticky;
		top: var(--topbar);
		z-index: 30;
		display: flex;
		align-items: center;
		gap: var(--s3);
		margin: 0 calc(-1 * var(--s4)) var(--s5);
		padding: var(--s2) var(--s4);
		background: var(--bg);
		border-bottom: 1px solid var(--line);
	}

	@media (min-width: 960px) {
		.sub {
			margin: 0 0 var(--s6);
			padding: var(--s2) 0;
			border-bottom: 0;
		}
		.pages {
			display: none !important;
			font-family: var(--font-ui);
			font-weight: 600;
		}
	}

	.pages {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 0 12px;
		border: 0;
		background: var(--panel-2);
		color: var(--text);
		font-family: var(--font-display);
		font-weight: 500;
		font-size: 0.9375rem;
		flex: none;
	}

	.count {
		color: var(--text-3);
		font-size: 0.8125rem;
	}

	.bar {
		flex: 1;
		min-width: 0;
	}

	.article {
		touch-action: pan-y pinch-zoom;
		transition: transform 260ms var(--ease-spring);
	}

	.article.dragging {
		transition: none;
	}

	.article > :global(h2) {
		margin-top: var(--s8);
		scroll-margin-top: calc(var(--topbar) + 64px);
	}

	.article > :global(h2:first-of-type) {
		margin-top: var(--s7);
	}

	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--s3);
		margin-top: var(--s9);
	}

	.pg {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--s2);
		min-height: 72px;
		padding: var(--s3) var(--s4);
		background: var(--panel);
		color: var(--text);
		text-decoration: none;
		font-family: var(--font-ui);
		font-weight: 700;
		line-height: 1.25;
		transition: background-color var(--t-fast) var(--ease);
	}

	.pg:hover {
		background: var(--panel-2);
	}

	.pg small {
		display: block;
		font-family: var(--font-body);
		font-weight: 400;
		font-size: var(--fs-xs);
		color: var(--text-3);
	}

	.next {
		justify-content: flex-end;
		text-align: right;
		grid-column: 2;
	}

	.swipe-hint {
		text-align: center;
		margin-top: var(--s4);
	}

	@media (hover: hover) and (pointer: fine) {
		.swipe-hint {
			display: none;
		}
	}

	.sheet-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 6px;
	}

	.sheet-list li {
		margin: 0;
	}

	.sheet-list a {
		--b: transparent;
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--s3);
		padding: var(--s3);
		color: var(--text);
		text-decoration: none;
		background: var(--panel-2);
	}

	.sheet-list a[aria-current='page'] {
		--b: var(--gold);
		box-shadow: inset 0 0 0 2px var(--gold);
	}

	.sheet-list .ic {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		flex: none;
		background: var(--panel-3);
		border-radius: 12px;
		corner-shape: squircle;
		color: var(--gold);
	}

	.sheet-list .txt {
		display: grid;
		gap: 2px;
		line-height: 1.3;
	}

	.sheet-list strong {
		font-family: var(--font-display);
		font-weight: 600;
	}
</style>
