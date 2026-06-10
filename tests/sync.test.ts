import { describe, expect, it, vi } from 'vitest';
import { syncDate } from '../src/sync';
import type { DailyVitalsSettings } from '../src/settings-data';
import { DEFAULT_SETTINGS } from '../src/settings-data';

function makeSettings(
	overrides: Partial<DailyVitalsSettings> = {},
): DailyVitalsSettings {
	return {
		...DEFAULT_SETTINGS,
		...overrides,
		enabledFields: {
			...DEFAULT_SETTINGS.enabledFields,
			...overrides.enabledFields,
		},
	};
}

describe('syncDate', () => {
	it('skips without creating a Daily Note when the target note does not exist', async () => {
		const getDailyNote = vi.fn().mockReturnValue(null);
		const fetchDailyMetrics = vi.fn();
		const listAvailableDates = vi.fn();
		const processFrontMatter = vi.fn();

		const result = await syncDate({
			date: new Date(2026, 5, 9),
			settings: makeSettings(),
			getDailyNote,
			processFrontMatter,
			provider: { fetchDailyMetrics, listAvailableDates },
			now: () => new Date(2026, 5, 10, 7, 30),
		});

		expect(result).toEqual({
			status: 'skipped',
			reason: 'daily-note-not-found',
			date: '2026-06-09',
		});
		expect(fetchDailyMetrics).not.toHaveBeenCalled();
		expect(processFrontMatter).not.toHaveBeenCalled();
	});

	it('updates only enabled fields and preserves existing disabled fields', async () => {
		const file = { path: 'daily/2026-06-09.md' };
		const frontmatter: Record<string, unknown> = {
			mood: 'good',
			daily_vitals_active_calories: 420,
		};
		const processFrontMatter = vi.fn(
			async (
				_file: { path: string },
				callback: (data: Record<string, unknown>) => void,
			) => {
				callback(frontmatter);
			},
		);

		const result = await syncDate({
			date: new Date(2026, 5, 9),
			settings: makeSettings({
				enabledFields: {
					source: false,
					date: true,
					syncedAt: true,
					steps: true,
					sleepMinutes: false,
					restingHeartRate: true,
					activeCalories: false,
				},
			}),
			getDailyNote: vi.fn().mockReturnValue(file),
			processFrontMatter,
			provider: {
				fetchDailyMetrics: vi.fn().mockResolvedValue({
					steps: 8432,
					sleepMinutes: 402,
					restingHeartRate: 58,
					activeCalories: 500,
				}),
				listAvailableDates: vi.fn(),
			},
			now: () => new Date(2026, 5, 10, 7, 30),
		});

		expect(result.status).toBe('synced');
		expect(frontmatter).toMatchObject({
			mood: 'good',
			daily_vitals_active_calories: 420,
			daily_vitals_date: '2026-06-09',
			daily_vitals_steps: 8432,
			daily_vitals_resting_heart_rate: 58,
		});
		expect(frontmatter).not.toHaveProperty('daily_vitals_sleep_minutes');
		expect(frontmatter).not.toHaveProperty('daily_vitals_source');
	});

	it('does not overwrite existing fields when provider returns no data for them', async () => {
		const file = { path: '2026-06-09.md' };
		const frontmatter: Record<string, unknown> = {
			daily_vitals_steps: 8120,
			daily_vitals_sleep_minutes: 390,
		};

		await syncDate({
			date: new Date(2026, 5, 9),
			settings: makeSettings(),
			getDailyNote: vi.fn().mockReturnValue(file),
			processFrontMatter: vi.fn(
				async (
					_file: { path: string },
					callback: (data: Record<string, unknown>) => void,
				) => {
					callback(frontmatter);
				},
			),
			provider: {
				fetchDailyMetrics: vi.fn().mockResolvedValue({
					steps: 8432,
				}),
				listAvailableDates: vi.fn(),
			},
			now: () => new Date(2026, 5, 10, 7, 30),
		});

		expect(frontmatter.daily_vitals_steps).toBe(8432);
		expect(frontmatter.daily_vitals_sleep_minutes).toBe(390);
	});
});
