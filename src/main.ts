import { Notice, Plugin } from 'obsidian';
import { getTargetDate } from './date';
import { getExistingDailyNote } from './daily-notes';
import { getEnabledFieldKeys } from './fields';
import {
	GoogleHealthNotConnectedError,
	GoogleHealthProvider,
	type HealthDataProvider,
} from './provider';
import {
	DailyVitalsSettingTab,
} from './settings';
import { mergeSettings, type DailyVitalsSettings } from './settings-data';
import { syncDate, type SyncResult } from './sync';

export default class DailyVitalsPlugin extends Plugin {
	settings!: DailyVitalsSettings;
	private provider: HealthDataProvider = new GoogleHealthProvider();

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'sync-yesterday-now',
			name: 'Sync yesterday now',
			callback: () => {
				void this.syncYesterday(true);
			},
		});

		this.addCommand({
			id: 'backfill-existing-notes',
			name: 'Backfill existing notes',
			callback: () => {
				void this.backfillExistingNotes();
			},
		});

		this.addSettingTab(new DailyVitalsSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			if (!this.settings.autoSyncOnStartup) {
				return;
			}

			const timeoutId = window.setTimeout(() => {
				void this.syncYesterday(false);
			}, this.settings.syncDelaySeconds * 1000);

			this.register(() => window.clearTimeout(timeoutId));
		});
	}

	async loadSettings() {
		this.settings = mergeSettings(
			(await this.loadData()) as Partial<DailyVitalsSettings> | null,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async syncYesterday(showSuccessNotice: boolean): Promise<SyncResult | null> {
		const targetDate = getTargetDate(new Date(), this.settings.targetOffsetDays);
		return await this.syncSingleDate(targetDate, showSuccessNotice);
	}

	private async backfillExistingNotes(): Promise<void> {
		try {
			const enabledFields = getEnabledFieldKeys(this.settings.enabledFields);
			const dates = await this.provider.listAvailableDates(enabledFields);
			let syncedCount = 0;

			for (const date of dates) {
				const result = await this.syncSingleDate(new Date(`${date}T00:00:00`), false);
				if (result?.status === 'synced') {
					syncedCount += 1;
				}
			}

			new Notice(`Daily Vitals backfill complete. Synced ${syncedCount} notes.`);
		} catch (error) {
			this.showSyncError(error);
		}
	}

	private async syncSingleDate(
		date: Date,
		showSuccessNotice: boolean,
	): Promise<SyncResult | null> {
		try {
			const result = await syncDate({
				date,
				settings: this.settings,
				getDailyNote: (targetDate, settings) =>
					getExistingDailyNote(this.app.vault, targetDate, settings),
				processFrontMatter: (file, callback) =>
					this.app.fileManager.processFrontMatter(file as never, callback),
				provider: this.provider,
				now: () => new Date(),
			});

			this.showSyncResult(result, showSuccessNotice);
			return result;
		} catch (error) {
			this.showSyncError(error);
			return null;
		}
	}

	private showSyncResult(result: SyncResult, showSuccessNotice: boolean): void {
		if (result.status === 'synced') {
			if (showSuccessNotice) {
				new Notice(`Daily Vitals synced ${result.date}.`);
			}
			return;
		}

		if (result.reason === 'daily-note-not-found') {
			new Notice(`Daily Note for ${result.date} not found. Skipped.`);
			return;
		}

		new Notice('Daily vitals has no enabled fields. Skipped.');
	}

	private showSyncError(error: unknown): void {
		if (error instanceof GoogleHealthNotConnectedError) {
			new Notice('Connect your Google health account before syncing daily vitals.');
			return;
		}

		new Notice('Daily vitals could not update frontmatter. Skipped.');
		console.error(error);
	}
}
