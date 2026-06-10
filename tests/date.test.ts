import { describe, expect, it } from 'vitest';
import { formatDailyNoteDate, getTargetDate } from '../src/date';

describe('date helpers', () => {
	it('formats Daily Note dates with the default YYYY-MM-DD format', () => {
		const date = new Date(2026, 5, 9, 15, 30, 0);

		expect(formatDailyNoteDate(date, 'YYYY-MM-DD')).toBe('2026-06-09');
	});

	it('computes the target date using the configured day offset', () => {
		const today = new Date(2026, 5, 10, 8, 0, 0);

		expect(formatDailyNoteDate(getTargetDate(today, 1), 'YYYY-MM-DD')).toBe(
			'2026-06-09',
		);
		expect(formatDailyNoteDate(getTargetDate(today, 7), 'YYYY-MM-DD')).toBe(
			'2026-06-03',
		);
	});
});
