<script lang="ts">
	import Calculator from '$lib/components/Calculator.svelte';
	import { addon, costModes, defaultConfig } from '$lib/addon';
	import { price } from '$lib/addon/pricing';
	import { guidePath, href } from '$lib/nav';

	// the example table is computed by the add-on's own pricing code
	const example = costModes.map((m) => ({
		mode: m,
		enchant: price('enchant', 5, m.id),
		transfer: price('transfer', 5, m.id),
		back: price('disenchant', 5, m.id)
	}));
	const xp = defaultConfig.xp.xp_remove;
	const essence = defaultConfig.items.amount;
	const back = Math.round(defaultConfig.xp.refund * 100);
</script>

<svelte:head>
	<title>Prices · Enchant+</title>
	<meta name="description" content="What Enchant, Transfer and Disenchant cost in Enchant+, with a calculator that runs the add-on's own pricing code." />
</svelte:head>

<p class="eyebrow">Guide · 3</p>
<h1>Prices</h1>
<p class="lede">You see the price before you pay. The calculator below uses the same code as the add-on, so its numbers match the game.</p>

<Calculator />

<h2 id="defaults">Default prices</h2>
<ul>
	<li><strong>Enchant:</strong> {xp} XP levels and {essence} Enchant Essence for each level you add.</li>
	<li><strong>Transfer:</strong> half of what Enchant would cost for the levels you move, rounded up.</li>
	<li><strong>Disenchant:</strong> gives back {back}% of the XP Enchant would cost for the levels you remove, rounded down. Essence never comes back.</li>
</ul>
<p>A world or server can change every amount. See <a href={href(guidePath('settings'))}>Settings and config</a>.</p>

<h2 id="scaling">{addon.costSetting.title}</h2>
<p>
	Each world picks whether XP and essence are charged per level or once per Enchant or Transfer. Per level means for every level added, moved or
	removed in one go. Flat means once per operation, however many levels.
</p>
<p>Example for Sharpness III plus Unbreaking II, which is 5 levels:</p>
<!-- svelte-ignore a11y_no_noninteractive_tabindex (wide tables scroll sideways on phones) -->
<div class="table-wrap" tabindex="0" role="region" aria-label="Prices for 5 levels by option">
	<table class="stack">
		<thead>
			<tr><th scope="col">Option in the game</th><th scope="col">Enchant</th><th scope="col">Transfer</th><th scope="col">Disenchant</th></tr>
		</thead>
		<tbody>
			{#each example as row (row.mode.id)}
				<tr>
					<th scope="row">{row.mode.label}</th>
					<td class="num" data-label="Enchant">{row.enchant.xp} XP, {row.enchant.essence} essence</td>
					<td class="num" data-label="Transfer">{row.transfer.xp} XP, {row.transfer.essence} essence</td>
					<td class="num" data-label="Disenchant">{row.back.xp} XP back</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<h2 id="fair">Fair-play rules</h2>
<p>These hold for every option and every config.js value. No mix of Enchant, Transfer and Disenchant gives back more than it took.</p>
<ul>
	<li>Prices round up and refunds round down.</li>
	<li>
		A Transfer never costs less than disenchanting the moved levels would give back. With the default amounts that is exactly half the Enchant price.
		If a refund share is set above 50%, the transfer price rises to match it.
	</li>
	<li>With a flat XP cost, Disenchant gives XP back only when it removes every enchantment. Otherwise one flat Enchant could be split into many refunds.</li>
	<li>Refund shares are limited to 0 to 100%. Amounts below 0, or that aren't numbers, count as 0.</li>
</ul>
<p>Disenchanting gear you found or traded for still gives XP back, a bit like a grindstone. Set a refund share to 0 to turn that off.</p>
