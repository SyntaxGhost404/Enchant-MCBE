/**
 * Small parsers for the add-on's file formats.
 * Bedrock JSON may contain comments, and .lang files are `key=value` lines with § colour codes.
 */

/** Removes // and block comments that are outside strings, then parses the JSON. */
export function parseJsonc<T = unknown>(text: string): T {
	let out = '';
	let inString = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		const next = text[i + 1];
		if (inString) {
			out += ch;
			if (ch === '\\') {
				out += next ?? '';
				i++;
			} else if (ch === '"') {
				inString = false;
			}
			continue;
		}
		if (ch === '"') {
			inString = true;
			out += ch;
		} else if (ch === '/' && next === '/') {
			while (i < text.length && text[i] !== '\n') i++;
			out += '\n';
		} else if (ch === '/' && next === '*') {
			i += 2;
			while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
			i++;
		} else {
			out += ch;
		}
	}
	return JSON.parse(out) as T;
}

/** Minecraft formatting codes (§a, §l, ...) removed. */
export function stripCodes(text: string): string {
	return text.replace(/§./g, '');
}

/** `key=value` pairs of a .lang file, with formatting codes removed and values trimmed. */
export function parseLang(text: string): Record<string, string> {
	const entries: Record<string, string> = {};
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith('##')) continue;
		const at = line.indexOf('=');
		if (at < 1) continue;
		entries[line.slice(0, at).trim()] = stripCodes(line.slice(at + 1)).replace(/\s*##.*$/, '').trim();
	}
	return entries;
}

/** "1.26.60" as players see it: "26.60". */
export function gameVersionLabel(engine: string): string {
	const parts = engine.split('.');
	return parts[0] === '1' ? parts.slice(1).join('.') : engine;
}
