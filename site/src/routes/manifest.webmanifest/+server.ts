import { base } from '$app/paths';

export const prerender = true;
export const trailingSlash = 'never';

export function GET() {
	const manifest = {
		name: 'Enchant+ for Minecraft: Bedrock Edition',
		short_name: 'Enchant+',
		description: 'Guide, downloads and price calculator for the Enchant+ add-on.',
		start_url: `${base}/`,
		scope: `${base}/`,
		display: 'standalone',
		background_color: '#131210',
		theme_color: '#131210',
		icons: [
			{ src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
			{ src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
			{ src: `${base}/icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
		]
	};
	return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/manifest+json' } });
}
