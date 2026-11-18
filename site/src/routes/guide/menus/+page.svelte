<script lang="ts">
	import Callout from '$lib/components/Callout.svelte';
	import ZoomImage from '$lib/components/ZoomImage.svelte';
	import { images } from '$lib/addon/assets';
	import { guidePath, href } from '$lib/nav';
</script>

<svelte:head>
	<title>Using the menus · Enchant+</title>
	<meta name="description" content="Select Item, Enchant, Disenchant and Transfer in the Enchant+ menus, step by step." />
</svelte:head>

<p class="eyebrow">Guide · 2</p>
<h1>Using the menus</h1>
<p class="lede">Every operation shows a recap with the price. Nothing is taken until you press Confirm.</p>

<h2 id="select">Select Item</h2>
<ZoomImage src={images.menus.select} width={1314} height={750} alt="Select Item menu with the profile panel, the item list and the selected item's details" />
<p>
	The first screen lists every enchantable item in your inventory with its icon, name, slot and number of enchantments. Type in the search box to
	filter the list. The profile panel shows your character, your Enchant Essence, your XP and your name.
</p>
<p>Choose an item to see its details and three actions: Enchant, Disenchant and Transfer. The other items stay in the list, so you can switch without going back.</p>

<h2 id="enchant">Enchant</h2>
<div class="pair">
	<ZoomImage src={images.menus.enchant} width={732} height={750} alt="Add Enchant menu with one slider per enchantment" />
	<ZoomImage src={images.menus.recap} width={1314} height={750} alt="Menu Recap with the chosen levels and the total cost" />
</div>
<ol>
	<li>Each slider is one enchantment the item can take. It starts at the current level and goes up to the top level.</li>
	<li>Enchantments that clash with one already on the item are left out. If two of your picks clash, chat names them and nothing is charged.</li>
	<li>The recap shows the new levels and the total cost. Confirm pays and enchants the item.</li>
</ol>
<p>Enchanting a book makes an enchanted book. From a stack of books, one book is used and the enchanted book goes to a free slot.</p>

<h2 id="disenchant">Disenchant</h2>
<ul>
	<li><strong>Remove All</strong> takes every enchantment off the item.</li>
	<li><strong>Single</strong> shows one slider per enchantment, set to the level that stays. Slide left to remove levels.</li>
</ul>
<p>The recap shows how much XP you get back. An enchanted book with nothing left on it turns back into a normal book.</p>
<Callout>
	<p>With a flat XP cost, XP comes back only when every enchantment comes off. The recap tells you when that applies.</p>
</Callout>

<h2 id="transfer">Transfer</h2>
<ol>
	<li>Choose the item that gives the enchantments and press Transfer.</li>
	<li>Pick the item that receives them and press Confirm.</li>
	<li>Each slider shows the level that stays on the first item. Slide left to move levels across.</li>
	<li>Check the recap and confirm.</li>
</ol>
<p>
	Moved levels add to the levels already on the receiving item, up to the top level. Enchantments that clash with the receiving item are refused
	before the recap. A transfer costs half of an Enchant: see <a href={href(guidePath('prices'))}>Prices</a>.
</p>

<style>
	.pair {
		display: grid;
		gap: var(--s3);
		grid-template-columns: minmax(0, 0.98fr) minmax(0, 1.75fr);
		align-items: start;
	}

	@media (max-width: 560px) {
		.pair {
			grid-template-columns: 1fr;
		}
	}
</style>
