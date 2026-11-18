<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import { addon, costModes } from '$lib/addon';
	import { guidePath, href } from '$lib/nav';
	import { DEVICES, issueUrl, MAX_URL, reportMarkdown, type ReportData } from '$lib/report';
	import { load, remove, save } from '$lib/state/storage';
	import { toasts } from '$lib/state/toast.svelte';

	const KEY = 'enchantplus.report';
	const blank = (): ReportData => ({
		title: '',
		happened: '',
		steps: '',
		expected: '',
		device: '',
		game: '',
		addonVersion: addon.version,
		costScaling: costModes.find((m) => m.isDefault)?.label ?? '',
		others: '',
		log: ''
	});

	let data = $state<ReportData>(blank());
	let loaded = false;
	let showPreview = $state(false);

	onMount(() => {
		data = { ...blank(), ...load<Partial<ReportData>>(KEY, {}) };
		loaded = true;
	});

	$effect(() => {
		const snapshot = $state.snapshot(data);
		if (loaded) save(KEY, snapshot);
	});

	const ready = $derived(data.title.trim().length > 3 && data.happened.trim().length > 5 && !!data.device && !!data.game.trim());
	const markdown = $derived(reportMarkdown(data));
	const url = $derived(issueUrl(data));
	const tooLong = $derived(url.length > MAX_URL);
	const oldVersion = $derived(!!data.addonVersion.trim() && data.addonVersion.trim() !== addon.version);

	async function copy(text: string, done: string) {
		try {
			await navigator.clipboard.writeText(text);
			toasts.show(done);
			return true;
		} catch {
			toasts.show('Copy failed. Select the text instead.', 'info');
			return false;
		}
	}

	async function openGithub() {
		if (tooLong) {
			await copy(data.log.trim(), 'Content log copied. Paste it into the issue.');
			window.open(issueUrl(data, false), '_blank', 'noopener');
		} else {
			window.open(url, '_blank', 'noopener');
		}
	}

	function clear() {
		data = blank();
		remove(KEY);
		toasts.show('Form cleared', 'info');
	}
</script>

<svelte:head>
	<title>Report a bug · Enchant+</title>
	<meta name="description" content="Report an Enchant+ bug. The page fills in the GitHub issue form for you." />
</svelte:head>

