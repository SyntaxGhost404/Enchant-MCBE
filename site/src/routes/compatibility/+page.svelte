<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/components/icons';
	import Panel from '$lib/components/Panel.svelte';
	import { addon } from '$lib/addon';
	import { guidePath, href, ORIGINAL_URL } from '$lib/nav';

	const platforms: { name: string; icon: IconName; how: string; ok: boolean }[] = [
		{ name: 'Android', icon: 'phone', how: 'Open the file to import it', ok: true },
		{ name: 'iPhone and iPad', icon: 'tablet', how: 'Share the file to Minecraft', ok: true },
		{ name: 'Windows', icon: 'monitor', how: 'Double-click the file', ok: true },
		{ name: 'Realms', icon: 'cloud', how: 'Upload a world that has the packs', ok: true },
		{ name: 'Dedicated servers', icon: 'server', how: 'Copy the packs to the server', ok: true },
		{ name: 'Xbox, PlayStation, Switch', icon: 'gamepad', how: 'Through a Realm or server', ok: false }
	];
</script>

<svelte:head>
	<title>Compatibility · Enchant+</title>
	<meta name="description" content="Which Minecraft versions, devices, Realms and servers Enchant+ {addon.version} works with." />
</svelte:head>

<div class="wrap section">
	<p class="eyebrow">Compatibility</p>
	<h1>Where it runs</h1>
	<p class="lede">Minecraft: Bedrock Edition {addon.minGame} and newer. No experimental toggles.</p>

	<ul class="grid">
		{#each platforms as p (p.name)}
			<li class="item sq r-22 sq-line">
				<span class="ic sq r-12"><Icon name={p.icon} size={24} /></span>
				<span class="txt">
					<strong>{p.name}</strong>
					<span class="small muted">{p.how}</span>
				</span>
				<span class="state" class:ok={p.ok}>
					<Icon name={p.ok ? 'check' : 'info'} size={20} label={p.ok ? 'Supported' : 'Supported through a Realm or server'} />
				</span>
			</li>
		{/each}
	</ul>

	<div class="cols">
		<Panel title="Requirements" icon="shield" tag="div" headingLevel={2}>
			<dl class="facts">
				<div><dt>Minecraft</dt><dd>Bedrock Edition {addon.minGame} or newer</dd></div>
				<div><dt>Experiments</dt><dd>None needed</dd></div>
				{#each addon.scriptModules as m (m.name)}
					<div><dt>Script API</dt><dd><code>{m.name}</code> {m.version}</dd></div>
				{/each}
				<div><dt>Packs</dt><dd><span class="nowrap">{addon.bp.name}</span> and <span class="nowrap">{addon.rp.name}</span>, version {addon.version}</dd></div>
			</dl>
		</Panel>

		<Panel title="With other add-ons" icon="blocks" tag="div" headingLevel={2}>
			<p>Enchant+ works next to most add-ons. Two things to know:</p>
			<ul>
				<li>Its menus change the game's form screens. Another add-on that changes them too can clash. Put <strong>{addon.rp.name}</strong> at the top of the world's resource packs if menus look wrong.</li>
				<li>It adds its own block, item and sphere under the <code>da</code> namespace, so names don't collide with vanilla.</li>
			</ul>
		</Panel>
	</div>

	<h2 id="tested">Tested on</h2>
	<p>Playtested in single player on Android. Reports from other devices help: <a href={href('/report/')}>send one</a>.</p>

	<h2 id="older">Older Minecraft</h2>
	<p>For Minecraft 1.21.44 and older, use the original Enchant+ 1.0.5 from the <a href={ORIGINAL_URL} rel="noopener">original repository</a>.</p>
	<p>Running a server? See <a href={href(guidePath('servers'))}>Servers and Realms</a>.</p>
</div>

<style>
	.grid {
		list-style: none;
		padding: 0;
		margin: var(--s7) 0;
		display: grid;
		gap: var(--s3);
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}

	.item {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--s3);
		margin: 0;
		padding: var(--s4);
		background: var(--panel);
	}

	.ic {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		flex: none;
		background: var(--panel-3);
		color: var(--text-2);
	}

	.txt {
		display: grid;
		gap: 2px;
		flex: 1;
		min-width: 0;
		line-height: 1.3;
	}

	strong {
		font-family: var(--font-ui);
		font-weight: 700;
	}

	.state {
		color: var(--gold);
	}

	.state.ok {
		color: var(--accent);
	}

	.cols {
		display: grid;
		gap: var(--s4);
	}

	@media (min-width: 900px) {
		.cols {
			grid-template-columns: 1fr 1fr;
			align-items: start;
		}
	}

	.facts {
		display: grid;
		gap: var(--s3);
		margin: 0;
	}

	.facts div {
		display: grid;
		grid-template-columns: 110px 1fr;
		gap: var(--s3);
	}

	dt {
		color: var(--text-3);
		font-size: var(--fs-sm);
		padding-top: 2px;
	}

	dd {
		margin: 0;
	}

	.nowrap {
		white-space: nowrap;
	}

	.cols :global(ul:last-child) {
		margin-bottom: 0;
	}
</style>
