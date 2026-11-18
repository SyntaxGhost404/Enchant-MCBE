/**
 * Writes a new config.js from the add-on's own file: only the values change, comments and layout stay.
 */
import type { AddonConfig } from './index';

/** the same text with comments and string contents replaced by spaces, so searches only see code */
function mask(text: string): string {
	let out = '';
	let i = 0;
	while (i < text.length) {
		const ch = text[i];
		const next = text[i + 1];
		if (ch === '/' && next === '/') {
			while (i < text.length && text[i] !== '\n') {
				out += ' ';
				i++;
			}
		} else if (ch === '/' && next === '*') {
			const end = text.indexOf('*/', i + 2);
			const stop = end < 0 ? text.length : end + 2;
			out += text.slice(i, stop).replace(/[^\n]/g, ' ');
			i = stop;
		} else if (ch === "'" || ch === '"' || ch === '`') {
			let j = i + 1;
			while (j < text.length && text[j] !== ch) j += text[j] === '\\' ? 2 : 1;
			out += ch + ' '.repeat(Math.max(0, j - i - 1)) + (j < text.length ? ch : '');
			i = j + 1;
		} else {
			out += ch;
			i++;
		}
	}
	return out;
}

export function jsLiteral(value: string | number | boolean): string {
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
	return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`;
}

export function renderConfig(source: string, config: AddonConfig): string {
	let out = source;
	for (const section of Object.keys(config) as (keyof AddonConfig)[]) {
		const masked = mask(out);
		const head = new RegExp(`\\b${section}\\s*:\\s*\\{`).exec(masked);
		if (!head) throw new Error(`config.js has no "${section}" section`);
		const open = head.index + head[0].length - 1;
		let depth = 0;
		let close = -1;
		for (let i = open; i < masked.length; i++) {
			if (masked[i] === '{') depth++;
			else if (masked[i] === '}' && --depth === 0) {
				close = i;
				break;
			}
		}
		if (close < 0) throw new Error(`config.js section "${section}" is not closed`);
		// replace from the end so earlier positions stay valid
		const edits: { start: number; end: number; text: string }[] = [];
		const body = masked.slice(open, close);
		for (const [key, value] of Object.entries(config[section])) {
			const m = new RegExp(`(^|[\\s,{])${key}\\s*:\\s*`).exec(body);
			if (!m) throw new Error(`config.js has no ${section}.${key}`);
			const start = open + m.index + m[0].length;
			let end = start;
			const first = out[start];
			if (first === "'" || first === '"') {
				end = start + 1;
				while (end < out.length && out[end] !== first) end += out[end] === '\\' ? 2 : 1;
				end++;
			} else {
				while (end < close && !/[\s,}]/.test(out[end])) end++;
			}
			edits.push({ start, end, text: jsLiteral(value as string | number | boolean) });
		}
		for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
	}
	return out;
}
