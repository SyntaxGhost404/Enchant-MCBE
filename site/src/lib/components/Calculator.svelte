<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { replaceState } from '$app/navigation';
	import Icon from './Icon.svelte';
	import LevelSlider from './LevelSlider.svelte';
	import Panel from './Panel.svelte';
	import Segmented from './Segmented.svelte';
	import Stepper from './Stepper.svelte';
	import Switch from './Switch.svelte';
	import { addon, conflicts, costModes, defaultConfig } from '$lib/addon';
	import { game, images } from '$lib/addon/assets';
	import { modeRules, price, type ConfigOverrides, type Operation } from '$lib/addon/pricing';
	import { enchantments, enchantmentById, itemGroups, roman, type GroupId } from '$lib/data/enchantments';
	import { formatNumber, shortModeLabel } from '$lib/costs';
	import { toasts } from '$lib/state/toast.svelte';

	const defaultMode = costModes.find((m) => m.isDefault)?.id ?? 'both_per_level';

	let op = $state<Operation>('enchant');
	let mode = $state(defaultMode);
	let source = $state<'levels' | 'pick'>('levels');
	let levels = $state(5);
	let group = $state<GroupId>('sword');
	let picks = $state<Record<string, number>>({});
	let emptiesItem = $state(true);
	let showCustom = $state(false);
	let custom = $state({
		xpOn: defaultConfig.xp.state,
		xpPerLevel: defaultConfig.xp.xp_remove,
		xpBack: Math.round(defaultConfig.xp.refund * 100),
		essenceOn: defaultConfig.items.state,
		essencePerLevel: defaultConfig.items.amount,
		moneyOn: defaultConfig.scores.state,
		moneyPerLevel: defaultConfig.scores.score_remove,
		moneyBack: Math.round(defaultConfig.scores.refund * 100)
	});
	let ready = false;

	const groupEnchantments = $derived(enchantments.filter((e) => e.groups.includes(group)).sort((a, b) => a.name.localeCompare(b.name)));
	const pickedIds = $derived(Object.keys(picks).filter((id) => picks[id] > 0 && groupEnchantments.some((e) => e.id === id)));
	const totalLevels = $derived(source === 'levels' ? levels : pickedIds.reduce((n, id) => n + picks[id], 0));
	const clashes = $derived.by(() => {
		const out: [string, string][] = [];
		pickedIds.forEach((a, i) => {
			for (const b of pickedIds.slice(i + 1)) if (conflicts[a]?.includes(b)) out.push([a, b]);
		});
		return out;
	});

	const overrides = $derived<ConfigOverrides>({
		xp: { state: custom.xpOn, xp_remove: custom.xpPerLevel, refund: custom.xpBack / 100 },
		items: { state: custom.essenceOn, amount: custom.essencePerLevel },
		scores: { state: custom.moneyOn, score_remove: custom.moneyPerLevel, refund: custom.moneyBack / 100 }
	});
	const isDefaultConfig = $derived(
		custom.xpOn === defaultConfig.xp.state &&
			custom.xpPerLevel === defaultConfig.xp.xp_remove &&
			custom.xpBack === Math.round(defaultConfig.xp.refund * 100) &&
			custom.essenceOn === defaultConfig.items.state &&
			custom.essencePerLevel === defaultConfig.items.amount &&
			custom.moneyOn === defaultConfig.scores.state &&
			custom.moneyPerLevel === defaultConfig.scores.score_remove &&
			custom.moneyBack === Math.round(defaultConfig.scores.refund * 100)
	);

	const result = $derived(price(op, totalLevels, mode, overrides, emptiesItem));
	const enchantBase = $derived(price('enchant', totalLevels, mode, overrides));
	const rules = $derived(modeRules(mode));

	const motion = { duration: 260, easing: cubicOut };
	// start from the default prices so the first paint (and the prerendered page) shows real numbers
	const initial = price('enchant', 5, defaultMode);
	const xpShown = new Tween(initial.xp, motion);
	const essenceShown = new Tween(initial.essence, motion);
	const moneyShown = new Tween(initial.money, motion);
	$effect(() => {
		const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		const opts = reduce ? { duration: 0 } : undefined;
		xpShown.set(result.xp, opts);
		essenceShown.set(result.essence, opts);
		moneyShown.set(result.money, opts);
	});

	const s = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

	const xpNote = $derived.by(() => {
		if (!custom.xpOn) return 'XP payment is switched off.';
		if (totalLevels === 0) return 'Add some levels.';
		if (op === 'enchant')
			return rules.xpPerLevel ? `${s(totalLevels, 'level', 'levels')} at ${custom.xpPerLevel} XP each.` : `Flat: ${custom.xpPerLevel} XP for the whole Enchant.`;
		if (op === 'transfer') {
			const half = Math.ceil(enchantBase.xp / 2);
			return result.xp > half
				? `Half of the Enchant price would be ${half}. Raised to the Disenchant refund, so moving and removing can't earn XP.`
				: `Half of the ${enchantBase.xp} XP Enchant price, rounded up.`;
		}
		if (!rules.xpPerLevel && !emptiesItem) return 'With a flat XP cost, XP comes back only when every enchantment comes off.';
		return `${custom.xpBack}% of the ${enchantBase.xp} XP Enchant price, rounded down.`;
	});

	const essenceNote = $derived.by(() => {
		if (!custom.essenceOn) return 'Essence payment is switched off.';
		if (op === 'disenchant') return 'Essence is never given back.';
		if (totalLevels === 0) return 'Add some levels.';
		if (op === 'enchant')
			return rules.essencePerLevel
				? `${s(totalLevels, 'level', 'levels')} at ${custom.essencePerLevel} each.`
				: `Flat: ${custom.essencePerLevel} for the whole Enchant.`;
		return `Half of the ${enchantBase.essence} essence Enchant price, rounded up.`;
	});

	function setPick(id: string, value: number) {
		picks = { ...picks, [id]: value };
	}

	function resetCustom() {
		custom = {
			xpOn: defaultConfig.xp.state,
			xpPerLevel: defaultConfig.xp.xp_remove,
			xpBack: Math.round(defaultConfig.xp.refund * 100),
			essenceOn: defaultConfig.items.state,
			essencePerLevel: defaultConfig.items.amount,
			moneyOn: defaultConfig.scores.state,
			moneyPerLevel: defaultConfig.scores.score_remove,
			moneyBack: Math.round(defaultConfig.scores.refund * 100)
		};
	}

	// ---- shareable links: the setup lives in the address ----
	function toQuery(): string {
		const q = new URLSearchParams();
		if (op !== 'enchant') q.set('op', op);
		if (mode !== defaultMode) q.set('mode', mode);
		if (source === 'pick') {
			q.set('item', group);
			const e = pickedIds.map((id) => `${id}.${picks[id]}`).join(',');
			if (e) q.set('e', e);
		} else if (levels !== 5) q.set('n', String(levels));
		if (op === 'disenchant' && !emptiesItem) q.set('partial', '1');
		if (!isDefaultConfig) {
			q.set(
				'cfg',
				[
					+custom.xpOn,
					custom.xpPerLevel,
					custom.xpBack,
					+custom.essenceOn,
					custom.essencePerLevel,
					+custom.moneyOn,
					custom.moneyPerLevel,
					custom.moneyBack
				].join('.')
			);
		}
		const text = q.toString();
		return text ? `?${text}` : '';
	}

	function fromQuery(search: string) {
		const q = new URLSearchParams(search);
		const o = q.get('op');
		if (o === 'transfer' || o === 'disenchant') op = o;
		const m = q.get('mode');
		if (m && costModes.some((c) => c.id === m)) mode = m;
		const item = q.get('item');
		if (item && itemGroups.some((g) => g.id === item)) {
			source = 'pick';
			group = item as GroupId;
			const next: Record<string, number> = {};
			for (const part of (q.get('e') ?? '').split(',')) {
				const [id, lvl] = part.split('.');
				const e = enchantmentById[id];
				if (e) next[id] = Math.max(0, Math.min(e.max, Number(lvl) || 0));
			}
			picks = next;
		}
		const n = Number(q.get('n'));
		if (Number.isFinite(n) && n >= 1 && n <= 60) levels = Math.round(n);
		if (q.get('partial') === '1') emptiesItem = false;
		const cfg = q.get('cfg')?.split('.').map(Number);
		if (cfg && cfg.length === 8 && cfg.every((v) => Number.isFinite(v) && v >= 0)) {
			custom = {
				xpOn: cfg[0] === 1,
				xpPerLevel: Math.min(100, cfg[1]),
				xpBack: Math.min(100, cfg[2]),
				essenceOn: cfg[3] === 1,
				essencePerLevel: Math.min(100, cfg[4]),
				moneyOn: cfg[5] === 1,
				moneyPerLevel: Math.min(10000, cfg[6]),
				moneyBack: Math.min(100, cfg[7])
			};
			showCustom = true;
		}
	}

	onMount(() => {
		fromQuery(window.location.search);
		ready = true;
	});

	let urlTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const query = toQuery();
		if (!ready) return;
		clearTimeout(urlTimer);
		urlTimer = setTimeout(() => {
			if (window.location.search !== query) replaceState(`${window.location.pathname}${query}${window.location.hash}`, {});
		}, 250);
	});

	async function share() {
		const url = `${window.location.origin}${window.location.pathname}${toQuery()}`;
		try {
			if (navigator.share && matchMedia('(pointer: coarse)').matches) {
				await navigator.share({ title: 'Enchant+ price', url });
				return;
			}
			await navigator.clipboard.writeText(url);
			toasts.show('Link copied');
		} catch {
			// share sheet closed
		}
	}

	const opOptions: { value: Operation; label: string }[] = [
		{ value: 'enchant', label: 'Enchant' },
		{ value: 'transfer', label: 'Transfer' },
		{ value: 'disenchant', label: 'Disenchant' }
	];
	const sourceOptions: { value: 'levels' | 'pick'; label: string }[] = [
		{ value: 'levels', label: 'Count levels' },
		{ value: 'pick', label: 'Pick enchantments' }
	];
	const levelsLabel = $derived(op === 'enchant' ? 'Levels to add' : op === 'transfer' ? 'Levels to move' : 'Levels to remove');
