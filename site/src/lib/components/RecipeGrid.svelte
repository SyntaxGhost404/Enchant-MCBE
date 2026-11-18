<script lang="ts">
	import Icon from './Icon.svelte';
	import ItemSlot from './ItemSlot.svelte';
	import { addon, type Recipe } from '$lib/addon';
	import { itemInfo } from '$lib/addon/assets';

	interface Props {
		recipe: Recipe;
		size?: number;
	}

	let { recipe, size = 52 }: Props = $props();
	const info = (id: string) => itemInfo(id, addon.itemNames);
	const cols = $derived(recipe.grid[0]?.length ?? 3);
	const result = $derived(info(recipe.result.item));
	const ingredients = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const row of recipe.grid) for (const id of row) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
		return [...counts.entries()].map(([id, n]) => ({ ...info(id), id, n }));
	});
</script>

<figure class="recipe">
	<div class="craft">
		<div class="grid" style="grid-template-columns: repeat({cols}, {size}px)">
			{#each recipe.grid as row, r (r)}
				{#each row as id, c (c)}
					{#if id}
						{@const it = info(id)}
						<ItemSlot icon={it.icon} name={it.name} render={it.render} size={size} />
					{:else}
						<ItemSlot size={size} />
					{/if}
				{/each}
			{/each}
		</div>
		<span class="arrow"><Icon name="arrow-right" size={32} /></span>
		<ItemSlot icon={result.icon} name={result.name} render={result.render} size={Math.round(size * 1.5)} count={recipe.result.count} highlight />
	</div>
	<figcaption>
		<ul class="legend">
			{#each ingredients as it (it.id)}
				<li class="chip sq r-12 sq-b">
					<img src={it.icon} alt="" width="24" height="24" class:pixel={!it.render} />
					<span>{it.name}</span>
					{#if it.n > 1}<span class="n num">{it.n}</span>{/if}
				</li>
			{/each}
		</ul>
	</figcaption>
</figure>

<style>
	.recipe {
		margin: 0;
	}

	.craft {
		display: flex;
		align-items: center;
		gap: var(--s3);
		flex-wrap: wrap;
	}

	.grid {
		display: grid;
		gap: 4px;
	}

	.arrow {
		color: var(--text-3);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s2);
		list-style: none;
		padding: 0;
		margin: var(--s4) 0 0;
	}

	.chip {
		--b: var(--line);
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 5px 12px 5px 6px;
		background: var(--panel-2);
		box-shadow: inset 0 0 0 1px var(--line);
		font-size: var(--fs-sm);
		color: var(--text);
	}

	.chip img {
		display: block;
	}

	.n {
		color: var(--text-3);
		font-family: var(--font-ui);
		font-weight: 600;
	}

	.n::before {
		content: '\00d7';
		margin-right: 1px;
	}
</style>
