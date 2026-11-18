<script lang="ts">
	import Accordion from '$lib/components/Accordion.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/components/icons';
	import { addon } from '$lib/addon';
	import { guidePath, href, ORIGINAL_URL } from '$lib/nav';

	const cards: { path: string; title: string; text: string; icon: IconName }[] = [
		{ path: guidePath('troubleshooting'), title: 'Troubleshooting', text: 'Fixes for import errors, menus and settings.', icon: 'tools' },
		{ path: '/report/', title: 'Report a bug', text: 'Tell us what went wrong, with a ready-made report.', icon: 'bug' },
		{ path: '/compatibility/', title: 'Compatibility', text: 'Versions, devices, Realms and servers.', icon: 'shield' },
		{ path: '/changelog/', title: 'Changelog', text: 'What changed in each version.', icon: 'clock' }
	];
</script>

<svelte:head>
	<title>Help · Enchant+</title>
	<meta name="description" content="Answers to common Enchant+ questions, troubleshooting, compatibility and bug reports." />
</svelte:head>

<div class="wrap section">
	<p class="eyebrow">Help</p>
	<h1>Help</h1>
	<p class="lede">Quick answers first. If something is broken, the troubleshooting page has the fixes.</p>

	<ul class="cards">
		{#each cards as c (c.path)}
			<li>
				<a class="card sq r-22 sq-line" href={href(c.path)}>
					<span class="ic sq r-12"><Icon name={c.icon} size={24} /></span>
					<span class="txt"><strong>{c.title}</strong><span class="small muted">{c.text}</span></span>
					<Icon name="chevron-right" size={24} />
				</a>
			</li>
		{/each}
	</ul>

	<h2 id="faq">Questions</h2>
	<div class="faq">
		<Accordion title="Is Enchant+ free?">
			<p>Yes. <a href={href('/download/')}>Download it here.</a></p>
		</Accordion>
		<Accordion title="Does it replace the normal enchanting table?">
			<p>No. It's a separate block. You need a normal enchanting table to craft it, and the normal one keeps working.</p>
		</Accordion>
		<Accordion title="Which Minecraft version do I need?">
			<p>Minecraft: Bedrock Edition {addon.minGame} or newer. For 1.21.44 and older, use the original 1.0.5 from the <a href={ORIGINAL_URL} rel="noopener">original repository</a>.</p>
		</Accordion>
		<Accordion title="Can I change the prices?">
			<p>
				Yes. Each world picks per level or flat charging in its Behavior Pack settings, and config.js sets the amounts. See
				<a href={href(guidePath('settings'))}>Settings and config</a>.
			</p>
		</Accordion>
		<Accordion title="Does it work on Realms and servers?">
			<p>Yes, and console players can use it there. See <a href={href(guidePath('servers'))}>Servers and Realms</a>.</p>
		</Accordion>
		<Accordion title="What happens if I remove the add-on?">
			<p>Enchanted items keep their enchantments. The tables and Enchant Essence need the add-on to work.</p>
		</Accordion>
		<Accordion title="Why can't I add a certain enchantment?">
			<p>The table only offers what the game allows on that item, and leaves out enchantments that clash with ones already on it. Books accept all of them.</p>
		</Accordion>
	</div>
</div>

<style>
	.cards {
		list-style: none;
		padding: 0;
		margin: var(--s6) 0;
		display: grid;
		gap: var(--s3);
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	}

	.cards li {
		margin: 0;
	}

	.card {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--s3);
		padding: var(--s4);
		background: var(--panel);
		color: var(--text);
		text-decoration: none;
		transition: background-color var(--t-fast) var(--ease);
	}

	.card:hover {
		background: var(--panel-2);
	}

	.ic {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		flex: none;
		background: var(--panel-3);
		color: var(--gold);
	}

	.txt {
		display: grid;
		gap: 2px;
		flex: 1;
		line-height: 1.3;
	}

	strong {
		font-family: var(--font-ui);
		font-weight: 700;
		font-size: var(--fs-md);
	}

	.faq {
		max-width: var(--reading);
	}
</style>
