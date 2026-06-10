/* eslint-disable import/no-nodejs-modules */
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

describe('mobile install compatibility', () => {
	it('does not mark the plugin as desktop-only', () => {
		const manifest = JSON.parse(readFileSync('manifest.json', 'utf8')) as {
			isDesktopOnly: boolean;
		};

		expect(manifest.isDesktopOnly).toBe(false);
	});

	it('does not statically import Node-only modules in OAuth code', () => {
		const oauthSource = readFileSync('src/oauth.ts', 'utf8');

		expect(oauthSource).not.toMatch(/from 'crypto'/);
		expect(oauthSource).not.toMatch(/from 'http'/);
	});
});
