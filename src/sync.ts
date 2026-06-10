import { getEnabledFieldKeys, buildFrontmatterUpdates } from './fields';
import type { HealthDataProvider } from './provider';
import type { DailyVitalsSettings } from './settings-data';
import { toIsoDate } from './date';

export interface FrontmatterFile {
	path: string;
}

export type SyncResult =
	| { status: 'synced'; date: string; path: string; updatedFields: string[] }
	| { status: 'skipped'; reason: 'daily-note-not-found'; date: string }
	| { status: 'skipped'; reason: 'no-enabled-fields'; date: string };

export interface SyncDateOptions {
	date: Date;
	settings: DailyVitalsSettings;
	getDailyNote(date: Date, settings: DailyVitalsSettings): FrontmatterFile | null;
	processFrontMatter(
		file: FrontmatterFile,
		callback: (frontmatter: Record<string, unknown>) => void,
	): Promise<void>;
	provider: HealthDataProvider;
	now(): Date;
}

export async function syncDate(options: SyncDateOptions): Promise<SyncResult> {
	const date = toIsoDate(options.date);
	const file = options.getDailyNote(options.date, options.settings);

	if (!file) {
		return { status: 'skipped', reason: 'daily-note-not-found', date };
	}

	const enabledFields = getEnabledFieldKeys(options.settings.enabledFields);
	if (enabledFields.length === 0) {
		return { status: 'skipped', reason: 'no-enabled-fields', date };
	}

	const metrics = await options.provider.fetchDailyMetrics(date, enabledFields);
	const updates = buildFrontmatterUpdates(options.settings.enabledFields, {
		source: 'google_health',
		date,
		syncedAt: options.now().toISOString(),
		...metrics,
	});
	const updatedFields = Object.keys(updates);

	await options.processFrontMatter(file, (frontmatter) => {
		for (const [key, value] of Object.entries(updates)) {
			frontmatter[key] = value;
		}
	});

	return {
		status: 'synced',
		date,
		path: file.path,
		updatedFields,
	};
}