</script>

<Panel title="Price calculator" icon="calculator" gems id="calculator">
	{#snippet actions()}
		<button type="button" class="share sq r-12" onclick={share} aria-label="Share this setup">
			<Icon name="share" size={20} />
		</button>
	{/snippet}

	<div class="calc">
		<div class="controls">
			<div class="field">
				<span class="field-label" id="op-label">Operation</span>
				<Segmented options={opOptions} bind:value={op} label="Operation" full />
			</div>

			<div class="field">
				<span class="field-label">Levels</span>
				<Segmented options={sourceOptions} bind:value={source} label="How to count levels" full />
			</div>

			{#if source === 'levels'}
				<Stepper id="calc-levels" label={levelsLabel} bind:value={levels} min={1} max={60} />
				<p class="hint small muted">Sharpness III plus Unbreaking II is 5 levels.</p>
			{:else}
				<div class="field">
					<span class="field-label">Item</span>
					<div class="groups" role="radiogroup" aria-label="Item type">
						{#each itemGroups as g (g.id)}
							<button
								type="button"
								role="radio"
								aria-checked={g.id === group}
								class="grp sq r-12 sq-b" class:b2={g.id === group}
								onclick={() => (group = g.id)}
								title={g.name}
								aria-label={g.name}
							>
								<img src={game(g.icon)} alt="" width="32" height="32" class="pixel" />
							</button>
						{/each}
					</div>
					<p class="small muted grp-name">{itemGroups.find((g) => g.id === group)?.name}: {groupEnchantments.length} enchantments</p>
				</div>
				<div class="sliders">
					{#each groupEnchantments as e (e.id)}
						{@const clash = pickedIds.find((id) => id !== e.id && conflicts[e.id]?.includes(id))}
						<div class="sl" class:clash={!!clash && (picks[e.id] ?? 0) > 0}>
							<LevelSlider
								id="pick-{e.id}"
								label={e.name}
								max={e.max}
								format={roman}
								value={picks[e.id] ?? 0}
								onchange={(v) => setPick(e.id, v)}
							/>
							{#if clash}
								<p class="small clash-note">Can't go with {enchantmentById[clash].name}</p>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if op === 'disenchant'}
				<Switch id="calc-empties" label="Removes every enchantment" bind:checked={emptiesItem} />
			{/if}

			<fieldset class="modes">
				<legend class="field-label">{addon.costSetting.title} <span class="muted small">(world setting)</span></legend>
				{#each costModes as m (m.id)}
					<label class="mode sq r-16 sq-b" class:on={m.id === mode} class:b2={m.id === mode}>
						<input type="radio" name="calc-mode" value={m.id} bind:group={mode} />
						<span class="mode-name">{shortModeLabel[m.id] ?? m.label}</span>
						<span class="mode-game small">{m.label}</span>
					</label>
				{/each}
			</fieldset>
		</div>

		<div class="results" aria-live="polite">
			<div class="res-head">
				<span class="res-title">{op === 'disenchant' ? 'You get back' : 'You pay'}</span>
				<span class="res-levels small muted num">{s(totalLevels, 'level', 'levels')}</span>
			</div>

			{#if clashes.length && source === 'pick' && op !== 'disenchant'}
				<div class="blocked sq r-16">
					<Icon name="warning" size={24} />
					<p>
						In the game these can't go together:
						{clashes.map(([a, b]) => `${enchantmentById[a].name} and ${enchantmentById[b].name}`).join(', ')}. Chat lists them and nothing is
						charged.
					</p>
				</div>
			{/if}

			<div class="stat sq r-16 sq-b">
				<img src={game('items/experience_bottle')} alt="" width="40" height="40" class="pixel" />
				<div class="stat-body">
					<span class="stat-label">XP levels</span>
					<span class="stat-value xp num">{Math.round(xpShown.current)}</span>
					<span class="stat-note small">{xpNote}</span>
				</div>
			</div>

			<div class="stat sq r-16 sq-b">
				<img src={images.essence} alt="" width="40" height="40" class="pixel" />
				<div class="stat-body">
					<span class="stat-label">{addon.itemNames.essence}</span>
					<span class="stat-value num">{Math.round(essenceShown.current)}</span>
					<span class="stat-note small">{essenceNote}</span>
				</div>
			</div>

			{#if custom.moneyOn}
				<div class="stat sq r-16 sq-b">
					<span class="money-ic"><Icon name="gem" size={32} /></span>
					<div class="stat-body">
						<span class="stat-label">{defaultConfig.scores.display_name}</span>
						<span class="stat-value num">{Math.round(moneyShown.current)}</span>
						<span class="stat-note small">Scoreboard money is always charged per level.</span>
					</div>
				</div>
			{/if}

			<button type="button" class="custom-toggle sq r-12 sq-b" aria-expanded={showCustom} onclick={() => (showCustom = !showCustom)}>
				<Icon name="sliders" size={20} />
				<span>{isDefaultConfig ? 'Custom amounts' : 'Custom amounts (changed)'}</span>
				<Icon name={showCustom ? 'chevron-up' : 'chevron-down'} size={20} />
			</button>

			{#if showCustom}
				<div class="custom">
					<p class="small muted">Servers and worlds can change these in config.js. Defaults are shown first.</p>
					<Switch id="cfg-xp-on" label="Charge XP" bind:checked={custom.xpOn} />
					{#if custom.xpOn}
						<div class="steppers">
							<Stepper id="cfg-xp" label="XP per level" bind:value={custom.xpPerLevel} min={0} max={100} />
							<Stepper id="cfg-xp-back" label="XP back, %" bind:value={custom.xpBack} min={0} max={100} />
						</div>
					{/if}
					<Switch id="cfg-ess-on" label="Charge essence" bind:checked={custom.essenceOn} />
					{#if custom.essenceOn}
						<div class="steppers">
							<Stepper id="cfg-ess" label="Essence per level" bind:value={custom.essencePerLevel} min={0} max={100} />
						</div>
					{/if}
					<Switch id="cfg-money-on" label="Charge scoreboard money" bind:checked={custom.moneyOn} />
					{#if custom.moneyOn}
						<div class="steppers">
							<Stepper id="cfg-money" label="Money per level" bind:value={custom.moneyPerLevel} min={0} max={10000} />
							<Stepper id="cfg-money-back" label="Money back, %" bind:value={custom.moneyBack} min={0} max={100} />
						</div>
					{/if}
					<button type="button" class="reset" onclick={resetCustom} disabled={isDefaultConfig}>Back to defaults</button>
				</div>
			{/if}
		</div>
	</div>
</Panel>

<style>
	.calc {
		display: grid;
		gap: var(--s6);
	}

	@media (min-width: 860px) {
		.calc {
			grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
			align-items: start;
		}
		.results {
			position: sticky;
			top: calc(var(--topbar) + 72px);
		}
	}

	.controls {
		display: grid;
		gap: var(--s5);
		min-width: 0;
	}

	.field {
		display: grid;
		gap: 8px;
		min-width: 0;
	}

	.field-label {
		font-family: var(--font-ui);
		font-weight: 600;
		font-size: 0.9375rem;
		color: var(--text-2);
		padding: 0;
	}

	.hint {
		margin: -8px 0 0;
	}

	.groups {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		padding: 3px;
		margin: -3px;
		scrollbar-width: none;
		scroll-snap-type: x proximity;
	}

	.groups::-webkit-scrollbar {
		display: none;
	}

	.grp {
		--b: var(--slot-line);
		position: relative;
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		flex: none;
		border: 0;
		background: var(--slot);
		box-shadow: inset 0 0 0 1px var(--slot-line);
		scroll-snap-align: start;
		touch-action: manipulation;
		transition: transform var(--t-fast) var(--ease);
	}

	.grp:active {
		transform: scale(0.94);
	}

	.grp[aria-checked='true'] {
		--b: var(--gold);
		box-shadow: inset 0 0 0 2px var(--gold);
		background: var(--panel-3);
	}

	.grp-name {
		margin: 0;
	}

	.sliders {
		display: grid;
		gap: var(--s4);
		padding: var(--s4);
		background: var(--panel-2);
		border-radius: 16px;
		corner-shape: squircle;
	}

	.sl.clash :global(output) {
		color: var(--red);
	}

	.clash-note {
		margin: 2px 0 0;
		color: var(--red);
	}

	.modes {
		display: grid;
		gap: 8px;
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}

	.modes legend {
		margin-bottom: 8px;
	}

	.mode {
		--b: var(--line);
		position: relative;
		display: grid;
		gap: 2px;
		padding: 12px 14px 12px 46px;
		background: var(--panel-2);
		box-shadow: inset 0 0 0 1px var(--line);
		cursor: pointer;
		transition: background-color var(--t-fast) var(--ease);
	}

	.mode:hover {
		background: var(--panel-3);
	}

	.mode.on {
		--b: var(--gold);
		box-shadow: inset 0 0 0 2px var(--gold);
		background: var(--panel-3);
	}

	.mode input {
		position: absolute;
		left: 14px;
		top: 50%;
		width: 20px;
		height: 20px;
		margin: -10px 0 0;
		appearance: none;
		-webkit-appearance: none;
		background: var(--slot);
		box-shadow: inset 0 0 0 1px var(--slot-line);
		border-radius: 6px;
		corner-shape: squircle;
		cursor: pointer;
	}

	.mode input:checked {
		background: var(--gold);
		box-shadow: inset 0 0 0 5px var(--panel-3);
	}

	.mode input:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	.mode-name {
		font-family: var(--font-ui);
		font-weight: 700;
	}

	.mode-game {
		color: var(--text-3);
	}

	.results {
		display: grid;
		gap: var(--s3);
		min-width: 0;
	}

	.res-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.res-title {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: var(--fs-lg);
	}

	.blocked {
		display: flex;
		gap: var(--s3);
		padding: var(--s3) var(--s4);
		background: color-mix(in srgb, var(--red) 14%, var(--panel-2));
		color: var(--text);
	}

	.blocked :global(svg) {
		color: var(--red);
		flex: none;
	}

	.blocked p {
		margin: 0;
		font-size: var(--fs-sm);
	}

	.stat {
		--b: var(--line);
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: var(--s4);
		padding: var(--s4);
		background: var(--panel-2);
		box-shadow: inset 0 0 0 1px var(--line);
	}

	.stat img,
	.money-ic {
		flex: none;
		margin-top: 6px;
	}

	.money-ic {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		color: var(--accent);
	}

	.stat-body {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.stat-label {
		font-family: var(--font-ui);
		font-weight: 600;
		color: var(--text-2);
	}

	.stat-value {
		font-family: var(--font-ui);
		font-weight: 800;
		font-size: 2.5rem;
		line-height: 1.05;
	}

	.stat-value.xp {
		color: var(--xp);
	}

	.stat-note {
		color: var(--text-3);
	}

	.share {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 0;
		background: rgb(0 0 0 / 0.22);
		color: #fff;
	}

	.share:hover {
		background: rgb(0 0 0 / 0.35);
	}

	.custom-toggle {
		--b: var(--line-2);
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 48px;
		padding: 0 14px;
		border: 0;
		background: transparent;
		box-shadow: inset 0 0 0 1px var(--line-2);
		color: var(--text);
		font-family: var(--font-ui);
		font-weight: 600;
	}

	.custom-toggle span {
		flex: 1;
		text-align: left;
	}

	.custom {
		display: grid;
		gap: var(--s3);
		padding: var(--s4);
		background: var(--panel-2);
		border-radius: 16px;
		corner-shape: squircle;
	}

	.custom p {
		margin: 0;
	}

	.steppers {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s4);
		padding-bottom: var(--s2);
	}

	.reset {
		justify-self: start;
		min-height: 40px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.reset:disabled {
		color: var(--text-3);
		text-decoration: none;
		cursor: default;
	}
</style>
