// Checks the built site against the house rules:
//  1. visible text and text attributes contain no em dash, en dash or other dash characters, no spaced
//     hyphen used as punctuation, and no emoji;
//  2. the stylesheets use no purple, violet, pink or electric blue.
// Runs after `vite build`; exits with an error listing every problem.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const build = fileURLToPath(new URL('../build', import.meta.url));
const files = [];
(function walk(dir) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p);
		else files.push(p);
	}
})(build);

const problems = [];
const DASHES = /[‒–—―−﹘﹣－]/;
const SPACED_HYPHEN = /(^|\s)-(\s|$)/;
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;

function decode(text) {
	return text
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&#x27;/g, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function checkText(file, where, text) {
	const t = decode(text);
	if (DASHES.test(t)) problems.push(`${file}: dash character in ${where}: "${t.trim().slice(0, 80)}"`);
	if (SPACED_HYPHEN.test(t)) problems.push(`${file}: spaced hyphen used as a dash in ${where}: "${t.trim().slice(0, 80)}"`);
	if (EMOJI.test(t)) problems.push(`${file}: emoji in ${where}: "${t.trim().slice(0, 80)}"`);
}

for (const file of files.filter((f) => f.endsWith('.html'))) {
	const rel = relative(build, file);
	const html = readFileSync(file, 'utf8');
	// code samples are shown as written; everything else is copy
	const body = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<(pre|code)[\s\S]*?<\/\1>/gi, ' ');
	for (const m of body.matchAll(/>([^<]+)</g)) if (m[1].trim()) checkText(rel, 'text', m[1]);
	for (const m of body.matchAll(/\s(alt|title|aria-label|placeholder|content)="([^"]*)"/g)) {
		if (m[1] === 'content' && /^(width=|#|dark|light|website|https?:)/.test(m[2])) continue;
		checkText(rel, m[1], m[2]);
	}
}

for (const file of files.filter((f) => f.endsWith('.js'))) {
	const text = readFileSync(file, 'utf8');
	const rel = relative(build, file);
	if (/[–—]/.test(text)) problems.push(`${rel}: dash character in a script`);
	if (EMOJI.test(text)) problems.push(`${rel}: emoji in a script`);
}

// ---- colours ----
function hexToRgb(hex) {
	let h = hex.slice(1);
	if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function hsl([r, g, b]) {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h;
	if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
	else if (max === g) h = (b - r) / d + 2;
	else h = (r - g) / d + 4;
	return [h * 60, s, l];
}

function banned(rgb) {
	const [h, s, l] = hsl(rgb);
	if (l < 0.12 || l > 0.94 || s < 0.22) return false;
	if (h >= 255 && h <= 340) return 'purple, violet or pink';
	if (h >= 195 && h < 255 && s > 0.55 && l > 0.35) return 'bright blue';
	return false;
}

for (const file of files.filter((f) => f.endsWith('.css') || f.endsWith('.html'))) {
	const rel = relative(build, file);
	let css = readFileSync(file, 'utf8');
	if (file.endsWith('.html')) css = [...css.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
	css = css.replace(/url\([^)]*\)/g, '');
	for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
		if (![4, 5, 7, 9].includes(m[0].length)) continue;
		const why = banned(hexToRgb(m[0]));
		if (why) problems.push(`${rel}: ${why} colour ${m[0]}`);
	}
	for (const m of css.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/g)) {
		const why = banned([+m[1], +m[2], +m[3]]);
		if (why) problems.push(`${rel}: ${why} colour ${m[0]})`);
	}
	for (const m of css.matchAll(/:\s*(purple|violet|magenta|fuchsia|pink|hotpink|deeppink|blue|dodgerblue|royalblue|blueviolet|mediumpurple|orchid|plum)\b/gi)) {
		problems.push(`${rel}: named colour ${m[1]}`);
	}
}

if (problems.length) {
	console.error(`Site check failed (${problems.length}):\n` + [...new Set(problems)].join('\n'));
	process.exit(1);
}
console.log(`Site check passed: ${files.filter((f) => f.endsWith('.html')).length} pages, no dashes, emoji or banned colours.`);
