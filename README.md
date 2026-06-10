# Daily Vitals

Daily Vitals syncs Google Health metrics into your Obsidian Daily Notes frontmatter.

By default, it automatically syncs yesterday's health data when Obsidian starts. If the matching Daily Note does not exist, nothing is created.

Daily Vitals only updates enabled frontmatter fields. It never modifies note body content and never deletes existing fields.

## Google Health setup

Daily Vitals reads Google Health API data using OAuth 2.0.

Create a Google Cloud project, enable the Google Health API, and create an OAuth client. Grant these readonly scopes for the fields you want to sync:

- `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly`
- `https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly`
- `https://www.googleapis.com/auth/googlehealth.sleep.readonly`

The quickest setup path is Google's OAuth 2.0 Playground:

1. Open OAuth 2.0 Playground.
2. Select **OAuth 2.0 Configuration**.
3. Enable **Use your own OAuth credentials**.
4. Enter your OAuth client ID and client secret.
5. Authorize the Google Health API scopes above.
6. Exchange the authorization code for tokens.
7. Copy the refresh token into Daily Vitals settings.

In Obsidian, open **Settings -> Daily Vitals** and fill:

- **OAuth client ID**
- **OAuth client secret**
- **Refresh token**

Daily Vitals refreshes short-lived access tokens automatically when a refresh token is configured.

## Commands

- **Daily Vitals: Sync yesterday now**
- **Daily Vitals: Backfill existing notes**

## Synced fields

Daily Vitals writes flat frontmatter fields with the `daily_vitals_` prefix.

Default enabled fields:

- `daily_vitals_date`
- `daily_vitals_synced_at`
- `daily_vitals_steps`
- `daily_vitals_sleep_minutes`
- `daily_vitals_resting_heart_rate`

Default disabled fields:

- `daily_vitals_source`
- `daily_vitals_active_calories`

Disabled fields are ignored during sync. They are not fetched, written, updated, or removed from existing notes.

## Settings

- **Auto sync on startup**
- **Startup sync delay**
- **Target offset days**
- **Backfill days**
- **Daily Note folder**
- **Daily Note format**
- **OAuth client ID**
- **OAuth client secret**
- **Refresh token**
- **Access token**
- **Access token expires at**
- **Enabled fields**

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```
