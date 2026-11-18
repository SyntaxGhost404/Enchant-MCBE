<script lang="ts">
	import OptionGrid from './OptionGrid.svelte';
	import Stepper from './Stepper.svelte';
	import { addon, costModes } from '$lib/addon';
	import { game, images } from '$lib/addon/assets';
	import { price } from '$lib/addon/pricing';
	import { modeOptions } from '$lib/costs';

	let levels = $state(5);
	let mode = $state(costModes.find((m) => m.isDefault)?.id ?? 'both_per_level');
	const rows = $derived([
		{ name: 'Enchant', note: 'You pay', p: price('enchant', levels, mode) },
		{ name: 'Transfer', note: 'You pay', p: price('transfer', levels, mode) },
		{ name: 'Disenchant', note: 'You get back', p: price('disenchant', levels, mode) }
	]);
	const full = $derived(modeOptions.find((m) => m.value === mode)?.full ?? '');
</script>

<div class="preview">
	<div class="controls">
		<Stepper id="preview-levels" label="Levels" bind:value={levels} min={1} max={40} />
		<div class="mode">
			<span class="lbl">{addon.costSetting.title}</span>
			<OptionGrid options={modeOptions} bind:value={mode} label={addon.costSetting.title} name="preview-mode" />
			<span class="small muted">In the game: {full}</span>
		</div>
	</div>
	<ul class="tiles">
		{#each rows as r (r.name)}
			<li class="tile sq r-22 sq-line">
				<span class="name">{r.name}</span>
				<span class="note small muted">{r.note}</span>
				<span class="val">
					<img src={game('items/experience_bottle')} alt="" width="28" height="28" class="pixel" />
					<span class="num xp">{r.p.xp}</span>
					<span class="unit small">XP</span>
				</span>
				{#if r.name !== 'Disenchant'}
					<span class="val">
						<img src={images.essence} alt="" width="28" height="28" class="pixel" />
						<span class="num">{r.p.essence}</span>
						<span class="unit small">essence</span>
					</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	.preview {
		display: grid;
		gap: var(--s5);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s5);
		align-items: flex-start;
	}

	.mode {
		display: grid;
		gap: 6px;
		flex: 1 1 320px;
		min-width: 0;
		max-width: 640px;
	}

	.lbl {
		font-family: var(--font-ui);
		font-weight: 600;
	}

	.tiles {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--s3);
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	}

	.tile {
		position: relative;
		display: grid;
		gap: 4px;
		margin: 0;
		padding: var(--s4) var(--s5);
		background: var(--panel);
	}

	.name {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: var(--fs-lg);
	}

	.note {
		margin-bottom: var(--s2);
	}

	.val {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.val .num {
		font-family: var(--font-ui);
		font-weight: 800;
		font-size: 1.75rem;
		line-height: 1.2;
	}

	.xp {
		color: var(--xp);
	}

	.unit {
		color: var(--text-3);
	}
</style>
