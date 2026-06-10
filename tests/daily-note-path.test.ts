import { describe, expect, it } from 'vitest';
import { getDailyNotePath } from '../src/daily-note-path';
import { DEFAULT_SETTINGS } from '../src/settings-data';

describe('daily note path helpers', () => {
	it('builds root Daily Note paths from the configured format', () => {
		expect(getDailyNotePath(new Date(2026, 5, 9), DEFAULT_SETTINGS)).toBe(
			'2026-06-09.md',
		);
	});

	it('builds folder Daily Note paths without creating files', () => {
		expect(
			getDailyNotePath(new Date(2026, 5, 9), {
				...DEFAULT_SETTINGS,
				dailyNoteFolder: '/daily/',
			}),
		).toBe('daily/2026-06-09.md');
	});
});
