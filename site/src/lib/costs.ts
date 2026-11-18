import { costModes } from './addon';

/** short names for tight controls; the game's own option text is shown next to them */
export const shortModeLabel: Record<string, string> = {
	both_per_level: 'Per level',
	flat_xp: 'Flat XP',
	flat_essence: 'Flat essence',
	both_flat: 'Both flat'
};

export const modeOptions = costModes.map((m) => ({ value: m.id, label: shortModeLabel[m.id] ?? m.label, full: m.label }));

export function formatNumber(n: number): string {
	return new Intl.NumberFormat('en').format(n);
}
