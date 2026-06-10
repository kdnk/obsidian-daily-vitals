import { normalizePath, TAbstractFile, TFile, Vault } from 'obsidian';
import { getDailyNotePath as getDailyNotePathWithoutNormalization } from './daily-note-path';
import type { DailyVitalsSettings } from './settings-data';

export function getDailyNotePath(date: Date, settings: DailyVitalsSettings): string {
	return normalizePath(getDailyNotePathWithoutNormalization(date, settings));
}

export function getExistingDailyNote(
	vault: Vault,
	date: Date,
	settings: DailyVitalsSettings,
): TFile | null {
	const file = vault.getAbstractFileByPath(getDailyNotePath(date, settings));
	return isTFile(file) ? file : null;
}

function isTFile(file: TAbstractFile | null): file is TFile {
	return file instanceof TFile;
}
