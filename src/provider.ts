import type { DailyVitalsFieldKey } from './fields';
import type { DailyVitalsSettings } from './settings-data';

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

export interface JsonHttpClient {
	getJson(url: string, accessToken?: string): Promise<unknown>;
	postJson(url: string, body: unknown, accessToken?: string): Promise<unknown>;
}

export class GoogleHealthNotConnectedError extends Error {
	constructor() {
		super('Google Health account is not connected.');
		this.name = 'GoogleHealthNotConnectedError';
	}
}

export class GoogleHealthRequestError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message);
		this.name = 'GoogleHealthRequestError';
	}
}

export class GoogleHealthProvider implements HealthDataProvider {
	private readonly settings?: DailyVitalsSettings;
	private readonly saveSettings: () => Promise<void>;
	private readonly http: JsonHttpClient;
	private readonly now: () => Date;

	constructor(
		settings?: DailyVitalsSettings,
		saveSettings: () => Promise<void> = async () => undefined,
		http: JsonHttpClient = new MissingJsonHttpClient(),
		now: () => Date = () => new Date(),
	) {
		this.settings = settings;
		this.saveSettings = saveSettings;
		this.http = http;
		this.now = now;
	}

	async fetchDailyMetrics(
		date: string,
		enabledFields: DailyVitalsFieldKey[],
	): Promise<DailyHealthMetrics> {
		const accessToken = await this.getAccessToken();
		const metrics: DailyHealthMetrics = {};

		if (enabledFields.includes('steps')) {
			metrics.steps = await this.fetchSteps(date, accessToken);
		}
		if (enabledFields.includes('sleepMinutes')) {
			metrics.sleepMinutes = await this.fetchSleepMinutes(date, accessToken);
		}
		if (enabledFields.includes('restingHeartRate')) {
			metrics.restingHeartRate = await this.fetchRestingHeartRate(
				date,
				accessToken,
			);
		}
		if (enabledFields.includes('activeCalories')) {
			metrics.activeCalories = await this.fetchActiveCalories(date, accessToken);
		}

		return metrics;
	}

	async listAvailableDates(
		enabledFields: DailyVitalsFieldKey[],
	): Promise<string[]> {
		const settings = this.requireSettings();
		const dates: string[] = [];

		for (let offset = 1; offset <= settings.backfillDays; offset += 1) {
			const date = new Date(this.now());
			date.setHours(0, 0, 0, 0);
			date.setDate(date.getDate() - offset);
			const isoDate = toIsoDate(date);
			const metrics = await this.fetchDailyMetrics(isoDate, enabledFields);
			if (Object.keys(metrics).length > 0) {
				dates.push(isoDate);
			}
		}

		return dates;
	}

	private async fetchSteps(
		date: string,
		accessToken: string,
	): Promise<number | undefined> {
		const response = await this.dailyRollUp('steps', date, accessToken);
		const value = firstRollup(response)?.steps?.countSum;
		return parseInteger(value);
	}

	private async fetchActiveCalories(
		date: string,
		accessToken: string,
	): Promise<number | undefined> {
		const response = await this.dailyRollUp(
			'active-energy-burned',
			date,
			accessToken,
		);
		const value = firstRollup(response)?.activeEnergyBurned?.kcalSum;
		return parseRoundedNumber(value);
	}

	private async fetchSleepMinutes(
		date: string,
		accessToken: string,
	): Promise<number | undefined> {
		const response = await this.listDataPoints('sleep', date, accessToken);
		const total = dataPoints(response)
			.map((dataPoint) => parseInteger(dataPoint.sleep?.summary?.minutesAsleep))
			.filter((value): value is number => value !== undefined)
			.reduce((sum, value) => sum + value, 0);

		return total > 0 ? total : undefined;
	}

	private async fetchRestingHeartRate(
		date: string,
		accessToken: string,
	): Promise<number | undefined> {
		const response = await this.listDataPoints(
			'daily-resting-heart-rate',
			date,
			accessToken,
		);
		const value = dataPoints(response).find(
			(dataPoint) => dataPoint.dailyRestingHeartRate?.beatsPerMinute,
		)?.dailyRestingHeartRate?.beatsPerMinute;

		return parseInteger(value);
	}

	private async dailyRollUp(
		dataType: string,
		date: string,
		accessToken: string,
	): Promise<GoogleHealthRollupResponse> {
		return (await this.http.postJson(
			`https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`,
			{
				range: civilDayRange(date),
				windowSizeDays: 1,
			},
			accessToken,
		)) as GoogleHealthRollupResponse;
	}

