/**
 * Bug reports: the site fills the GitHub issue form in .github/ISSUE_TEMPLATE/bug_report.yml
 * (field ids must match), or gives the same text to copy.
 */
import { REPO_URL } from './nav';

export interface ReportData {
	title: string;
	happened: string;
	steps: string;
	expected: string;
	device: string;
	game: string;
	addonVersion: string;
	costScaling: string;
	others: string;
	log: string;
}

export const DEVICES = ['Android', 'iPhone or iPad', 'Windows', 'Xbox', 'PlayStation', 'Switch', 'Dedicated server', 'Realm', 'Other'];

/** GitHub refuses very long addresses; past this the content log is left out of the link */
export const MAX_URL = 7000;

export const FIELD_IDS = {
	happened: 'what-happened',
	steps: 'steps',
	expected: 'expected',
	device: 'device',
	game: 'minecraft-version',
	addonVersion: 'addon-version',
	costScaling: 'cost-scaling',
	others: 'other-addons',
	log: 'content-log'
} as const;

export function issueUrl(data: ReportData, withLog = true): string {
	const q = new URLSearchParams({ template: 'bug_report.yml', title: data.title.trim() });
	for (const [key, id] of Object.entries(FIELD_IDS) as [keyof typeof FIELD_IDS, string][]) {
		if (key === 'log' && !withLog) continue;
		const value = data[key].trim();
		if (value) q.set(id, value);
	}
	return `${REPO_URL}/issues/new?${q.toString()}`;
}

export function reportMarkdown(data: ReportData): string {
	const line = (label: string, value: string) => (value.trim() ? `**${label}:** ${value.trim()}\n` : '');
	const block = (label: string, value: string) => (value.trim() ? `\n**${label}:**\n${value.trim()}\n` : '');
	let out = `### ${data.title.trim() || 'Bug report'}\n\n`;
	out += line('Device', data.device) + line('Minecraft', data.game) + line('Enchant+', data.addonVersion) + line('Cost scaling', data.costScaling);
	out += block('What happened', data.happened) + block('Steps', data.steps) + block('Expected', data.expected) + block('Other add-ons', data.others);
	if (data.log.trim()) out += `\n**Content log:**\n\`\`\`\n${data.log.trim()}\n\`\`\`\n`;
	return out;
}
