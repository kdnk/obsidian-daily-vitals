import { requestUrl } from 'obsidian';
import {
	GoogleHealthRequestError,
	type JsonHttpClient,
} from './provider';

export class ObsidianJsonHttpClient implements JsonHttpClient {
	async getJson(url: string, accessToken?: string): Promise<unknown> {
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: buildHeaders(accessToken),
		});
		return response.json;
	}

	async postJson(
		url: string,
		body: unknown,
		accessToken?: string,
	): Promise<unknown> {
		const headers = buildHeaders(accessToken);
		const isTokenRequest = url === 'https://oauth2.googleapis.com/token';

		if (isTokenRequest) {
			headers['Content-Type'] = 'application/x-www-form-urlencoded';
		} else {
			headers['Content-Type'] = 'application/json';
		}

		const response = await requestUrl({
			url,
			method: 'POST',
			headers,
			body: isTokenRequest
				? new URLSearchParams(body as Record<string, string>).toString()
				: JSON.stringify(body),
			throw: false,
		});

		if (response.status < 200 || response.status >= 300) {
			throw new GoogleHealthRequestError(
				`Google Health request failed with HTTP ${response.status}.`,
				response.status,
			);
		}

		return response.json;
	}
}

function buildHeaders(accessToken?: string): Record<string, string> {
	const headers: Record<string, string> = {};
	if (accessToken) {
		headers.Authorization = `Bearer ${accessToken}`;
	}
	return headers;
}
