/**
 * The changelog page reads CHANGELOG.md from the repository root.
 * Format: "## <version>", optional "Key: value" lines, "### <group>" headings and "- " items.
 */
import changelogText from '$repo/CHANGELOG.md?raw';

export interface ChangeGroup {
	title: string;
	/** items as safe HTML (inline code, bold and links only) */
	items: string[];
}

export interface Release {
	version: string;
	facts: Record<string, string>;
	groups: ChangeGroup[];
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Inline Markdown subset: `code`, **bold** and [text](https://...). */
export function inlineMarkdown(text: string): string {
	return escapeHtml(text)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

export function parseChangelog(text: string): Release[] {
	const releases: Release[] = [];
	let release: Release | undefined;
	let group: ChangeGroup | undefined;
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trimEnd();
		if (line.startsWith('## ')) {
			release = { version: line.slice(3).trim(), facts: {}, groups: [] };
			group = undefined;
			releases.push(release);
		} else if (!release) {
			continue;
		} else if (line.startsWith('### ')) {
			group = { title: line.slice(4).trim(), items: [] };
			release.groups.push(group);
		} else if (line.startsWith('- ')) {
			if (!group) {
				group = { title: '', items: [] };
				release.groups.push(group);
			}
			group.items.push(inlineMarkdown(line.slice(2).trim()));
		} else if (/^[A-Z][\w ]*: /.test(line) && !group) {
			const at = line.indexOf(': ');
			release.facts[line.slice(0, at)] = line.slice(at + 2).trim();
		}
	}
	return releases;
}

export const releases: Release[] = parseChangelog(changelogText);
