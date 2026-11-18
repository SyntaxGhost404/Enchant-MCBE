import { describe, expect, it } from 'vitest';
import { defaultConfig, type AddonConfig } from './index';
import { configSource } from './configSource';
import { jsLiteral, renderConfig } from './configFile';

function evaluate(code: string): AddonConfig {
	return new Function(code.replace('export const config =', 'return'))() as AddonConfig;
}

describe('config.js writer', () => {
	it('gives back the same file for the default values', () => {
		expect(renderConfig(configSource, defaultConfig)).toBe(configSource);
	});

	it('changes only the values', () => {
		const next: AddonConfig = JSON.parse(JSON.stringify(defaultConfig));
		next.xp.xp_remove = 5;
		next.xp.refund = 0.25;
		next.items.state = false;
		next.items.name = "Bob's \\ essence\nline two";
		next.scores.state = true;
		next.scores.score_name = 'coins';
		const out = renderConfig(configSource, next);
		expect(evaluate(out)).toEqual(next);
		// comments are untouched
		expect(out.split('\n').filter((l) => l.includes('*')).join('\n')).toBe(configSource.split('\n').filter((l) => l.includes('*')).join('\n'));
		expect(out.split('\n').length).toBe(configSource.split('\n').length);
	});

	it('writes safe literals', () => {
		expect(jsLiteral("it's")).toBe("'it\\'s'");
		expect(jsLiteral('a\nb')).toBe("'a\\nb'");
		expect(jsLiteral(Number.NaN)).toBe('0');
		expect(jsLiteral(true)).toBe('true');
	});
});
