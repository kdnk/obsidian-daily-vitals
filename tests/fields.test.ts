import { describe, expect, it } from 'vitest';
import {
	FIELD_DEFINITIONS,
	buildFrontmatterUpdates,
	getEnabledFieldKeys,
} from '../src/fields';
import { DEFAULT_SETTINGS } from '../src/settings-data';

describe('field helpers', () => {
	it('returns only enabled field keys from settings', () => {
		expect(getEnabledFieldKeys(DEFAULT_SETTINGS.enabledFields)).toEqual([
			'date',
			'syncedAt',
			'steps',
			'sleepMinutes',
			'restingHeartRate',
		]);
	});

	it('builds frontmatter updates only for enabled fields with defined data', () => {
		const updates = buildFrontmatterUpdates(
			{
				source: true,
				date: true,
				syncedAt: true,
				steps: true,
				sleepMinutes: true,
				restingHeartRate: false,
				activeCalories: false,
			},
			{
				source: 'google_health',
				date: '2026-06-09',
				syncedAt: '2026-06-10T07:30:00+09:00',
				steps: 8432,
				restingHeartRate: 58,
				activeCalories: 420,
			},
		);

		expect(updates).toEqual({
			[FIELD_DEFINITIONS.source]: 'google_health',
			[FIELD_DEFINITIONS.date]: '2026-06-09',
			[FIELD_DEFINITIONS.syncedAt]: '2026-06-10T07:30:00+09:00',
			[FIELD_DEFINITIONS.steps]: 8432,
		});
	});
});
