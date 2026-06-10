import type { DailyVitalsFieldKey } from './fields';

export interface DailyHealthMetrics {
	steps?: number;
	sleepMinutes?: number;
	restingHeartRate?: number;
	activeCalories?: number;
}

export interface HealthDataProvider {
	fetchDailyMetrics(
		date: string,
		enabledFields: DailyVitalsFieldKey[],
	): Promise<DailyHealthMetrics>;
	listAvailableDates(enabledFields: DailyVitalsFieldKey[]): Promise<string[]>;
}

export class GoogleHealthNotConnectedError extends Error {
	constructor() {
		super('Google Health account is not connected.');
		this.name = 'GoogleHealthNotConnectedError';
	}
}

export class GoogleHealthProvider implements HealthDataProvider {
	async fetchDailyMetrics(): Promise<DailyHealthMetrics> {
		throw new GoogleHealthNotConnectedError();
	}

	async listAvailableDates(): Promise<string[]> {
		throw new GoogleHealthNotConnectedError();
	}
}
