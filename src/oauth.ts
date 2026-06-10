import { createHash, randomBytes } from 'crypto';
import { createServer, type Server } from 'http';
import {
	GoogleHealthNotConnectedError,
	GoogleHealthRequestError,
	type JsonHttpClient,
} from './provider';
import type { DailyVitalsSettings } from './settings-data';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALLBACK_HOST = '127.0.0.1';
const CALLBACK_PATH = '/callback';
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

export const GOOGLE_HEALTH_READONLY_SCOPES = [
	'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
	'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
	'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
] as const;

interface BuildAuthUrlOptions {
	clientId: string;
	redirectUri: string;
	state: string;
	codeChallenge: string;
}

interface ExchangeAuthorizationCodeOptions {
	settings: DailyVitalsSettings;
	saveSettings(): Promise<void>;
	http: JsonHttpClient;
	code: string;
	codeVerifier: string;
	redirectUri: string;
	now?: () => Date;
}

interface ConnectGoogleHealthOptions {
	settings: DailyVitalsSettings;
	saveSettings(): Promise<void>;
	http: JsonHttpClient;
	openExternal?: (url: string) => Promise<void>;
	now?: () => Date;
}

interface TokenResponse {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
}

export function buildGoogleHealthAuthUrl(options: BuildAuthUrlOptions): string {
	const url = new URL(GOOGLE_AUTH_URL);
	url.searchParams.set('client_id', options.clientId);
	url.searchParams.set('redirect_uri', options.redirectUri);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', GOOGLE_HEALTH_READONLY_SCOPES.join(' '));
	url.searchParams.set('access_type', 'offline');
	url.searchParams.set('prompt', 'consent');
	url.searchParams.set('state', options.state);
	url.searchParams.set('code_challenge', options.codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	return url.toString();
}

export async function exchangeGoogleAuthorizationCode(
	options: ExchangeAuthorizationCodeOptions,
): Promise<void> {
	const googleHealth = options.settings.googleHealth;
	if (!googleHealth.clientId) {
		throw new GoogleHealthNotConnectedError();
	}

	const body: Record<string, string> = {
		client_id: googleHealth.clientId,
		code: options.code,
		code_verifier: options.codeVerifier,
		grant_type: 'authorization_code',
		redirect_uri: options.redirectUri,
	};

	if (googleHealth.clientSecret) {
		body.client_secret = googleHealth.clientSecret;
	}

	const response = (await options.http.postJson(
		GOOGLE_TOKEN_URL,
		body,
		undefined,
	)) as TokenResponse;

	if (!response.access_token) {
		throw new GoogleHealthRequestError('Google OAuth did not return an access token.');
	}
	if (!response.refresh_token && !googleHealth.refreshToken) {
		throw new GoogleHealthRequestError('Google OAuth did not return a refresh token.');
	}

	googleHealth.accessToken = response.access_token;
	googleHealth.refreshToken = response.refresh_token ?? googleHealth.refreshToken;
	googleHealth.accessTokenExpiresAt = new Date(
		(options.now?.() ?? new Date()).getTime() + (response.expires_in ?? 3600) * 1000,
	).toISOString();

	await options.saveSettings();
}

export async function connectGoogleHealthAccount(
	options: ConnectGoogleHealthOptions,
): Promise<void> {
	const googleHealth = options.settings.googleHealth;
	if (!googleHealth.clientId) {
		throw new GoogleHealthNotConnectedError();
	}

	const codeVerifier = randomBase64Url(64);
	const state = randomBase64Url(32);
	const codeChallenge = sha256Base64Url(codeVerifier);
	const callback = await startLoopbackCallback(state);
	const authUrl = buildGoogleHealthAuthUrl({
		clientId: googleHealth.clientId,
		redirectUri: callback.redirectUri,
		state,
		codeChallenge,
	});

	try {
		await (options.openExternal ?? openInSystemBrowser)(authUrl);
		const code = await callback.waitForCode();
		await exchangeGoogleAuthorizationCode({
			settings: options.settings,
			saveSettings: () => options.saveSettings(),
			http: options.http,
			code,
			codeVerifier,
			redirectUri: callback.redirectUri,
			now: options.now,
		});
	} finally {
		callback.close();
	}
}

function randomBase64Url(byteLength: number): string {
	return randomBytes(byteLength).toString('base64url');
}

function sha256Base64Url(value: string): string {
	return createHash('sha256').update(value).digest('base64url');
}

function startLoopbackCallback(expectedState: string): Promise<{
	redirectUri: string;
	waitForCode(): Promise<string>;
	close(): void;
}> {
	return new Promise((resolve, reject) => {
		let settled = false;
		let server: Server;
		let timeoutId: number;

		const codePromise = new Promise<string>((resolveCode, rejectCode) => {
			server = createServer((request, response) => {
				const requestUrl = new URL(
					request.url ?? '/',
					`http://${request.headers.host ?? CALLBACK_HOST}`,
				);

				if (requestUrl.pathname !== CALLBACK_PATH) {
					response.writeHead(404);
					response.end('Not found');
					return;
				}

				const state = requestUrl.searchParams.get('state');
				const code = requestUrl.searchParams.get('code');
				const error = requestUrl.searchParams.get('error');

				if (state !== expectedState) {
					response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
					response.end('<h1>Daily Vitals connection failed</h1><p>Invalid state.</p>');
					rejectCode(new GoogleHealthRequestError('Google OAuth returned an invalid state.'));
					return;
				}

				if (error) {
					response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
					response.end('<h1>Daily Vitals connection failed</h1><p>You can close this tab.</p>');
					rejectCode(new GoogleHealthRequestError(`Google OAuth failed: ${error}.`));
					return;
				}

				if (!code) {
					response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
					response.end('<h1>Daily Vitals connection failed</h1><p>Missing code.</p>');
					rejectCode(new GoogleHealthRequestError('Google OAuth did not return a code.'));
					return;
				}

				response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				response.end('<h1>Daily Vitals connected</h1><p>You can close this tab.</p>');
				resolveCode(code);
			});

				timeoutId = window.setTimeout(() => {
					rejectCode(new GoogleHealthRequestError('Google OAuth timed out.'));
				}, AUTH_TIMEOUT_MS);
		});

		server!.once('error', (error) => {
			if (!settled) {
				settled = true;
				reject(error);
			}
		});

		server!.listen(0, CALLBACK_HOST, () => {
			const address = server!.address();
			if (!address || typeof address === 'string') {
				reject(new GoogleHealthRequestError('Could not start Google OAuth callback server.'));
				return;
			}

			settled = true;
				resolve({
					redirectUri: `http://${CALLBACK_HOST}:${address.port}${CALLBACK_PATH}`,
					waitForCode: () => codePromise,
					close: () => {
						window.clearTimeout(timeoutId!);
						server!.close();
					},
				});
		});
	});
}

async function openInSystemBrowser(url: string): Promise<void> {
	const electronRequire = (window as Window & {
		require?: (
			moduleName: 'electron',
		) => { shell: { openExternal(url: string): Promise<void> } };
	}).require;

	if (!electronRequire) {
		throw new GoogleHealthRequestError('Could not open the system browser.');
	}

	await electronRequire('electron').shell.openExternal(url);
}