<div class="wrap section">
	<p class="eyebrow">Report a bug</p>
	<h1>Something went wrong?</h1>
	<p class="lede">Fill this in and the page writes the report for you. Your draft stays on this device until you send it.</p>

	<ul class="checks">
		<li><Icon name="check" size={20} /> <span>You're on Enchant+ {addon.version}.</span></li>
		<li><Icon name="check" size={20} /> <span>You tried the <a href={href(guidePath('troubleshooting'))}>troubleshooting fixes</a>.</span></li>
		<li><Icon name="check" size={20} /> <span>If you can, it still happens with other add-ons turned off.</span></li>
	</ul>

	<div class="layout">
		<form class="form" onsubmit={(e) => e.preventDefault()}>
			<label class="field">
				<span>Short summary <em>required</em></span>
				<input type="text" bind:value={data.title} placeholder="For example: Transfer takes essence but moves nothing" maxlength="120" />
			</label>
			<label class="field">
				<span>What happened <em>required</em></span>
				<textarea rows="4" bind:value={data.happened} placeholder="What you did and what went wrong"></textarea>
			</label>
			<label class="field">
				<span>Steps to make it happen again</span>
				<textarea rows="3" bind:value={data.steps} placeholder="1. Place the table&#10;2. ..."></textarea>
			</label>
			<label class="field">
				<span>What you expected</span>
				<textarea rows="2" bind:value={data.expected}></textarea>
			</label>

			<fieldset class="field">
				<legend>Device <em>required</em></legend>
				<div class="devices">
					{#each DEVICES as d (d)}
						<label class="dev sq r-12 sq-b" class:on={data.device === d} class:b2={data.device === d}>
							<input type="radio" name="device" value={d} bind:group={data.device} />
							<span>{d}</span>
						</label>
					{/each}
				</div>
			</fieldset>

			<div class="two">
				<label class="field">
					<span>Minecraft version <em>required</em></span>
					<input type="text" bind:value={data.game} placeholder={addon.minGame} inputmode="decimal" />
				</label>
				<label class="field">
					<span>Enchant+ version</span>
					<input type="text" bind:value={data.addonVersion} />
				</label>
			</div>
			{#if oldVersion}
				<p class="warn small"><Icon name="warning" size={20} /> Version {addon.version} may already fix this. <a href={href('/download/')}>Update first.</a></p>
			{/if}

			<label class="field">
				<span>{addon.costSetting.title} setting</span>
				<select bind:value={data.costScaling}>
					{#each costModes as m (m.id)}<option value={m.label}>{m.label}</option>{/each}
					<option value="Not sure">Not sure</option>
				</select>
			</label>
			<label class="field">
				<span>Other add-ons in the world</span>
				<textarea rows="2" bind:value={data.others}></textarea>
			</label>
			<label class="field">
				<span>Content log</span>
				<textarea rows="4" class="mono" bind:value={data.log} placeholder="Settings, Creator, Content Log GUI. Paste the lines that mention Enchant+ or da."></textarea>
			</label>
		</form>

		<div class="side">
			<Panel title="Send it" icon="bug" tag="div">
				<div class="actions">
					<Button icon="github" onclick={openGithub} disabled={!ready} full>Open on GitHub</Button>
					<Button variant="secondary" icon="copy" onclick={() => copy(markdown, 'Report copied')} disabled={!ready} full>Copy report</Button>
				</div>
				{#if !ready}
					<p class="small muted">Fill in the summary, what happened, your device and your Minecraft version.</p>
				{:else if tooLong}
					<p class="small muted">The content log is too long for a link. It gets copied so you can paste it into the issue.</p>
				{:else}
					<p class="small muted">GitHub opens with every field filled in. You need a GitHub account to post.</p>
				{/if}
				<button type="button" class="linkish" aria-expanded={showPreview} onclick={() => (showPreview = !showPreview)}>
					{showPreview ? 'Hide' : 'Show'} the report
				</button>
				{#if showPreview}
					<pre class="preview sq r-12">{markdown}</pre>
				{/if}
				<button type="button" class="linkish clear" onclick={clear}>Clear the form</button>
			</Panel>
		</div>
	</div>
</div>

<style>
	.checks {
		list-style: none;
		padding: 0;
		margin: var(--s5) 0 var(--s6);
		display: grid;
		gap: var(--s2);
	}

	.checks li {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		color: var(--text-2);
	}

	.checks :global(svg) {
		color: var(--accent);
		flex: none;
	}

	.layout {
		display: grid;
		gap: var(--s6);
	}

	@media (min-width: 960px) {
		.layout {
			grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
			align-items: start;
		}
		.side {
			position: sticky;
			top: calc(var(--topbar) + var(--s5));
		}
	}

	.form {
		display: grid;
		gap: var(--s4);
	}

	.field {
		display: grid;
		gap: 6px;
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}

	.field > span,
	legend {
		font-family: var(--font-ui);
		font-weight: 600;
		padding: 0;
	}

	em {
		font-style: normal;
		font-family: var(--font-body);
		font-size: var(--fs-xs);
		color: var(--gold);
		margin-left: 6px;
	}

	input[type='text'],
	textarea,
	select {
		width: 100%;
		min-height: 48px;
		padding: 12px 14px;
		border: 0;
		background: var(--panel);
		box-shadow: inset 0 0 0 1px var(--line-2);
		border-radius: 14px;
		corner-shape: squircle;
		font-size: 1rem;
		resize: vertical;
	}

	select {
		appearance: none;
		-webkit-appearance: none;
		background-image: linear-gradient(45deg, transparent 50%, var(--text-3) 50%), linear-gradient(135deg, var(--text-3) 50%, transparent 50%);
		background-position:
			calc(100% - 22px) 50%,
			calc(100% - 16px) 50%;
		background-size: 6px 6px;
		background-repeat: no-repeat;
		padding-right: 40px;
	}

	input[type='text']:focus,
	textarea:focus,
	select:focus {
		outline: none;
		box-shadow: inset 0 0 0 2px var(--focus);
	}

	.mono {
		font-family: var(--font-mono);
		font-size: 0.875rem;
	}

	.devices {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 2px;
	}

	.dev {
		--b: var(--line-2);
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 42px;
		padding: 0 14px;
		background: var(--panel);
		box-shadow: inset 0 0 0 1px var(--line-2);
		cursor: pointer;
		font-size: var(--fs-sm);
		touch-action: manipulation;
	}

	.dev input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.dev.on {
		--b: var(--gold);
		box-shadow: inset 0 0 0 2px var(--gold);
		background: var(--panel-2);
	}

	.dev:has(input:focus-visible) {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	.two {
		display: grid;
		gap: var(--s4);
		grid-template-columns: 1fr 1fr;
	}

	.warn {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: -8px 0 0;
		color: var(--gold);
	}

	.actions {
		display: grid;
		gap: var(--s3);
		margin-bottom: var(--s3);
	}

	.linkish {
		display: block;
		min-height: 40px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.clear {
		color: var(--text-3);
	}

	.preview {
		max-height: 340px;
		overflow: auto;
		margin: var(--s2) 0;
		padding: var(--s3);
		background: var(--code-bg);
		font-size: 0.75rem;
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>
