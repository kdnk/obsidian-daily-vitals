import { describe, expect, it, vi } from 'vitest';
import {
	GOOGLE_HEALTH_READONLY_SCOPES,
	buildGoogleHealthAuthUrl,
	exchangeGoogleAuthorizationCode,
} from '../src/oauth';
import { DEFAULT_SETTINGS } from '../src/settings-data';

describe('Google Health authorization', () => {
	it('builds a Google auth URL for desktop consent with PKCE', () => {
		const url = new URL(
			buildGoogleHealthAuthUrl({
				clientId: 'client-id',
				redirectUri: 'http://127.0.0.1:43210/callback',
				state: 'state-value',
				codeChallenge: 'challenge-value',
			}),
		);

		expect(url.origin + url.pathname).toBe(
			'https://accounts.google.com/o/oauth2/v2/auth',
		);
		expect(url.searchParams.get('client_id')).toBe('client-id');
		expect(url.searchParams.get('redirect_uri')).toBe(
			'http://127.0.0.1:43210/callback',
		);
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('access_type')).toBe('offline');
		expect(url.searchParams.get('prompt')).toBe('consent');
		expect(url.searchParams.get('state')).toBe('state-value');
		expect(url.searchParams.get('code_challenge')).toBe('challenge-value');
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('scope')).toBe(
			GOOGLE_HEALTH_READONLY_SCOPES.join(' '),
		);
	});

	it('exchanges an authorization code and stores Google Health tokens', async () => {
		const settings = {
			...DEFAULT_SETTINGS,
			googleHealth: {
				...DEFAULT_SETTINGS.googleHealth,
				clientId: 'client-id',
				clientSecret: 'client-secret',
			},
		};
		const saveSettings = vi.fn();
		const postJson = vi.fn().mockResolvedValue({
			access_token: 'access-token',
			refresh_token: 'refresh-token',
			expires_in: 3600,
		});

		await exchangeGoogleAuthorizationCode({
			settings,
			saveSettings,
			http: {
				getJson: vi.fn(),
				postJson,
			},
			code: 'authorization-code',
			codeVerifier: 'code-verifier',
			redirectUri: 'http://127.0.0.1:43210/callback',
			now: () => new Date('2026-06-10T07:30:00.000Z'),
		});

		expect(settings.googleHealth.accessToken).toBe('access-token');
		expect(settings.googleHealth.refreshToken).toBe('refresh-token');
		expect(settings.googleHealth.accessTokenExpiresAt).toBe(
			'2026-06-10T08:30:00.000Z',
		);
		expect(saveSettings).toHaveBeenCalledOnce();
		expect(postJson).toHaveBeenCalledWith(
			'https://oauth2.googleapis.com/token',
			{
				client_id: 'client-id',
				client_secret: 'client-secret',
				code: 'authorization-code',
				code_verifier: 'code-verifier',
				grant_type: 'authorization_code',
				redirect_uri: 'http://127.0.0.1:43210/callback',
			},
			undefined,
		);
	});
});
