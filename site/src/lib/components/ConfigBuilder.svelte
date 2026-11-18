<script lang="ts">
	import Button from './Button.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import Panel from './Panel.svelte';
	import Stepper from './Stepper.svelte';
	import Switch from './Switch.svelte';
	import { defaultConfig, type AddonConfig } from '$lib/addon';
	import { configSource } from '$lib/addon/configSource';
	import { renderConfig } from '$lib/addon/configFile';
	import { price } from '$lib/addon/pricing';
	import { toasts } from '$lib/state/toast.svelte';

	const clone = (c: AddonConfig): AddonConfig => JSON.parse(JSON.stringify(c));
	let cfg = $state(clone(defaultConfig));
	// refunds are edited as percentages
	let xpBack = $state(Math.round(defaultConfig.xp.refund * 100));
	let moneyBack = $state(Math.round(defaultConfig.scores.refund * 100));

	const idOk = $derived(/^[a-z0-9_.]+:[a-z0-9_./]+$/.test(cfg.items.id));
	const objectiveOk = $derived(/^[A-Za-z0-9_.+-]{1,32}$/.test(cfg.scores.score_name));
	const final = $derived<AddonConfig>({
		...cfg,
		xp: { ...cfg.xp, refund: xpBack / 100 },
		scores: { ...cfg.scores, refund: moneyBack / 100 }
	});
	const code = $derived(renderConfig(configSource, final));
	const changed = $derived(code !== configSource);
	const sample = $derived(
		price('enchant', 5, 'both_per_level', { xp: final.xp, items: final.items, scores: final.scores })
	);

	function reset() {
		cfg = clone(defaultConfig);
		xpBack = Math.round(defaultConfig.xp.refund * 100);
		moneyBack = Math.round(defaultConfig.scores.refund * 100);
	}

	function download() {
		const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = 'config.js';
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		toasts.show('config.js saved');
	}
</script>

<Panel title="config.js builder" icon="sliders" gems id="builder">
	<div class="builder">
		<div class="form">
			<fieldset>
				<legend>Enchant Essence</legend>
				<Switch id="b-items" label="Charge an item" bind:checked={cfg.items.state} />
				{#if cfg.items.state}
					<label class="text">
						<span>Item id</span>
						<input type="text" bind:value={cfg.items.id} spellcheck="false" autocapitalize="off" aria-invalid={!idOk} />
						{#if !idOk}<span class="err small">Use namespace:name, for example minecraft:diamond.</span>{/if}
					</label>
					<Stepper id="b-amount" label="Items per level" bind:value={cfg.items.amount} min={0} max={100} />
					<label class="text">
						<span>Label on the profile panel</span>
						<textarea rows="2" bind:value={cfg.items.name}></textarea>
					</label>
				{/if}
			</fieldset>

			<fieldset>
				<legend>XP levels</legend>
				<Switch id="b-xp" label="Charge XP" bind:checked={cfg.xp.state} />
				{#if cfg.xp.state}
					<div class="row">
						<Stepper id="b-xp-remove" label="XP per level" bind:value={cfg.xp.xp_remove} min={0} max={100} />
						<Stepper id="b-xp-back" label="Given back, %" bind:value={xpBack} min={0} max={100} />
					</div>
					<label class="text">
						<span>Label on the profile panel</span>
						<input type="text" bind:value={cfg.xp.name} />
					</label>
				{/if}
			</fieldset>

			<fieldset>
				<legend>Scoreboard money</legend>
				<Switch id="b-money" label="Charge money" bind:checked={cfg.scores.state} />
				{#if cfg.scores.state}
					<label class="text">
						<span>Scoreboard objective</span>
						<input type="text" bind:value={cfg.scores.score_name} spellcheck="false" autocapitalize="off" aria-invalid={!objectiveOk} />
						{#if !objectiveOk}<span class="err small">Letters, numbers and _ . + only, up to 32.</span>{/if}
					</label>
					<div class="row">
						<Stepper id="b-money-remove" label="Money per level" bind:value={cfg.scores.score_remove} min={0} max={10000} />
						<Stepper id="b-money-back" label="Given back, %" bind:value={moneyBack} min={0} max={100} />
					</div>
					<label class="text">
						<span>Name on the recap</span>
						<input type="text" bind:value={cfg.scores.display_name} />
					</label>
					<label class="text">
						<span>Label on the profile panel</span>
						<input type="text" bind:value={cfg.scores.name} />
					</label>
				{/if}
			</fieldset>
		</div>

		<div class="out">
			<p class="preview">
				With these values and the default Cost scaling, 5 levels cost
				<strong class="num">{sample.xp} XP</strong>,
				<strong class="num">{sample.essence} essence</strong>{#if final.scores.state}
					and <strong class="num">{sample.money} {final.scores.display_name}</strong>{/if}.
			</p>
			<CodeBlock code={code} title="Enchant_Table_BP/scripts/enchant_table/config.js" />
			<div class="actions">
				<Button icon="download" onclick={download} disabled={!idOk || (cfg.scores.state && !objectiveOk)}>Save config.js</Button>
				<Button variant="ghost" onclick={reset} disabled={!changed}>Reset</Button>
			</div>
		</div>
	</div>
</Panel>

<style>
	.builder {
		display: grid;
		gap: var(--s6);
	}

	@media (min-width: 1100px) {
		.builder {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
			align-items: start;
		}
	}

	.form {
		display: grid;
		gap: var(--s4);
	}

	fieldset {
		display: grid;
		gap: var(--s3);
		margin: 0;
		padding: var(--s4);
		border: 0;
		background: var(--panel-2);
		border-radius: 16px;
		corner-shape: squircle;
		min-width: 0;
	}

	legend {
		float: left;
		width: 100%;
		padding: 0;
		margin-bottom: var(--s1);
		font-family: var(--font-display);
		font-weight: 600;
		font-size: var(--fs-md);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s4);
	}

	.text {
		display: grid;
		gap: 6px;
	}

	.text > span:first-child {
		font-family: var(--font-ui);
		font-weight: 600;
	}

	input[type='text'],
	textarea {
		width: 100%;
		min-height: 44px;
		padding: 10px 12px;
		border: 0;
		background: var(--panel);
		box-shadow: inset 0 0 0 1px var(--line-2);
		border-radius: 12px;
		corner-shape: squircle;
		font-family: var(--font-mono);
		font-size: 0.9375rem;
		resize: vertical;
	}

	input[type='text']:focus,
	textarea:focus {
		outline: none;
		box-shadow: inset 0 0 0 2px var(--focus);
	}

	input[aria-invalid='true'] {
		box-shadow: inset 0 0 0 2px var(--red);
	}

	.err {
		color: var(--red);
	}

	.out {
		min-width: 0;
	}

	.preview {
		margin-bottom: var(--s4);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s3);
	}
</style>
