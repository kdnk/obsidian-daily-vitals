import { describe, expect, it, vi } from 'vitest';
import { GoogleHealthProvider } from '../src/provider';
import { DEFAULT_SETTINGS, type DailyVitalsSettings } from '../src/settings-data';

function makeSettings(
	googleHealth: Partial<DailyVitalsSettings['googleHealth']>,
): DailyVitalsSettings {
	return {
		...DEFAULT_SETTINGS,
		googleHealth: {
			...DEFAULT_SETTINGS.googleHealth,
			...googleHealth,
		},
	};
}

describe('GoogleHealthProvider', () => {
	it('refreshes an expired token before fetching daily metrics', async () => {
		const settings = makeSettings({
			clientId: 'client-id',
			clientSecret: 'client-secret',
			refreshToken: 'refresh-token',
			accessToken: 'old-token',
			accessTokenExpiresAt: '2026-06-10T00:00:00.000Z',
		});
		const saveSettings = vi.fn();
		const postJson = vi
			.fn()
			.mockResolvedValueOnce({
				access_token: 'new-token',
				expires_in: 3600,
			})
			.mockResolvedValueOnce({
				rollupDataPoints: [{ steps: { countSum: '8432' } }],
			});
		const getJson = vi.fn();

		const provider = new GoogleHealthProvider(settings, saveSettings, {
			getJson,
			postJson,
		}, () => new Date('2026-06-10T07:30:00.000Z'));

		const metrics = await provider.fetchDailyMetrics('2026-06-09', ['steps']);

		expect(metrics.steps).toBe(8432);
		expect(settings.googleHealth.accessToken).toBe('new-token');
		expect(settings.googleHealth.accessTokenExpiresAt).toBe(
			'2026-06-10T08:30:00.000Z',
		);
		expect(saveSettings).toHaveBeenCalledOnce();
		expect(postJson).toHaveBeenNthCalledWith(
			1,
			'https://oauth2.googleapis.com/token',
			expect.objectContaining({
				grant_type: 'refresh_token',
				refresh_token: 'refresh-token',
			}),
			undefined,
		);
		expect(postJson).toHaveBeenNthCalledWith(
			2,
			'https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp',
			expect.objectContaining({
				range: {
					start: {
						date: { year: 2026, month: 6, day: 9 },
						time: { hours: 0, minutes: 0, seconds: 0 },
					},
					end: {
						date: { year: 2026, month: 6, day: 10 },
						time: { hours: 0, minutes: 0, seconds: 0 },
					},
				},
				windowSizeDays: 1,
			}),
			'new-token',
		);
	});

	it('maps enabled Google Health metrics into Daily Vitals metrics', async () => {
		const settings = makeSettings({
			accessToken: 'access-token',
			accessTokenExpiresAt: '2026-06-10T08:30:00.000Z',
		});
		const postJson = vi
			.fn()
			.mockResolvedValueOnce({
				rollupDataPoints: [{ steps: { countSum: '8432' } }],
			})
			.mockResolvedValueOnce({
				rollupDataPoints: [{ activeEnergyBurned: { kcalSum: 420.4 } }],
			});
		const getJson = vi
			.fn()
			.mockResolvedValueOnce({
				dataPoints: [
					{ sleep: { summary: { minutesAsleep: '390' } } },
					{ sleep: { summary: { minutesAsleep: '12' } } },
				],
			})
			.mockResolvedValueOnce({
				dataPoints: [
					{ dailyRestingHeartRate: { beatsPerMinute: '58' } },
				],
			});

		const provider = new GoogleHealthProvider(settings, vi.fn(), {
			getJson,
			postJson,
		}, () => new Date('2026-06-10T07:30:00.000Z'));

		await expect(
			provider.fetchDailyMetrics('2026-06-09', [
				'steps',
				'sleepMinutes',
				'restingHeartRate',
				'activeCalories',
			]),
		).resolves.toEqual({
			steps: 8432,
			sleepMinutes: 402,
			restingHeartRate: 58,
			activeCalories: 420,
		});
		expect(getJson.mock.calls[0]?.[0]).toContain(
			'/v4/users/me/dataTypes/sleep/dataPoints?',
		);
		expect(getJson.mock.calls[1]?.[0]).toContain(
			'/v4/users/me/dataTypes/daily-resting-heart-rate/dataPoints?',
		);
	});
});
