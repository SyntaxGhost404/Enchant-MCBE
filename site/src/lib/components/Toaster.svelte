<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import Icon from './Icon.svelte';
	import { toasts } from '$lib/state/toast.svelte';
</script>

<div class="toaster" aria-live="polite" aria-atomic="false">
	{#each toasts.items as t (t.id)}
		<div class="toast sq r-16" animate:flip={{ duration: 180 }} transition:fly={{ y: 16, duration: 200 }}>
			<Icon name={t.tone === 'ok' ? 'check' : 'info'} size={20} />
			<span>{t.text}</span>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		left: 50%;
		bottom: calc(var(--tabbar) + var(--safe-bottom) + var(--s3));
		transform: translateX(-50%);
		z-index: 80;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--s2);
		pointer-events: none;
		width: max-content;
		max-width: calc(100vw - 32px);
	}

	@media (min-width: 900px) {
		.toaster {
			bottom: var(--s6);
		}
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		background: #26231f;
		color: #f1ebe0;
		font-family: var(--font-ui);
		font-size: 0.9375rem;
		box-shadow:
			inset 0 0 0 1px #4b443c,
			inset 0 -3px 0 #161412;
		font-weight: 600;
	}
</style>