	private async listDataPoints(
		dataType: string,
		date: string,
		accessToken: string,
	): Promise<GoogleHealthListResponse> {
		const nextDate = addDays(date, 1);
		const filter = encodeURIComponent(
			`${dataType.replaceAll('-', '_')}.date == "${date}"`,
		);
		const sleepFilter = encodeURIComponent(
			`sleep.interval.civil_start_time >= "${date}T00:00:00" AND sleep.interval.civil_start_time < "${nextDate}T00:00:00"`,
		);
		const query = dataType === 'sleep' ? sleepFilter : filter;

		return (await this.http.getJson(
			`https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints?filter=${query}`,
			accessToken,
		)) as GoogleHealthListResponse;
	}

	private async getAccessToken(): Promise<string> {
		const settings = this.requireSettings();
		const googleHealth = settings.googleHealth;

		if (isUsableAccessToken(googleHealth.accessToken, googleHealth.accessTokenExpiresAt, this.now())) {
			return googleHealth.accessToken;
		}

		if (!googleHealth.refreshToken) {
			if (googleHealth.accessToken) {
				return googleHealth.accessToken;
			}
			throw new GoogleHealthNotConnectedError();
		}
		if (!googleHealth.clientId || !googleHealth.clientSecret) {
			throw new GoogleHealthNotConnectedError();
		}

		const response = (await this.http.postJson(
			'https://oauth2.googleapis.com/token',
			{
				client_id: googleHealth.clientId,
				client_secret: googleHealth.clientSecret,
				refresh_token: googleHealth.refreshToken,
				grant_type: 'refresh_token',
			},
			undefined,
		)) as GoogleTokenResponse;

		if (!response.access_token) {
			throw new GoogleHealthRequestError('Google OAuth did not return an access token.');
		}

		googleHealth.accessToken = response.access_token;
		googleHealth.accessTokenExpiresAt = new Date(
			this.now().getTime() + (response.expires_in ?? 3600) * 1000,
		).toISOString();
		await this.saveSettings();

		return googleHealth.accessToken;
	}

	private requireSettings(): DailyVitalsSettings {
		if (!this.settings) {
			throw new GoogleHealthNotConnectedError();
		}
		return this.settings;
	}
}

interface GoogleTokenResponse {
	access_token?: string;
	expires_in?: number;
}

interface GoogleHealthRollupResponse {
	rollupDataPoints?: GoogleHealthRollupDataPoint[];
}

interface GoogleHealthRollupDataPoint {
	steps?: { countSum?: string };
	activeEnergyBurned?: { kcalSum?: number };
}

interface GoogleHealthListResponse {
	dataPoints?: GoogleHealthDataPoint[];
}

interface GoogleHealthDataPoint {
	sleep?: {
		summary?: {
			minutesAsleep?: string;
		};
	};
	dailyRestingHeartRate?: {
		beatsPerMinute?: string;
	};
}

class MissingJsonHttpClient implements JsonHttpClient {
	async getJson(url: string, accessToken?: string): Promise<unknown> {
		void url;
		void accessToken;
		throw new GoogleHealthRequestError('Google Health HTTP client is not configured.');
	}

	async postJson(
		url: string,
		body: unknown,
		accessToken?: string,
	): Promise<unknown> {
		void url;
		void body;
		void accessToken;
		throw new GoogleHealthRequestError('Google Health HTTP client is not configured.');
	}
}

function civilDayRange(date: string) {
	const start = parseIsoDate(date);
	const end = new Date(start);
	end.setDate(end.getDate() + 1);

	return {
		start: civilDateTime(start),
		end: civilDateTime(end),
	};
}

function civilDateTime(date: Date) {
	return {
		date: {
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			day: date.getDate(),
		},
		time: {
			hours: 0,
			minutes: 0,
			seconds: 0,
		},
	};
}

function parseIsoDate(date: string): Date {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function toIsoDate(date: Date): string {
	const year = String(date.getFullYear()).padStart(4, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function addDays(date: string, days: number): string {
	const parsed = parseIsoDate(date);
	parsed.setDate(parsed.getDate() + days);
	return toIsoDate(parsed);
}

function firstRollup(
	response: GoogleHealthRollupResponse,
): GoogleHealthRollupDataPoint | undefined {
	return response.rollupDataPoints?.[0];
}

function dataPoints(response: GoogleHealthListResponse): GoogleHealthDataPoint[] {
	return response.dataPoints ?? [];
}

function parseInteger(value: unknown): number | undefined {
	if (typeof value !== 'string' && typeof value !== 'number') {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function parseRoundedNumber(value: unknown): number | undefined {
	if (typeof value !== 'number') {
		return undefined;
	}
	return Number.isFinite(value) ? Math.round(value) : undefined;
}

function isUsableAccessToken(
	accessToken: string,
	expiresAt: string,
	now: Date,
): boolean {
	if (!accessToken || !expiresAt) {
		return false;
	}
	return new Date(expiresAt).getTime() - now.getTime() > 60_000;
}
