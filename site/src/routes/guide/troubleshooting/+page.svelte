<script lang="ts">
	import Accordion from '$lib/components/Accordion.svelte';
	import Button from '$lib/components/Button.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { addon } from '$lib/addon';
	import { inlineMarkdown } from '$lib/data/changelog';
	import { href } from '$lib/nav';

	interface Fix {
		id: string;
		q: string;
		a: string[];
		link?: { path: string; label: string };
	}

	const fixes: Fix[] = [
		{
			id: 'import-failed',
			q: 'Minecraft says the import failed',
			a: [
				`Enchant+ ${addon.version} needs Minecraft ${addon.minGame} or newer. Update the game and import again.`,
				'Still failing? Delete older Enchant+ packs under **Settings → Storage** first.'
			]
		},
		{
			id: 'no-update',
			q: 'Nothing changed after importing a new version',
			a: [
				'Minecraft skips an import when a pack with the same version is already installed. Delete the old Enchant+ packs under **Settings → Storage**, then import again.',
				'Your worlds keep their tables and items.'
			]
		},
		{
			id: 'wont-open',
			q: "The table doesn't open",
			a: [
				'Use it with an empty hand, or while holding an item without sneaking. Sneaking with a block in hand places the block instead.',
				'The menu needs at least one enchantable item in your inventory. Chat tells you if there is none.'
			]
		},
		{
			id: 'menus-look-wrong',
			q: 'The menus look plain or broken',
			a: [
				`Another add-on that changes the game's form screens can clash with the Enchant+ menus. Open the world's resource packs and move **${addon.rp.name}** to the top.`,
				`Also check that **${addon.rp.name}** is active. It should come with the behavior pack.`
			]
		},
		{
			id: 'not-enough',
			q: 'It says I don\'t have enough resources',
			a: ['Chat lists exactly what is missing. Prices count XP levels, not XP points, and the essence must be in your inventory.'],
			link: { path: '/guide/prices/', label: 'Check the numbers in the price calculator' }
		},
		{
			id: 'setting-missing',
			q: `I can't find the ${addon.costSetting.title} setting`,
			a: [
				`Open the settings of **${addon.bp.name}**, the behavior pack, not the resource pack, and press its gear button.`,
				'If your device shows no pack settings, the default applies: XP and essence per level.'
			]
		},
		{
			id: 'sphere',
			q: 'The sphere is missing, or there are two',
			a: [
				'Extra or leftover spheres are removed within a few seconds.',
				'If a table lost its sphere, for example after a /kill command, break the table and place it again.'
			]
		},
		{
			id: 'content-log',
			q: 'The content log shows errors',
			a: [
				'Many content log lines come from other add-ons or from Preview versions of Minecraft.',
				`Lines that name **da:enchant_sphere** came from older Enchant+ versions and are fixed in ${addon.version}. If you still see one, please report it.`
			]
		},
		{
			id: 'enchantment-missing',
			q: "An enchantment I want isn't in the list",
			a: [
				'The table only offers what the game allows on that item, and leaves out enchantments that clash with ones already on it.',
				'Books accept every enchantment.'
			]
		},
		{
			id: 'update-105',
			q: 'Is it safe to update from 1.0.5?',
			a: [
				'Yes. Tables and items stay where they are, and spheres left by 1.0.5 are cleaned up on their own.',
				'Delete the old packs under **Settings → Storage** first, then import the new file. Try it on a copy of your world if you want to be sure.'
			]
		}
	];

	let query = $state('');
	const shown = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return q ? fixes.filter((f) => (f.q + ' ' + f.a.join(' ')).toLowerCase().includes(q)) : fixes;
	});
</script>

<svelte:head>
	<title>Troubleshooting · Enchant+</title>
	<meta name="description" content="Fixes for common Enchant+ problems: import errors, menus, missing settings, the sphere and the content log." />
</svelte:head>

<p class="eyebrow">Guide · 7</p>
<h1>Troubleshooting</h1>
<p class="lede">Find your problem and open it for the fix.</p>

<label class="search sq r-16 sq-b" data-no-swipe>
	<Icon name="search" size={20} />
	<span class="visually-hidden">Search problems</span>
	<input type="search" placeholder="Search problems" bind:value={query} autocomplete="off" />
</label>

<div class="list">
	{#each shown as f (f.id)}
		<Accordion title={f.q} id={f.id}>
			{#each f.a as p, i (i)}
				<p>{@html inlineMarkdown(p)}</p>
			{/each}
			{#if f.link}
				<p><a href={href(f.link.path)}>{f.link.label}</a></p>
			{/if}
		</Accordion>
	{:else}
		<p class="muted">Nothing matches. Tell us what happened instead.</p>
	{/each}
</div>

<div class="stuck sq r-22 sq-line">
	<div>
		<h2 id="still-stuck">Still stuck?</h2>
		<p class="muted">Send a bug report with your device and game version. It takes two minutes.</p>
	</div>
	<Button href={href('/report/')} icon="bug">Report a bug</Button>
</div>

<style>
	.search {
		--b: var(--line-2);
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		min-height: 48px;
		margin: var(--s5) 0 var(--s4);
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

	.list :global(.a a) {
		color: var(--accent-ink);
	}

	.stuck {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--s4);
		margin-top: var(--s8);
		padding: var(--s5);
		background: var(--panel);
	}

	.stuck h2 {
		margin: 0 0 var(--s1);
		font-size: var(--fs-lg);
	}

	.stuck p {
		margin: 0;
	}
</style>
