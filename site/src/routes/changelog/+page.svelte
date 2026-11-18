<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { addon } from '$lib/addon';
	import { releases } from '$lib/data/changelog';
	import { href } from '$lib/nav';
</script>

<svelte:head>
	<title>Changelog · Enchant+</title>
	<meta name="description" content="What changed in each Enchant+ version." />
</svelte:head>

<div class="wrap section">
	<p class="eyebrow">Changelog</p>
	<h1>What changed</h1>
	<p class="lede">Newest first. This page is built from CHANGELOG.md in the repository.</p>

	<ol class="timeline">
		{#each releases as r, i (r.version)}
			<li class="rel" id="v{r.version.replace(/\./g, '')}">
				<div class="mark" aria-hidden="true"><span class="dot sq r-12" class:current={i === 0}></span></div>
				<article class="card sq r-22 sq-line">
					<header class="head">
						<h2>{r.version}</h2>
						{#if r.version === addon.version}<span class="badge sq r-12">Current</span>{/if}
					</header>
					{#if Object.keys(r.facts).length}
						<dl class="facts small">
							{#each Object.entries(r.facts) as [k, v] (k)}
								<div><dt>{k}</dt><dd>{v}</dd></div>
							{/each}
						</dl>
					{/if}
					{#each r.groups as g, gi (gi)}
						{#if g.title}<h3>{g.title}</h3>{/if}
						<ul>
							{#each g.items as item, ii (ii)}
								<li>{@html item}</li>
							{/each}
						</ul>
					{/each}
					{#if r.version === addon.version}
						<a class="get" href={href('/download/')}><Icon name="download" size={20} /> Download {r.version}</a>
					{/if}
				</article>
			</li>
		{/each}
	</ol>
</div>

<style>
	.timeline {
		list-style: none;
		padding: 0;
		margin: var(--s7) 0 0;
		max-width: 820px;
	}

	.rel {
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr);
		gap: var(--s3);
		margin: 0 0 var(--s5);
	}

	@media (min-width: 700px) {
		.rel {
			grid-template-columns: 40px minmax(0, 1fr);
			gap: var(--s4);
		}
	}

	.mark {
		position: relative;
		display: flex;
		justify-content: center;
	}

	.mark::before {
		content: '';
		position: absolute;
		top: 30px;
		bottom: calc(-1 * var(--s5));
		width: 2px;
		background: var(--line);
	}

	.rel:last-child .mark::before {
		display: none;
	}

	.dot {
		position: relative;
		margin-top: 18px;
		width: 18px;
		height: 18px;
		background: var(--panel-3);
		box-shadow: inset 0 0 0 2px var(--line-2);
	}

	.dot.current {
		background: var(--gold);
		box-shadow: none;
	}

	.card {
		position: relative;
		padding: var(--s5);
		background: var(--panel);
		min-width: 0;
	}

	.head {
		display: flex;
		align-items: center;
		gap: var(--s3);
		margin-bottom: var(--s3);
	}

	.head h2 {
		margin: 0;
	}

	.badge {
		padding: 3px 10px;
		background: color-mix(in srgb, var(--accent) 20%, transparent);
		color: var(--accent-ink);
		font-family: var(--font-ui);
		font-size: var(--fs-sm);
		font-weight: 700;
	}

	.facts {
		display: grid;
		gap: 4px;
		margin: 0 0 var(--s4);
	}

	.facts div {
		display: flex;
		gap: var(--s2);
	}

	dt {
		color: var(--text-3);
	}

	dt::after {
		content: ':';
	}

	dd {
		margin: 0;
	}

	h3 {
		font-size: var(--fs-md);
		color: var(--gold);
		margin: var(--s5) 0 var(--s2);
	}

	.card ul {
		margin-bottom: 0;
	}

	.card li {
		color: var(--text-2);
	}

	.card li :global(strong) {
		color: var(--text);
	}

	.get {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: var(--s5);
		font-family: var(--font-display);
		font-weight: 600;
	}
</style>
