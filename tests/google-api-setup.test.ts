import { describe, expect, it } from 'vitest';
import {
	GOOGLE_API_SETUP_STEPS,
	GOOGLE_API_SETUP_SUMMARY,
} from '../src/google-api-setup';

describe('Google API setup copy', () => {
	it('guides users from Google Cloud credentials to connecting in Obsidian', () => {
		expect(GOOGLE_API_SETUP_SUMMARY).toContain('Google Cloud');
		expect(GOOGLE_API_SETUP_STEPS).toEqual([
			'Create a Google Cloud project and enable the Google Health API.',
			'Configure the consent screen with the readonly Google Health scopes.',
			'Create a desktop OAuth client.',
			'Paste the client ID below, then select Connect.',
		]);
	});
});
