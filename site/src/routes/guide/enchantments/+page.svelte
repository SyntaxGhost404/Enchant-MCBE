<script lang="ts">
	import { onMount, tick as nextTick } from 'svelte';
	import { replaceState } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import { conflicts } from '$lib/addon';
	import { game } from '$lib/addon/assets';
	import { price } from '$lib/addon/pricing';
	import { enchantments, enchantmentById, itemGroups, roman, type GroupId } from '$lib/data/enchantments';
	import { guidePath, href } from '$lib/nav';
	import { tick } from '$lib/state/haptics';

	let group = $state<GroupId | 'all'>('all');
	let query = $state('');
	let flash = $state('');
	let ready = false;

	const groupName = $derived(group === 'all' ? '' : (itemGroups.find((g) => g.id === group)?.name ?? ''));
	const shown = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return enchantments.filter(
			(e) => (group === 'all' || e.groups.includes(group)) && (!q || e.name.toLowerCase().includes(q) || e.effect.toLowerCase().includes(q))
		);
	});

	const topPrice = (max: number) => price('enchant', max);

	onMount(() => {
		const q = new URLSearchParams(window.location.search);
		const item = q.get('item');
		if (item && itemGroups.some((g) => g.id === item)) group = item as GroupId;
		query = q.get('q') ?? '';
		ready = true;
		if (window.location.hash.startsWith('#e-')) jump(window.location.hash.slice(3));
	});

	$effect(() => {
		const q = new URLSearchParams();
		if (group !== 'all') q.set('item', group);
		if (query.trim()) q.set('q', query.trim());
		const search = q.toString() ? `?${q}` : '';
		if (!ready) return;
		if (window.location.search !== search) replaceState(`${window.location.pathname}${search}`, {});
	});

	async function jump(id: string) {
		if (!enchantmentById[id]) return;
		if (!shown.some((e) => e.id === id)) {
			group = 'all';
			query = '';
			await nextTick();
		}
		const el = document.getElementById(`e-${id}`);
		el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
		flash = id;
		tick();
		setTimeout(() => (flash = ''), 1400);
	}
</script>

<svelte:head>
	<title>Enchantments · Enchant+</title>
	<meta name="description" content="Every Minecraft: Bedrock Edition enchantment: top level, the items it goes on, what it clashes with and what it costs in Enchant+." />
</svelte:head>

<p class="eyebrow">Guide · 4</p>
<h1>Enchantments</h1>
<p class="lede">The table offers every enchantment Minecraft allows on your item, up to its top level. Books take them all.</p>

