import { guidePages, SITE_URL } from '$lib/nav';

export const prerender = true;
export const trailingSlash = 'never';

export function GET() {
	const paths = ['', 'guide/', ...guidePages.map((g) => `guide/${g.slug}/`), 'download/', 'changelog/', 'compatibility/', 'help/', 'report/'];
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		paths.map((p) => `\t<url><loc>${SITE_URL}${p}</loc></url>`).join('\n') +
		'\n</urlset>\n';
	return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
