<script lang="ts">
	import Callout from '$lib/components/Callout.svelte';
	import ConfigBuilder from '$lib/components/ConfigBuilder.svelte';
	import { addon, costModes, defaultConfig } from '$lib/addon';
	import { guidePath, href } from '$lib/nav';

	const meaning: Record<string, string> = {
		both_per_level: 'XP and essence are charged for every level.',
		flat_xp: 'XP is charged once per operation; essence for every level.',
		flat_essence: 'XP for every level; essence is charged once per operation.',
		both_flat: 'Both are charged once per operation, however many levels.'
	};

	const pct = (v: number) => `${Math.round(v * 100)}%`;
	const rows = [
		['items', 'state', String(defaultConfig.items.state), 'true takes Enchant Essence, false switches this payment off'],
		['', 'id', defaultConfig.items.id, 'Item that is taken'],
		['', 'amount', String(defaultConfig.items.amount), 'Items per level, or per operation with a flat essence cost'],
		['', 'name', defaultConfig.items.name.replace(/\n/g, ' '), 'Label on the profile panel'],
		['xp', 'state', String(defaultConfig.xp.state), 'true takes XP levels'],
		['', 'xp_remove', String(defaultConfig.xp.xp_remove), 'XP levels per level, or per operation with a flat XP cost'],
		['', 'refund', `${defaultConfig.xp.refund} (${pct(defaultConfig.xp.refund)})`, 'Share of the Enchant XP price given back by Disenchant'],
		['', 'name', defaultConfig.xp.name, 'Label on the profile panel'],
		['scores', 'state', String(defaultConfig.scores.state), 'true takes scoreboard money'],
		['', 'score_name', defaultConfig.scores.score_name, 'Scoreboard objective that holds the money'],
		['', 'score_remove', String(defaultConfig.scores.score_remove), 'Money per level'],
		['', 'refund', `${defaultConfig.scores.refund} (${pct(defaultConfig.scores.refund)})`, 'Share of the Enchant money price given back'],
		['', 'display_name', defaultConfig.scores.display_name, 'Name on the recap screens'],
		['', 'name', defaultConfig.scores.name, 'Label on the profile panel']
	];
</script>

<svelte:head>
	<title>Settings and config · Enchant+</title>
	<meta name="description" content="Set Cost scaling in the world's Behavior Pack settings and change Enchant+ prices in config.js, with a config builder." />
</svelte:head>

<p class="eyebrow">Guide · 5</p>
<h1>Settings and config</h1>
<p class="lede">Two places decide how Enchant+ charges: the {addon.costSetting.title} setting in each world, and config.js inside the behavior pack.</p>

<h2 id="cost-scaling">{addon.costSetting.title}</h2>
<ol>
	<li>Open the world's settings and go to <strong>Behavior Packs</strong>.</li>
	<li>Select <strong>{addon.bp.name}</strong> and press its gear button.</li>
	<li>Pick an option under <strong>{addon.costSetting.title}</strong>.</li>
</ol>
<p>You can also open it from the pause menu while you play. A change applies to the next Enchant or Transfer.</p>

<figure class="game-text sq r-16">
	<figcaption class="small">What the game shows above the setting</figcaption>
	<p>{addon.costSetting.explanation}</p>
</figure>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (wide tables scroll sideways on phones) -->
<div class="table-wrap" tabindex="0" role="region" aria-label="Cost scaling options">
	<table class="stack">
		<thead><tr><th scope="col">Option</th><th scope="col">What it does</th></tr></thead>
		<tbody>
			{#each costModes as m (m.id)}
				<tr><th scope="row">{m.label}</th><td>{meaning[m.id] ?? ''}</td></tr>
			{/each}
		</tbody>
	</table>
</div>
<p>Compare them with real numbers in the <a href={href(guidePath('prices'))}>price calculator</a>. On a server, see <a href={href(guidePath('servers'))}>Servers and Realms</a>.</p>

<h2 id="config">config.js</h2>
<p>
	Amounts and payment methods live in <code>Enchant_Table_BP/scripts/enchant_table/config.js</code>. Edit it before you import the pack, or edit the
	installed copy and then run <code>/reload</code> or restart the world.
</p>
<!-- svelte-ignore a11y_no_noninteractive_tabindex (wide tables scroll sideways on phones) -->
<div class="table-wrap" tabindex="0" role="region" aria-label="config.js keys">
	<table class="stack">
		<thead><tr><th scope="col">Section</th><th scope="col">Key</th><th scope="col">Default</th><th scope="col">Meaning</th></tr></thead>
		<tbody>
			{#each rows as [section, key, value, text], i (i)}
				<tr>
					<td data-label="Section">{#if section}<code>{section}</code>{/if}</td>
					<td data-label="Key"><code>{key}</code></td>
					<td data-label="Default"><code>{value}</code></td>
					<td data-label="Meaning">{text}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<Callout title="Scoreboard money">
	<p>Create the objective once with <code>/scoreboard objectives add {defaultConfig.scores.score_name} dummy</code>, then give players money with <code>/scoreboard players set</code>.</p>
</Callout>

<h2 id="make">Make your own config.js</h2>
<p>Change the values and save the file. It keeps the layout and comments of the original.</p>
<ConfigBuilder />

<style>
	.game-text {
		margin: 0 0 var(--s5);
		padding: var(--s4) var(--s5);
		background: #2b2c2d;
		color: #f1ebe0;
		box-shadow: inset 0 0 0 1px #48494a;
	}

	.game-text figcaption {
		color: #a9a294;
		margin-bottom: var(--s2);
	}

	.game-text p {
		margin: 0;
		white-space: pre-line;
		line-height: 1.55;
	}
</style>
