import { formatDailyNoteDate } from './date';
import type { DailyVitalsSettings } from './settings-data';

export function getDailyNotePath(date: Date, settings: DailyVitalsSettings): string {
	const fileName = `${formatDailyNoteDate(date, settings.dailyNoteFormat)}.md`;
	const folder = settings.dailyNoteFolder.replace(/^\/+|\/+$/g, '');
	return folder ? `${folder}/${fileName}` : fileName;
}
