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
			.setName('Backfill days')
			.setDesc('Maximum past days to check when backfilling existing notes.')
			.addText((text) =>
				text
					.setPlaceholder('30')
					.setValue(String(this.plugin.settings.backfillDays))
					.onChange(async (value) => {
						const parsed = Number(value);
						if (Number.isInteger(parsed) && parsed > 0) {
							this.plugin.settings.backfillDays = parsed;
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

		new Setting(containerEl).setName('Google health').setHeading();

		new Setting(containerEl)
			.setName('Google client ID')
			.setDesc('Google cloud client ID for Google health API access.')
			.addText((text) =>
				text
					.setPlaceholder('Client ID')
					.setValue(this.plugin.settings.googleHealth.clientId)
					.onChange(async (value) => {
						this.plugin.settings.googleHealth.clientId = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Google client secret')
			.setDesc('Google cloud client secret for token refresh.')
			.addText((text) => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('Client secret')
					.setValue(this.plugin.settings.googleHealth.clientSecret)
					.onChange(async (value) => {
						this.plugin.settings.googleHealth.clientSecret = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Refresh token')
			.setDesc('Long-lived refresh token from the Google authorization flow.')
			.addText((text) => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('Refresh token')
					.setValue(this.plugin.settings.googleHealth.refreshToken)
					.onChange(async (value) => {
						this.plugin.settings.googleHealth.refreshToken = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Access token')
			.setDesc('Optional short-lived token. Refresh token is preferred.')
			.addText((text) => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('Access token')
					.setValue(this.plugin.settings.googleHealth.accessToken)
					.onChange(async (value) => {
						this.plugin.settings.googleHealth.accessToken = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Access token expires at')
			.setDesc('Timestamp used to decide when to refresh the access token.')
			.addText((text) =>
				text
					.setPlaceholder('2026-06-10T08:30:00.000Z')
					.setValue(this.plugin.settings.googleHealth.accessTokenExpiresAt)
					.onChange(async (value) => {
						this.plugin.settings.googleHealth.accessTokenExpiresAt = value.trim();
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
