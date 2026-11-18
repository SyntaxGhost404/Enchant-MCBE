<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/components/icons';
	import Panel from '$lib/components/Panel.svelte';
	import PricePreview from '$lib/components/PricePreview.svelte';
	import RecipeGrid from '$lib/components/RecipeGrid.svelte';
	import Steps from '$lib/components/Steps.svelte';
	import TableViewer from '$lib/components/TableViewer.svelte';
	import { addon, recipes } from '$lib/addon';
	import { game, images } from '$lib/addon/assets';
	import { guidePath, href, SITE_URL } from '$lib/nav';

	const essence = recipes.find((r) => r.result.item === 'da:enchant_essence')!;
	const table = recipes.find((r) => r.result.item === 'da:enchant_table_plus')!;

	const features: { title: string; text: string; icon: string }[] = [
		{ title: 'Enchant', text: 'Any enchantment the item accepts, at any level up to the top one.', icon: game('items/book_enchanted') },
		{ title: 'Disenchant', text: 'Take off everything or just a few levels, and get some XP back.', icon: game('items/experience_bottle') },
		{ title: 'Transfer', text: 'Move levels from one item to another for half the price.', icon: game('items/iron_sword') }
	];

	const extras: { title: string; text: string; icon: IconName }[] = [
		{ title: 'The game sets the rules', text: 'Only enchantments that fit the item are offered. Clashing picks are named before you pay.', icon: 'shield' },
		{ title: 'Your world, your prices', text: 'Charge per level or once per operation, chosen in the world settings.', icon: 'sliders' },
		{ title: 'Nothing lost', text: "If an operation can't finish, nothing is taken.", icon: 'check' }
	];

	const places: { name: string; icon: IconName }[] = [
		{ name: 'Android', icon: 'phone' },
		{ name: 'iPhone and iPad', icon: 'tablet' },
		{ name: 'Windows', icon: 'monitor' },
		{ name: 'Realms', icon: 'cloud' },
		{ name: 'Servers', icon: 'server' },
		{ name: 'Consoles on Realms', icon: 'gamepad' }
	];
</script>

<svelte:head>
	<title>Enchant+ · Choose every enchantment in Minecraft: Bedrock Edition</title>
	<meta name="description" content="Enchant+ is an enchanting table add-on for Minecraft: Bedrock Edition {addon.minGame}+. Pick enchantments and levels, see the price, remove or move enchantments." />
	<meta property="og:title" content="Enchant+ for Minecraft: Bedrock Edition" />
	<meta property="og:description" content="Pick every enchantment and level yourself, and see the price before you pay." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={SITE_URL} />
</svelte:head>

<section class="hero">
	<div class="wrap hero-grid">
		<div class="copy">
			<img class="logo" src={images.logo} alt="Enchant+" width="887" height="221" />
			<p class="eyebrow">Add-on for Minecraft: Bedrock Edition</p>
			<h1>Pick every enchantment yourself</h1>
			<p class="lede">Choose the enchantments and levels, see the price, then confirm. Take enchantments off again, or move them to another item.</p>
			<div class="cta">
				<Button href={href('/download/')} icon="download" size="lg">Download {addon.version}</Button>
				<Button href="#how" variant="secondary" size="lg">How it works</Button>
			</div>
			<ul class="facts">
				<li><Icon name="check" size={20} /> Bedrock {addon.minGame} and newer</li>
				<li><Icon name="check" size={20} /> No experiments</li>
				<li><Icon name="check" size={20} /> Free</li>
			</ul>
		</div>
		<div class="stage">
			<TableViewer />
		</div>
	</div>
</section>

<section class="section" id="how">
	<div class="wrap">
		<p class="eyebrow">How it works</p>
		<h2>Three screens, then you're done</h2>
		<p class="lede">Every operation ends on a recap with the price.</p>
		<div class="space"><Steps /></div>
	</div>
</section>

