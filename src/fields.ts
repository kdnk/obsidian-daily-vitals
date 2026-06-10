export const FIELD_DEFINITIONS = {
	source: 'daily_vitals_source',
	date: 'daily_vitals_date',
	syncedAt: 'daily_vitals_synced_at',
	steps: 'daily_vitals_steps',
	sleepMinutes: 'daily_vitals_sleep_minutes',
	restingHeartRate: 'daily_vitals_resting_heart_rate',
	activeCalories: 'daily_vitals_active_calories',
} as const;

export type DailyVitalsFieldKey = keyof typeof FIELD_DEFINITIONS;

export interface EnabledFields {
	source: boolean;
	date: boolean;
	syncedAt: boolean;
	steps: boolean;
	sleepMinutes: boolean;
	restingHeartRate: boolean;
	activeCalories: boolean;
}

export interface DailyVitalsFrontmatterData {
	source?: 'google_health';
	date?: string;
	syncedAt?: string;
	steps?: number;
	sleepMinutes?: number;
	restingHeartRate?: number;
	activeCalories?: number;
}

export function getEnabledFieldKeys(
	enabledFields: EnabledFields,
): DailyVitalsFieldKey[] {
	return (Object.keys(FIELD_DEFINITIONS) as DailyVitalsFieldKey[]).filter(
		(key) => enabledFields[key],
	);
}

export function buildFrontmatterUpdates(
	enabledFields: EnabledFields,
	data: DailyVitalsFrontmatterData,
): Record<string, string | number> {
	const updates: Record<string, string | number> = {};

	for (const key of getEnabledFieldKeys(enabledFields)) {
		const value = data[key];
		if (value !== undefined && value !== null) {
			updates[FIELD_DEFINITIONS[key]] = value;
		}
	}

	return updates;
}