<div class="filters" data-no-swipe>
	<div class="groups" role="radiogroup" aria-label="Item type">
		<button type="button" role="radio" class="g all sq r-12 sq-b" class:b2={group === 'all'} aria-checked={group === 'all'} onclick={() => (group = 'all')}>All</button>
		{#each itemGroups as g (g.id)}
			<button type="button" role="radio" class="g sq r-12 sq-b" class:b2={group === g.id} aria-checked={group === g.id} onclick={() => (group = g.id)} aria-label={g.name} title={g.name}>
				<img src={game(g.icon)} alt="" width="32" height="32" class="pixel" />
			</button>
		{/each}
	</div>
	<label class="search sq r-16 sq-b">
		<Icon name="search" size={20} />
		<span class="visually-hidden">Search enchantments</span>
		<input type="search" placeholder="Search" bind:value={query} autocomplete="off" />
	</label>
	<p class="small muted count" aria-live="polite">
		{shown.length} enchantment{shown.length === 1 ? '' : 's'}{groupName ? ` for ${groupName.toLowerCase()}` : ''}
	</p>
</div>

<ul class="list">
	{#each shown as e (e.id)}
		{@const cost = topPrice(e.max)}
		<li id="e-{e.id}" class="ench sq r-22 sq-line" class:flash={flash === e.id}>
			<div class="head">
				<h2 class="name">{e.name}</h2>
				<span class="lvl sq r-12" title="Top level">{roman(e.max)}</span>
			</div>
			<p class="effect">{e.effect}</p>
			{#if e.curse}<p class="tag curse small">Curse</p>{/if}
			<div class="meta">
				<div class="goes">
					<span class="small muted">Goes on</span>
					<span class="icons">
						{#each itemGroups.filter((g) => e.groups.includes(g.id)) as g (g.id)}
							<img src={game(g.icon)} alt={g.name} title={g.name} width="24" height="24" class="pixel" />
						{/each}
					</span>
				</div>
				{#if conflicts[e.id]?.length}
					<div class="clash">
						<span class="small muted">Can't go with</span>
						<span class="chips">
							{#each conflicts[e.id] as c (c)}
								{#if enchantmentById[c]}
									<a href="#e-{c}" class="chip sq r-12 sq-b" onclick={(ev) => { ev.preventDefault(); jump(c); }}>{enchantmentById[c].name}</a>
								{/if}
							{/each}
						</span>
					</div>
				{/if}
				<p class="price small">
					<span class="muted">{e.name} {roman(e.max)} costs</span>
					<strong class="num">{cost.xp} XP, {cost.essence} essence</strong>
				</p>
			</div>
		</li>
	{:else}
		<li class="empty muted">No enchantment matches. <button type="button" class="linkish" onclick={() => { query = ''; group = 'all'; }}>Show all</button></li>
	{/each}
</ul>

<p class="small muted">
	Prices use the default amounts and Cost scaling. Try other setups in the <a href={href(guidePath('prices'))}>price calculator</a>.
</p>

<style>
	.filters {
		position: sticky;
		top: calc(var(--topbar) + 56px);
		z-index: 10;
		display: grid;
		gap: var(--s3);
		padding: var(--s3) 0;
		margin: var(--s5) 0 var(--s4);
		background: var(--bg);
	}

	@media (min-width: 960px) {
		.filters {
			top: calc(var(--topbar) + 40px);
		}
	}

	.groups {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		padding: 3px;
		margin: -3px;
	}

	.groups::-webkit-scrollbar {
		display: none;
	}

	.g {
		--b: var(--slot-line);
		position: relative;
		display: grid;
		place-items: center;
		min-width: 48px;
		height: 48px;
		flex: none;
		border: 0;
		background: var(--slot);
		box-shadow: inset 0 0 0 1px var(--slot-line);
		touch-action: manipulation;
		transition: transform var(--t-fast) var(--ease);
	}

	.g:active {
		transform: scale(0.94);
	}

	.g.all {
		padding: 0 14px;
		font-family: var(--font-ui);
		font-weight: 700;
		color: var(--text-2);
	}

	.g[aria-checked='true'] {
		--b: var(--gold);
		box-shadow: inset 0 0 0 2px var(--gold);
		background: var(--panel-3);
		color: var(--text);
	}

	.search {
		--b: var(--line-2);
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		min-height: 48px;
		background: var(--panel);
		box-shadow: inset 0 0 0 1px var(--line-2);
		color: var(--text-3);
	}

	.search:focus-within {
		--b: var(--focus);
		box-shadow: inset 0 0 0 2px var(--focus);
	}

	.search input {
		flex: 1;
		min-width: 0;
		height: 46px;
		border: 0;
		background: transparent;
		color: var(--text);
		font-size: 1rem;
		outline: none;
	}

	.count {
		margin: 0;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--s6);
		display: grid;
		gap: var(--s3);
	}

	.ench {
		position: relative;
		margin: 0;
		padding: var(--s4) var(--s5) var(--s5);
		background: var(--panel);
		scroll-margin-top: 200px;
		transition: background-color 600ms var(--ease);
	}

	.ench.flash {
		background: color-mix(in srgb, var(--gold) 18%, var(--panel));
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
	}

	.name {
		margin: 0;
		font-size: var(--fs-lg);
	}

	.lvl {
		flex: none;
		min-width: 40px;
		padding: 4px 10px;
		text-align: center;
		background: var(--panel-3);
		font-family: var(--font-display);
		font-weight: 700;
		color: var(--gold);
	}

	.effect {
		margin: var(--s2) 0 var(--s3);
		color: var(--text-2);
	}

	.tag {
		display: inline-block;
		margin: 0 0 var(--s3);
		padding: 2px 8px;
		border-radius: 6px;
		corner-shape: squircle;
		font-family: var(--font-ui);
		font-weight: 600;
	}

	.curse {
		background: var(--oxblood);
		color: #ffd6cf;
	}

	:global([data-theme='light']) .curse {
		background: #f2d6d0;
		color: #7a231b;
	}

	.meta {
		display: grid;
		gap: var(--s3);
		padding-top: var(--s3);
		border-top: 1px solid var(--line);
	}

	.goes,
	.clash {
		display: grid;
		gap: 6px;
	}

	.icons {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.icons img {
		padding: 4px;
		background: var(--slot);
		border-radius: 6px;
		corner-shape: squircle;
		box-sizing: content-box;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chip {
		--b: var(--line);
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 34px;
		padding: 0 12px;
		background: var(--panel-2);
		box-shadow: inset 0 0 0 1px var(--line);
		color: var(--text);
		text-decoration: none;
		font-size: var(--fs-sm);
	}

	.chip:hover {
		background: var(--panel-3);
	}

	.price {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 4px var(--s3);
		margin: 0;
	}

	.price strong {
		font-family: var(--font-ui);
		font-weight: 700;
	}

	.empty {
		padding: var(--s6) 0;
	}

	.linkish {
		border: 0;
		background: none;
		padding: 0;
		color: var(--accent-ink);
		text-decoration: underline;
	}
</style>
