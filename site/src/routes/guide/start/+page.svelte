<script lang="ts">
	import Callout from '$lib/components/Callout.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import RecipeGrid from '$lib/components/RecipeGrid.svelte';
	import { addon, recipes } from '$lib/addon';
	import { guidePath, href } from '$lib/nav';

	const essence = recipes.find((r) => r.result.item === 'da:enchant_essence')!;
	const table = recipes.find((r) => r.result.item === 'da:enchant_table_plus')!;
</script>

<svelte:head>
	<title>Get started · Enchant+</title>
	<meta name="description" content="Craft Enchant Essence and the Enchant+ table, place it and open its menu." />
</svelte:head>

<p class="eyebrow">Guide · 1</p>
<h1>Get started</h1>
<p class="lede">Two crafts, then the table is ready. Both recipes need a crafting table.</p>

<h2 id="essence">Craft Enchant Essence</h2>
<p>Essence pays for enchanting, together with XP. One craft makes {essence.result.count}.</p>
<Panel tag="div"><RecipeGrid recipe={essence} /></Panel>

<h2 id="table">Craft the table</h2>
<p>It needs one Enchant Essence and a normal enchanting table. In your inventory it shows up as <strong>{addon.itemNames.table}</strong>.</p>
<Panel tag="div"><RecipeGrid recipe={table} /></Panel>

<h2 id="place">Place it</h2>
<p>A glowing sphere appears above the table. Break the table and the sphere goes with it, whatever breaks it.</p>

<h2 id="open">Open it</h2>
<p>Use the table with an empty hand, or while holding any item without sneaking. To place a block on top of the table, sneak while holding the block.</p>
<Callout title="Bring payment">
	<p>
		Enchanting takes XP levels and Enchant Essence from your inventory. The menu shows your balance before you pay. See
		<a href={href(guidePath('prices'))}>Prices</a> for the amounts.
	</p>
</Callout>
