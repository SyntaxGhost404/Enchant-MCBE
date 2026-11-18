<script lang="ts">
	import Callout from '$lib/components/Callout.svelte';
	import CodeBlock from '$lib/components/CodeBlock.svelte';
	import { addon, costModes, defaultConfig } from '$lib/addon';
	import { guidePath, href } from '$lib/nav';

	const entry = (uuid: string, version: number[]) => `[\n\t{ "pack_id": "${uuid}", "version": [${version.join(', ')}] }\n]`;
	const bpJson = entry(addon.bp.uuid, addon.bp.version);
	const rpJson = entry(addon.rp.uuid, addon.rp.version);
	const defaultMode = costModes.find((m) => m.isDefault)?.id ?? 'both_per_level';
	const objective = defaultConfig.scores.score_name;
</script>

<svelte:head>
	<title>Servers and Realms · Enchant+</title>
	<meta name="description" content="Run Enchant+ on a Bedrock Dedicated Server or a Realm, set Cost scaling there and use scoreboard money." />
</svelte:head>

<p class="eyebrow">Guide · 6</p>
<h1>Servers and Realms</h1>
<p class="lede">Players don't need to install anything. The server sends the resource pack when they join.</p>

<h2 id="dedicated">Dedicated server</h2>
<ol>
	<li>
		Unzip the <code>.mcaddon</code> (it's a zip file). Copy <code>{addon.bp.folder}</code> into the server's <code>behavior_packs</code> folder and
		<code>{addon.rp.folder}</code> into <code>resource_packs</code>.
	</li>
	<li>Add both to the world. In <code>worlds/&lt;your world&gt;/</code>, put this in <code>world_behavior_packs.json</code>:</li>
</ol>
<CodeBlock code={bpJson} title="world_behavior_packs.json" />
<ol start="3">
	<li>And this in <code>world_resource_packs.json</code>:</li>
</ol>
<CodeBlock code={rpJson} title="world_resource_packs.json" />
<ol start="4">
	<li>In <code>server.properties</code>, set <code>texturepack-required=true</code> so every player gets the menus.</li>
	<li>Restart the server.</li>
</ol>
<p>If a file already lists other packs, add the entry inside its brackets, separated by a comma.</p>

<h2 id="server-scaling">{addon.costSetting.title} on a server</h2>
<p>A dedicated server has no settings screen for packs. Change the default of the setting in <code>{addon.bp.folder}/manifest.json</code>:</p>
<CodeBlock code={`"default": "${defaultMode}"`} title="manifest.json, inside the dropdown setting" />
<p>Use one of these names:</p>
<!-- svelte-ignore a11y_no_noninteractive_tabindex (wide tables scroll sideways on phones) -->
<div class="table-wrap" tabindex="0" role="region" aria-label="Cost scaling names">
	<table class="stack">
		<thead><tr><th scope="col">Name</th><th scope="col">Option</th></tr></thead>
		<tbody>
			{#each costModes as m (m.id)}
				<tr><td data-label="Name"><code>{m.id}</code></td><td data-label="Option">{m.label}</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<h2 id="realms">Realms</h2>
<p>
	Set the world up on a phone or PC first: activate the packs and pick {addon.costSetting.title}. Then upload it from the Realm's settings with
	Replace World. The packs travel with the world.
</p>
<p>Xbox, PlayStation and Switch players can join that Realm and use the table like everyone else.</p>

<h2 id="money">Scoreboard money</h2>
<p>
	Servers with their own currency can charge scoreboard money as well as, or instead of, XP and essence. Turn it on in config.js with the
	<a href={href(guidePath('settings') + '#make')}>config builder</a>, then create the objective and hand out money:
</p>
<CodeBlock code={`/scoreboard objectives add ${objective} dummy`} title="once" />
<CodeBlock code={`/scoreboard players add PlayerName ${objective} 100`} title="give money" />
<Callout>
	<p>Money is always charged per level, whatever {addon.costSetting.title} says. Disenchant gives back the money refund share, rounded down.</p>
</Callout>
