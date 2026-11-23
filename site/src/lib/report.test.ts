import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FIELD_IDS, issueUrl, reportMarkdown, type ReportData } from './report';

const data: ReportData = {
	title: 'Sphere missing',
	happened: 'The sphere vanished',
	steps: '1. Place table',
	expected: 'A sphere',
	device: 'Android',
	game: '26.60',
	addonVersion: '1.1.1',
	costScaling: 'Both XP and essence scale per level (default)',
	others: '',
	log: '[Scripting] ok'
};

describe('bug reports', () => {
	it('fills every field of the GitHub issue form', () => {
		const form = readFileSync(new URL('../../../.github/ISSUE_TEMPLATE/bug_report.yml', import.meta.url), 'utf8');
		for (const id of Object.values(FIELD_IDS)) expect(form).toContain(`id: ${id}`);
		const url = new URL(issueUrl(data));
		expect(url.searchParams.get('template')).toBe('bug_report.yml');
		expect(url.searchParams.get('title')).toBe('Sphere missing');
		expect(url.searchParams.get('device')).toBe('Android');
		expect(url.searchParams.get('content-log')).toBe('[Scripting] ok');
		expect(url.searchParams.has('other-addons')).toBe(false);
		expect(new URL(issueUrl(data, false)).searchParams.has('content-log')).toBe(false);
	});

	it('writes a readable report', () => {
		const md = reportMarkdown(data);
		expect(md).toContain('### Sphere missing');
		expect(md).toContain('**Device:** Android');
		expect(md).toContain('```\n[Scripting] ok\n```');
		expect(md).not.toContain('Other add-ons');
	});
});
