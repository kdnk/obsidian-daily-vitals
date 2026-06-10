const TOKEN_FORMATTERS: Record<string, (date: Date) => string> = {
	YYYY: (date) => String(date.getFullYear()).padStart(4, '0'),
	MM: (date) => String(date.getMonth() + 1).padStart(2, '0'),
	DD: (date) => String(date.getDate()).padStart(2, '0'),
};

export function getTargetDate(today: Date, offsetDays: number): Date {
	const target = new Date(today);
	target.setHours(0, 0, 0, 0);
	target.setDate(target.getDate() - offsetDays);
	return target;
}

export function formatDailyNoteDate(date: Date, format: string): string {
	return Object.entries(TOKEN_FORMATTERS).reduce(
		(result, [token, formatter]) => result.replaceAll(token, formatter(date)),
		format,
	);
}

export function toIsoDate(date: Date): string {
	return formatDailyNoteDate(date, 'YYYY-MM-DD');
}
