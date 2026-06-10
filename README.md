# Daily Vitals

Daily Vitals syncs Google Health metrics into your Obsidian Daily Notes frontmatter.

By default, it automatically syncs yesterday's health data when Obsidian starts. If the matching Daily Note does not exist, nothing is created.

Daily Vitals only updates enabled frontmatter fields. It never modifies note body content and never deletes existing fields.

## Current status

The plugin implements the Daily Note lookup, field selection, frontmatter update behavior, startup sync, manual sync command, backfill command, and settings UI.

Google Health account connection and data fetching are represented by an internal provider boundary. Until the provider is connected to a real Google Health integration, sync commands show a notice asking you to connect your Google Health account.

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
- **Daily Note folder**
- **Daily Note format**
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
