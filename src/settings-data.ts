import type { EnabledFields } from './fields';

export interface DailyVitalsSettings {
	autoSyncOnStartup: boolean;
	syncDelaySeconds: number;
	targetOffsetDays: number;
	backfillDays: number;
	dailyNoteFolder: string;
	dailyNoteFormat: string;
	googleHealth: GoogleHealthSettings;
	enabledFields: EnabledFields;
}

export interface GoogleHealthSettings {
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	accessToken: string;
	accessTokenExpiresAt: string;
}

export const DEFAULT_SETTINGS: DailyVitalsSettings = {
	autoSyncOnStartup: true,
	syncDelaySeconds: 10,
	targetOffsetDays: 1,
	backfillDays: 30,
	dailyNoteFolder: '',
	dailyNoteFormat: 'YYYY-MM-DD',
	googleHealth: {
		clientId: '',
		clientSecret: '',
		refreshToken: '',
		accessToken: '',
		accessTokenExpiresAt: '',
	},
	enabledFields: {
		source: false,
		date: true,
		syncedAt: true,
		steps: true,
		sleepMinutes: true,
		restingHeartRate: true,
		activeCalories: false,
	},
};

export function mergeSettings(
	saved: Partial<DailyVitalsSettings> | null | undefined,
): DailyVitalsSettings {
	return {
		...DEFAULT_SETTINGS,
		...saved,
		googleHealth: {
			...DEFAULT_SETTINGS.googleHealth,
			...saved?.googleHealth,
		},
		enabledFields: {
			...DEFAULT_SETTINGS.enabledFields,
			...saved?.enabledFields,
		},
	};
}
