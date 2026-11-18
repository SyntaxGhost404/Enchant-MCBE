<script lang="ts">
	import { base } from '$app/paths';
	import Accordion from '$lib/components/Accordion.svelte';
	import Button from '$lib/components/Button.svelte';
	import Callout from '$lib/components/Callout.svelte';
	import CodeBlock from '$lib/components/CodeBlock.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import Tabs from '$lib/components/Tabs.svelte';
	import { addon } from '$lib/addon';
	import { images } from '$lib/addon/assets';
	import { releases } from '$lib/data/changelog';
	import pkg from '$lib/generated/package.json';
	import { guidePath, href, ORIGINAL_URL, REPO_URL } from '$lib/nav';

	type Platform = 'android' | 'ios' | 'windows' | 'consoles' | 'servers';
	let platform = $state<Platform>('android');
	const tabs: { id: Platform; label: string; icon: 'phone' | 'tablet' | 'monitor' | 'gamepad' | 'server' }[] = [
		{ id: 'android', label: 'Android', icon: 'phone' },
		{ id: 'ios', label: 'iPhone and iPad', icon: 'tablet' },
		{ id: 'windows', label: 'Windows', icon: 'monitor' },
		{ id: 'consoles', label: 'Consoles', icon: 'gamepad' },
		{ id: 'servers', label: 'Servers', icon: 'server' }
	];

	const fileUrl = `${base}/downloads/${pkg.fileName}`;
	const sizeText = `${Math.round(pkg.size / 1024)} KB`;
	const released = releases.find((r) => r.version === addon.version)?.facts.Released;
	const shaGroups = pkg.sha256.match(/.{1,8}/g)?.join(' ') ?? pkg.sha256;
</script>

<svelte:head>
	<title>Download · Enchant+</title>
	<meta name="description" content="Download Enchant+ {addon.version} for Minecraft: Bedrock Edition {addon.minGame} and newer, with install steps for every device." />
</svelte:head>

