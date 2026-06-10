import { App, PluginSettingTab, Setting } from 'obsidian';
import type { DailyVitalsFieldKey } from './fields';
import type { DailyVitalsSettings } from './settings-data';

export interface DailyVitalsSettingsHost {
	settings: DailyVitalsSettings;
	saveSettings(): Promise<void>;
}

const FIELD_LABELS: Record<DailyVitalsFieldKey, string> = {
	source: 'Source',
	date: 'Date',
	syncedAt: 'Synced at',
	steps: 'Steps',
	sleepMinutes: 'Sleep minutes',
	restingHeartRate: 'Resting heart rate',
	activeCalories: 'Active calories',
};

export class DailyVitalsSettingTab extends PluginSettingTab {
	private readonly plugin: DailyVitalsSettingsHost;

	constructor(app: App, plugin: DailyVitalsSettingsHost) {
		super(app, plugin as never);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Sync').setHeading();

		new Setting(containerEl)
			.setName('Auto sync on startup')
			.setDesc('Sync the target daily note after Obsidian starts.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoSyncOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncOnStartup = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Startup sync delay')
			.setDesc('Seconds to wait after layout is ready before syncing.')
			.addText((text) =>
				text
					.setPlaceholder('10')
					.setValue(String(this.plugin.settings.syncDelaySeconds))
					.onChange(async (value) => {
						const parsed = Number(value);
						if (Number.isFinite(parsed) && parsed >= 0) {
							this.plugin.settings.syncDelaySeconds = parsed;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName('Target offset days')
			.setDesc('Days before today to sync. The default is yesterday.')
			.addText((text) =>
				text
					.setPlaceholder('1')
					.setValue(String(this.plugin.settings.targetOffsetDays))
					.onChange(async (value) => {
						const parsed = Number(value);
						if (Number.isInteger(parsed) && parsed >= 0) {
							this.plugin.settings.targetOffsetDays = parsed;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName('Daily note folder')
			.setDesc('Folder containing daily notes. Leave empty for the vault root.')
			.addText((text) =>
				text
					.setPlaceholder('Daily')
					.setValue(this.plugin.settings.dailyNoteFolder)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFolder = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Daily note format')
			.setDesc('Date format used by daily note filenames.')
			.addText((text) =>
				text
					.setPlaceholder('Yyyy-mm-dd')
					.setValue(this.plugin.settings.dailyNoteFormat)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFormat = value.trim() || 'YYYY-MM-DD';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName('Enabled fields').setHeading();

		for (const key of Object.keys(FIELD_LABELS) as DailyVitalsFieldKey[]) {
			new Setting(containerEl)
				.setName(FIELD_LABELS[key])
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.enabledFields[key])
						.onChange(async (value) => {
							this.plugin.settings.enabledFields[key] = value;
							await this.plugin.saveSettings();
						}),
				);
		}
	}
}
