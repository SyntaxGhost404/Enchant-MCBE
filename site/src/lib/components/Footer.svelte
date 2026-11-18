<script lang="ts">
	import { images } from '$lib/addon/assets';
	import { addon } from '$lib/addon';
	import { guidePages, guidePath, href, ORIGINAL_URL, REPO_URL } from '$lib/nav';
</script>

<footer class="footer">
	<div class="wrap grid">
		<div class="about">
			<a class="brand" href={href('/')}>
				<img src={images.tableRender} alt="" width="40" height="40" />
				<span>Enchant+</span>
			</a>
			<p class="muted small">Version {addon.version} for Minecraft: Bedrock Edition {addon.minGame} and newer.</p>
		</div>
		<nav aria-label="Guide pages" class="col">
			<h2>Guide</h2>
			<ul>
				{#each guidePages as g (g.slug)}
					<li><a href={href(guidePath(g.slug))}>{g.title}</a></li>
				{/each}
			</ul>
		</nav>
		<nav aria-label="Project" class="col">
			<h2>Project</h2>
			<ul>
				<li><a href={href('/download/')}>Download</a></li>
				<li><a href={href('/changelog/')}>Changelog</a></li>
				<li><a href={href('/compatibility/')}>Compatibility</a></li>
				<li><a href={href('/report/')}>Report a bug</a></li>
				<li><a href={REPO_URL} rel="noopener">Source code</a></li>
			</ul>
		</nav>
		<div class="credits col">
			<h2>Credits</h2>
			<p class="small muted">
				Enchant+ was created by <a href={ORIGINAL_URL} rel="noopener">Death_Aruban</a>, including its models, textures and menu design. Version
				{addon.version} updates it for Minecraft {addon.minGame}.
			</p>
			<p class="small muted">Minecraft textures come from Mojang's sample resource pack. Icons by pixelarticons. <a href={href('/licenses.txt')}>Licenses</a></p>
		</div>
	</div>
	<div class="wrap legal">
		<p class="small">Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</p>
	</div>
</footer>

<style>
	.footer {
		margin-top: var(--s9);
		border-top: 1px solid var(--line);
		background: var(--bg-2);
		padding: var(--s8) 0 calc(var(--tabbar) + var(--safe-bottom) + var(--s5));
	}

	@media (min-width: 960px) {
		.footer {
			padding-bottom: var(--s6);
		}
	}

	.grid {
		display: grid;
		gap: var(--s6);
		grid-template-columns: 1fr 1fr;
	}

	.about,
	.credits {
		grid-column: 1 / -1;
	}

	@media (min-width: 900px) {
		.grid {
			grid-template-columns: 1.2fr 1fr 1fr 1.6fr;
		}
		.about,
		.credits {
			grid-column: auto;
		}
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--text);
		text-decoration: none;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.25rem;
		margin-bottom: var(--s2);
	}

	h2 {
		font-size: var(--fs-sm);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-3);
		margin-bottom: var(--s3);
		font-family: var(--font-ui);
		font-weight: 700;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	li {
		margin: 0;
	}

	.col a {
		display: inline-block;
		padding: 5px 0;
		color: var(--text-2);
		text-decoration: none;
	}

	.col a:hover {
		color: var(--text);
		text-decoration: underline;
	}

	.credits a {
		padding: 0;
		color: var(--text);
		text-decoration: underline;
	}

	.legal {
		margin-top: var(--s7);
		padding-top: var(--s4);
		border-top: 1px solid var(--line);
		color: var(--text-3);
	}

	.legal p {
		margin: 0;
	}
</style>
