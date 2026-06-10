import type { EnabledFields } from './fields';

export interface DailyVitalsSettings {
	autoSyncOnStartup: boolean;
	syncDelaySeconds: number;
	targetOffsetDays: number;
	dailyNoteFolder: string;
	dailyNoteFormat: string;
	enabledFields: EnabledFields;
}

export const DEFAULT_SETTINGS: DailyVitalsSettings = {
	autoSyncOnStartup: true,
	syncDelaySeconds: 10,
	targetOffsetDays: 1,
	dailyNoteFolder: '',
	dailyNoteFormat: 'YYYY-MM-DD',
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
		enabledFields: {
			...DEFAULT_SETTINGS.enabledFields,
			...saved?.enabledFields,
		},
	};
}