<section class="section">
	<div class="wrap">
		<p class="eyebrow">What it does</p>
		<h2>More than enchanting</h2>
		<ul class="features">
			{#each features as f (f.title)}
				<li class="feature sq r-22 sq-line">
					<span class="slot sq r-16 sq-b"><img src={f.icon} alt="" width="40" height="40" class="pixel" /></span>
					<h3>{f.title}</h3>
					<p class="muted">{f.text}</p>
				</li>
			{/each}
		</ul>
		<ul class="extras">
			{#each extras as x (x.title)}
				<li>
					<span class="xic"><Icon name={x.icon} size={24} /></span>
					<span><strong>{x.title}</strong> <span class="muted">{x.text}</span></span>
				</li>
			{/each}
		</ul>
		<p><a href={href(guidePath('menus'))}>Each screen explained <Icon name="arrow-right" size={18} /></a></p>
	</div>
</section>

<section class="section">
	<div class="wrap">
		<p class="eyebrow">Prices</p>
		<h2>See the price first</h2>
		<p class="lede">These numbers come from the add-on's own pricing code, with the default amounts.</p>
		<div class="space"><PricePreview /></div>
		<p><a href={href(guidePath('prices'))}>Open the full calculator <Icon name="arrow-right" size={18} /></a></p>
	</div>
</section>

<section class="section">
	<div class="wrap">
		<p class="eyebrow">Crafting</p>
		<h2>Craft it</h2>
		<p class="lede">Make the essence first. You need it for the table, and for every Enchant.</p>
		<div class="recipes">
			<Panel title={addon.itemNames.essence} tag="div" headingLevel={3}><RecipeGrid recipe={essence} size={48} /></Panel>
			<Panel title={addon.itemNames.table} tag="div" headingLevel={3} gems><RecipeGrid recipe={table} size={48} /></Panel>
		</div>
		<p><a href={href(guidePath('start'))}>Placing and opening the table <Icon name="arrow-right" size={18} /></a></p>
	</div>
</section>

<section class="section">
	<div class="wrap end">
		<div>
			<p class="eyebrow">Compatibility</p>
			<h2>Works where you play</h2>
			<ul class="places">
				{#each places as p (p.name)}
					<li class="sq r-12 sq-b"><Icon name={p.icon} size={20} /> {p.name}</li>
				{/each}
			</ul>
		</div>
		<div class="end-cta">
			<Button href={href('/download/')} icon="download" size="lg">Download {addon.version}</Button>
			<a href={href('/compatibility/')}>Compatibility details</a>
		</div>
	</div>
</section>

<style>
	.hero {
		padding: var(--s6) 0 var(--s8);
	}

	@media (min-width: 900px) {
		.hero {
			padding: var(--s8) 0 var(--s9);
		}
	}

	.hero-grid {
		display: grid;
		gap: var(--s7);
		align-items: center;
	}

	@media (min-width: 1000px) {
		.hero-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
			gap: var(--s8);
		}
	}

	.logo {
		display: block;
		width: min(100%, 420px);
		height: auto;
		margin: 0 0 var(--s5) -6px;
		image-rendering: auto;
	}

	h1 {
		font-size: clamp(2.1rem, 1.4rem + 3vw, 3.4rem);
		margin-bottom: var(--s4);
	}

	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s3);
		margin: var(--s6) 0 var(--s5);
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s2) var(--s5);
		list-style: none;
		padding: 0;
		margin: 0;
		color: var(--text-2);
		font-size: var(--fs-sm);
	}

	.facts li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 0;
	}

	.facts :global(svg) {
		color: var(--accent);
	}

	.space {
		margin-top: var(--s6);
	}

	.features {
		list-style: none;
		padding: 0;
		margin: var(--s6) 0 var(--s5);
		display: grid;
		gap: var(--s3);
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	}

	.feature {
		position: relative;
		margin: 0;
		padding: var(--s5);
		background: var(--panel);
	}

	.feature h3 {
		margin: var(--s4) 0 var(--s2);
	}

	.feature p {
		margin: 0;
	}

	.slot {
		--b: var(--slot-line);
		position: relative;
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		background: var(--slot);
		box-shadow:
			inset 0 0 0 1px var(--slot-line),
			inset 2px 2px 0 rgb(0 0 0 / 0.28);
	}

	.extras {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--s5);
		display: grid;
		gap: var(--s3);
	}

	@media (min-width: 900px) {
		.extras {
			grid-template-columns: repeat(3, 1fr);
			gap: var(--s5);
		}
	}

	.extras li {
		display: flex;
		gap: var(--s3);
		margin: 0;
	}

	.xic {
		color: var(--gold);
		flex: none;
	}

	.extras strong {
		display: block;
		font-family: var(--font-ui);
		font-weight: 700;
	}

	.recipes {
		display: grid;
		gap: var(--s4);
		margin: var(--s6) 0 var(--s5);
	}

	@media (min-width: 900px) {
		.recipes {
			grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
			align-items: start;
		}
	}

	.end {
		display: grid;
		gap: var(--s6);
		align-items: end;
	}

	@media (min-width: 900px) {
		.end {
			grid-template-columns: 1.4fr 1fr;
		}
	}

	.places {
		list-style: none;
		padding: 0;
		margin: var(--s5) 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--s2);
	}

	.places li {
		--b: var(--line);
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 8px 12px;
		background: var(--panel);
		box-shadow: inset 0 0 0 1px var(--line);
		font-size: var(--fs-sm);
	}

	.places :global(svg) {
		color: var(--text-3);
	}

	.end-cta {
		display: grid;
		gap: var(--s3);
		justify-items: start;
	}

	@media (min-width: 900px) {
		.end-cta {
			justify-items: end;
		}
	}
</style>
