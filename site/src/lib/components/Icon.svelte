<script lang="ts">
	import { iconPaths, type IconName } from './icons';

	interface Props {
		name: IconName;
		size?: number;
		/** text for screen readers; leave empty for decorative icons */
		label?: string;
		class?: string;
	}

	let { name, size = 24, label = '', class: className = '' }: Props = $props();
</script>

<svg
	class="icon {className}"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="currentColor"
	shape-rendering="crispEdges"
	role={label ? 'img' : undefined}
	aria-label={label || undefined}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	{@html iconPaths[name]}
</svg>

<style>
	.icon {
		display: inline-block;
		flex: none;
		vertical-align: middle;
	}
</style>
