<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { guidePages, guidePath, href } from '$lib/nav';
</script>

<svelte:head>
	<title>Guide · Enchant+</title>
	<meta name="description" content="How to craft, use and set up the Enchant+ table in Minecraft: Bedrock Edition." />
</svelte:head>

<div class="wrap section">
	<p class="eyebrow">Guide</p>
	<h1>Everything about the table</h1>
	<p class="lede">From crafting it to running it on a server. Seven short pages.</p>

	<ol class="cards">
		{#each guidePages as g, i (g.slug)}
			<li>
				<a class="card sq r-22 sq-line" href={href(guidePath(g.slug))}>
					<span class="top">
						<span class="ic sq r-12"><Icon name={g.icon} size={24} /></span>
						<span class="num n">{i + 1}</span>
					</span>
					<strong>{g.title}</strong>
					<span class="muted">{g.blurb}</span>
				</a>
			</li>
		{/each}
	</ol>
</div>

<style>
	.cards {
		list-style: none;
		padding: 0;
		margin: var(--s7) 0 0;
		display: grid;
		gap: var(--s3);
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	}

	.cards li {
		margin: 0;
	}

	.card {
		position: relative;
		display: grid;
		gap: var(--s2);
		height: 100%;
		padding: var(--s5);
		background: var(--panel);
		color: var(--text);
		text-decoration: none;
		transition:
			background-color var(--t-fast) var(--ease),
			transform var(--t-fast) var(--ease);
	}

	.card:hover {
		background: var(--panel-2);
	}

	.card:active {
		transform: scale(0.99);
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--s2);
	}

	.ic {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		background: var(--panel-3);
		color: var(--gold);
	}

	.n {
		font-family: var(--font-display);
		font-size: 1.5rem;
		color: var(--line-2);
	}

	strong {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: var(--fs-lg);
	}
</style>
