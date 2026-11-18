<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/Button.svelte';
	import { images } from '$lib/addon/assets';
	import { href } from '$lib/nav';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Page not found' : 'Something went wrong'} · Enchant+</title>
</svelte:head>

<div class="wrap section err">
	<img src={images.tableRender} alt="" width="140" height="140" />
	<p class="eyebrow">Error {page.status}</p>
	<h1>{page.status === 404 ? 'This page is missing' : 'Something went wrong'}</h1>
	<p class="lede">{page.status === 404 ? 'It may have moved. These pages are still here:' : 'Try again, or start from one of these pages:'}</p>
	<div class="links">
		<Button href={href('/')} icon="home">Home</Button>
		<Button href={href('/guide/')} variant="secondary" icon="book">Guide</Button>
		<Button href={href('/download/')} variant="ghost" icon="download">Download</Button>
	</div>
</div>

<style>
	.err {
		text-align: center;
	}

	.err img {
		display: block;
		margin: 0 auto var(--s5);
	}

	.err .lede {
		margin: 0 auto;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--s3);
		margin-top: var(--s6);
	}
</style>