<div class="wrap section">
	<p class="eyebrow">Download</p>
	<h1>Get Enchant+ {addon.version}</h1>
	<p class="lede">One file with both packs. Free, no experimental toggles.</p>

	<div class="top">
		<Panel title={pkg.saveAs} icon="package" gems tag="div">
			<div class="file">
				<img src={images.tableRender} alt="" width="112" height="112" class="art" />
				<dl class="facts">
					<div><dt>Version</dt><dd>{addon.version}{released ? `, ${released}` : ''}</dd></div>
					<div><dt>Needs</dt><dd>Minecraft: Bedrock Edition {addon.minGame} or newer</dd></div>
					<div><dt>Size</dt><dd class="num">{sizeText}</dd></div>
					<div><dt>Contains</dt><dd><span class="nowrap">{addon.bp.name}</span> and <span class="nowrap">{addon.rp.name}</span></dd></div>
				</dl>
			</div>
			<div class="dl">
				<Button href={fileUrl} download={pkg.saveAs} icon="download" size="lg" full>Download {addon.version}</Button>
			</div>
			<div class="sha">
				<span class="small muted">SHA-256</span>
				<code class="hash">{shaGroups}</code>
				<CopyButton text={pkg.sha256} compact label="Copy SHA-256" done="SHA-256 copied" />
			</div>
			{#if pkg.commit}
				<p class="small muted built">
					Packed straight from the pack folders at commit <a href="{REPO_URL}/commit/{pkg.commit}" rel="noopener"><code>{pkg.commit}</code></a>.
				</p>
			{/if}
		</Panel>
	</div>

	<h2 id="install">Install</h2>
	<Tabs {tabs} bind:selected={platform} label="Device">
		{#snippet panel(id)}
			{#if id === 'android'}
				<ol>
					<li>Tap Download. When it's done, open the file. If you're asked which app to use, pick Minecraft.</li>
					<li>Minecraft imports two packs: <strong>{addon.bp.name}</strong> and <strong>{addon.rp.name}</strong>.</li>
					<li>Edit your world, open <strong>Behavior Packs</strong> and activate <strong>{addon.bp.name}</strong>. The resource pack comes with it.</li>
				</ol>
				<p class="small muted">By hand: copy the two folders into <code>Android/data/com.mojang.minecraftpe/files/games/com.mojang</code>, into <code>behavior_packs</code> and <code>resource_packs</code>.</p>
			{:else if id === 'ios'}
				<ol>
					<li>Tap Download, then open the file from Downloads in the Files app.</li>
					<li>Tap Share and choose Minecraft. It imports both packs.</li>
					<li>Edit your world, open <strong>Behavior Packs</strong> and activate <strong>{addon.bp.name}</strong>.</li>
				</ol>
				<p class="small muted">By hand: in Files, go to <code>On My iPhone/Minecraft/games/com.mojang</code>.</p>
			{:else if id === 'windows'}
				<ol>
					<li>Download the file and double-click it. Minecraft opens and imports both packs.</li>
					<li>Edit your world, open <strong>Behavior Packs</strong> and activate <strong>{addon.bp.name}</strong>.</li>
				</ol>
				<p class="small muted">By hand: <code>%APPDATA%\Minecraft Bedrock\Users\Shared\games\com.mojang</code> (Minecraft 1.21.120 and newer).</p>
			{:else if id === 'consoles'}
				<p>Xbox, PlayStation and Switch can't import add-on files. Two ways to play anyway:</p>
				<ul>
					<li>Join a Realm or server that runs Enchant+.</li>
					<li>Set the world up on a phone or PC and upload it to your Realm.</li>
				</ul>
				<p><a href={href(guidePath('servers') + '#realms')}>How to set up a Realm</a></p>
			{:else}
				<p>Copy the two pack folders to the server and add them to the world's pack lists.</p>
				<p><a href={href(guidePath('servers'))}>Server setup, step by step</a></p>
			{/if}
		{/snippet}
	</Tabs>

	<h2 id="update">Updating</h2>
	<p>Minecraft skips an import when the same version is already installed. Delete the old Enchant+ packs under <strong>Settings → Storage</strong>, then import the new file. Tables and items in your worlds stay where they are.</p>
	<Callout>
		<p>Playing on Minecraft 1.21.44 or older? Get the original 1.0.5 from the <a href={ORIGINAL_URL} rel="noopener">original repository</a>.</p>
	</Callout>

	<h2 id="check">Check the file</h2>
	<Accordion title="Compare the SHA-256">
		<p>The download is built from the repository, so the hash changes only when the packs change. Run one of these next to the file and compare the result with the SHA-256 above.</p>
		<CodeBlock code={`Get-FileHash "${pkg.saveAs}"`} title="Windows PowerShell" />
		<CodeBlock code={`shasum -a 256 "${pkg.saveAs}"`} title="macOS and Linux" />
	</Accordion>
</div>

<style>
	.top {
		margin: var(--s6) 0 var(--s4);
		max-width: 760px;
	}

	.file {
		display: flex;
		gap: var(--s5);
		align-items: center;
	}

	.art {
		flex: none;
		width: 96px;
		height: 96px;
	}

	@media (min-width: 600px) {
		.art {
			width: 112px;
			height: 112px;
		}
	}

	.facts {
		display: grid;
		gap: var(--s2);
		margin: 0;
	}

	.facts div {
		display: grid;
		grid-template-columns: 84px 1fr;
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

	.dl {
		margin: var(--s5) 0 var(--s4);
	}

	.sha {
		display: flex;
		align-items: center;
		gap: var(--s3);
		padding: var(--s3) var(--s3) var(--s3) var(--s4);
		background: var(--panel-2);
		border-radius: 14px;
		corner-shape: squircle;
	}

	.hash {
		flex: 1;
		min-width: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		word-break: break-all;
		background: none !important;
		padding: 0 !important;
		color: var(--text-2);
	}

	.built {
		margin: var(--s3) 0 0;
	}

	.nowrap {
		white-space: nowrap;
	}
</style>
