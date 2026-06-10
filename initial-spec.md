# Daily Vitals Spec

## Overview

Daily Vitals is an Obsidian plugin that syncs health metrics from Google Health into Obsidian Daily Notes frontmatter.

The plugin is intentionally small in scope.

It does not create Daily Notes, manage Daily Note templates, or modify note body content. It only updates selected frontmatter fields in existing Daily Notes.

## Plugin Name

**Daily Vitals**

## Purpose

Daily Vitals automatically records selected health metrics into matching Daily Notes so that the data can be viewed, queried, and compared later in Obsidian.

The primary use case is:

> Sync yesterday's health data into yesterday's Daily Note.

## Data Source

Initial data source:

* Google Health

The plugin name should not include "Google" to avoid implying official affiliation.

Google Health should be mentioned in the plugin description and README.

Example description:

```txt
Sync Google Health data into your Obsidian Daily Notes frontmatter.
```

## Core Principles

Daily Vitals should be safe and non-destructive.

The plugin should:

* Only write to existing Daily Notes
* Never create Daily Notes
* Never modify note body content
* Only update frontmatter
* Only write or update enabled fields
* Never delete existing fields
* Ignore disabled fields during sync
* Skip dates where no matching Daily Note exists

## Default Behavior

On Obsidian startup, Daily Vitals automatically syncs health data for the previous day.

Example:

```txt
Current date: 2026-06-10
Target date: 2026-06-09
Target Daily Note: 2026-06-09.md
```

The default target offset is `1` day before today.

This is because many health metrics, especially sleep and daily step count, are more reliable after the day has ended.

## Scope

Daily Vitals does:

* Sync health data from Google Health
* Target the previous day by default
* Find the matching Daily Note
* Update selected frontmatter fields
* Provide a manual command to sync yesterday
* Provide a manual command to backfill existing Daily Notes

Daily Vitals does not:

* Create Daily Notes
* Modify Daily Note templates
* Modify note body content
* Delete existing frontmatter fields
* Manage arbitrary Google account data
* Provide a manual single-date sync command in the MVP

## Daily Note Handling

If the target Daily Note does not exist, the plugin does nothing.

It should not create a new Daily Note.

Recommended notice:

```txt
Daily Note for 2026-06-09 not found. Skipped.
```

This should be treated as a normal skip, not as a fatal error.

## Frontmatter Strategy

Daily Vitals writes flat frontmatter fields.

Nested YAML is technically possible, but flat fields are preferred because they are easier to use with:

* Obsidian Properties
* Dataview
* Search
* Other plugins

All Daily Vitals fields use the `daily_vitals_` prefix.

Example:

```yaml
---
daily_vitals_date: 2026-06-09
daily_vitals_synced_at: 2026-06-10T07:30:00+09:00
daily_vitals_steps: 8432
daily_vitals_sleep_minutes: 402
daily_vitals_resting_heart_rate: 58
---
```

## Available Fields

Users can choose which Daily Vitals fields are written and updated.

This includes both metadata fields and health metric fields.

### Metadata fields

```yaml
daily_vitals_source: google_health
daily_vitals_date: 2026-06-09
daily_vitals_synced_at: 2026-06-10T07:30:00+09:00
```

### Metric fields

```yaml
daily_vitals_steps: 8432
daily_vitals_sleep_minutes: 402
daily_vitals_resting_heart_rate: 58
daily_vitals_active_calories: 420
```

## Initial Enabled Fields

Default enabled fields:

* `daily_vitals_date`
* `daily_vitals_synced_at`
* `daily_vitals_steps`
* `daily_vitals_sleep_minutes`
* `daily_vitals_resting_heart_rate`

Default disabled fields:

* `daily_vitals_source`
* `daily_vitals_active_calories`

Rationale:

* `date` is useful for Dataview and sorting.
* `synced_at` is useful for knowing when the data was last updated.
* `steps`, `sleep_minutes`, and `resting_heart_rate` are useful daily metrics.
* `source` is optional because the MVP only supports Google Health.
* `active_calories` is useful but less essential than steps, sleep, and resting heart rate.

## Field Definitions

### `daily_vitals_source`

The data source used for sync.

```yaml
daily_vitals_source: google_health
```

### `daily_vitals_date`

The date the health data belongs to.

```yaml
daily_vitals_date: 2026-06-09
```

### `daily_vitals_synced_at`

The timestamp when the plugin last synced the data.

```yaml
daily_vitals_synced_at: 2026-06-10T07:30:00+09:00
```

### `daily_vitals_steps`

Total steps for the target date.

```yaml
daily_vitals_steps: 8432
```

### `daily_vitals_sleep_minutes`

Total sleep duration in minutes.

```yaml
daily_vitals_sleep_minutes: 402
```

### `daily_vitals_resting_heart_rate`

Resting heart rate for the target date.

```yaml
daily_vitals_resting_heart_rate: 58
```

### `daily_vitals_active_calories`

Active calories for the target date.

```yaml
daily_vitals_active_calories: 420
```

## Field Selection

Users can choose which fields Daily Vitals writes and updates.

Only enabled fields are fetched, written, and updated during sync.

Disabled fields are ignored during sync.

Disabled fields are:

* Not fetched
* Not written
* Not updated
* Not removed from existing Daily Notes

Changing field settings only affects future sync operations. It never deletes existing frontmatter fields.

## Non-Destructive Behavior

Daily Vitals must never delete existing fields.

For example, if a note already has:

```yaml
---
daily_vitals_steps: 8432
daily_vitals_sleep_minutes: 402
daily_vitals_active_calories: 420
---
```

and the user later disables `active_calories`, the field should remain:

```yaml
daily_vitals_active_calories: 420
```

The plugin simply stops fetching or updating it in future syncs.

This applies to:

* Automatic startup sync
* Manual sync yesterday
* Backfill existing notes

## Re-sync Behavior

If the target Daily Note already has Daily Vitals fields, the plugin should fetch the enabled fields again and update only those enabled fields.

This is intentional because health data may be updated or corrected after the first sync, especially sleep data.

The plugin must not overwrite unrelated frontmatter.

Example before sync:

```yaml
---
mood: good
tags:
  - daily
daily_vitals_steps: 8120
daily_vitals_sleep_minutes: 390
daily_vitals_synced_at: 2026-06-10T07:30:00+09:00
---
```

Example after sync:

```yaml
---
mood: good
tags:
  - daily
daily_vitals_date: 2026-06-09
daily_vitals_synced_at: 2026-06-10T12:00:00+09:00
daily_vitals_steps: 8432
daily_vitals_sleep_minutes: 402
daily_vitals_resting_heart_rate: 58
---
```

## Commands

MVP commands:

```txt
Daily Vitals: Sync Yesterday Now
Daily Vitals: Backfill Existing Notes
```

There is no `Sync Date` command in the MVP.

There is no command that removes disabled fields from past notes.

## Automatic Sync

Daily Vitals should automatically sync yesterday's data when Obsidian starts.

Recommended behavior:

* Wait until the Obsidian layout is ready
* Add a short delay before syncing
* Sync the previous day's data
* Skip if the matching Daily Note does not exist
* Update only enabled frontmatter fields

Example implementation shape:

```ts
this.registerEvent(
  this.app.workspace.onLayoutReady(() => {
    window.setTimeout(() => {
      void this.syncYesterday();
    }, this.settings.syncDelaySeconds * 1000);
  })
);
```

## `Daily Vitals: Sync Yesterday Now`

Manually syncs yesterday's health data.

This is the manual equivalent of the automatic startup sync.

Behavior:

* Target yesterday
* Fetch enabled fields from Google Health
* Find the matching Daily Note
* Skip if the Daily Note does not exist
* Write or update enabled fields only
* Do not touch disabled fields
* Do not delete existing fields
* Do not modify note body content

## `Daily Vitals: Backfill Existing Notes`

Backfills health data into existing Daily Notes.

Target dates are:

```txt
dates_with_google_health_data ∩ dates_with_existing_daily_notes
```

In other words, the plugin should only sync dates where:

* Google Health has data
* A matching Daily Note exists

Behavior:

* Find dates that have Google Health data
* Find matching existing Daily Notes
* Sync only the intersection of those dates
* Write or update enabled fields only
* Do not touch disabled fields
* Do not delete existing fields
* Skip dates without Daily Notes
* Do not create Daily Notes

## Settings

Initial settings:

```ts
interface DailyVitalsSettings {
  autoSyncOnStartup: boolean;
  syncDelaySeconds: number;
  targetOffsetDays: number;
  dailyNoteFolder: string;
  dailyNoteFormat: string;
  enabledFields: {
    source: boolean;
    date: boolean;
    syncedAt: boolean;
    steps: boolean;
    sleepMinutes: boolean;
    restingHeartRate: boolean;
    activeCalories: boolean;
  };
}
```

Default values:

```ts
const DEFAULT_SETTINGS: DailyVitalsSettings = {
  autoSyncOnStartup: true,
  syncDelaySeconds: 10,
  targetOffsetDays: 1,
  dailyNoteFolder: "",
  dailyNoteFormat: "YYYY-MM-DD",
  enabledFields: {
    source: false,
    date: true,
    syncedAt: true,
    steps: true,
    sleepMinutes: true,
    restingHeartRate: true,
    activeCalories: false,
  },
};
```

## Field Definitions in Code

```ts
const FIELD_DEFINITIONS = {
  source: "daily_vitals_source",
  date: "daily_vitals_date",
  syncedAt: "daily_vitals_synced_at",
  steps: "daily_vitals_steps",
  sleepMinutes: "daily_vitals_sleep_minutes",
  restingHeartRate: "daily_vitals_resting_heart_rate",
  activeCalories: "daily_vitals_active_calories",
} as const;
```

Sync should only write fields that are enabled in settings.

Disabled fields should not be fetched, written, updated, or removed.

## Error Handling

### Daily Note does not exist

Skip.

The plugin should not create a file.

### Google account is not connected

Show a notice asking the user to connect their account.

### No data exists for an enabled field

Do not write that field.

If the field already exists, do not overwrite it with `null` or `undefined`.

### Partial data exists

Write the enabled fields that were successfully fetched.

### Invalid or unsupported frontmatter

Skip writing and show a notice.

Do not attempt risky automatic repair.

## Dataview Example

Users can query synced data with Dataview:

```dataview
TABLE
  daily_vitals_steps,
  daily_vitals_sleep_minutes,
  daily_vitals_resting_heart_rate
FROM "daily"
WHERE daily_vitals_date
SORT daily_vitals_date DESC
```

## README Summary

Suggested README intro:

```md
# Daily Vitals

Daily Vitals syncs Google Health metrics into your Obsidian Daily Notes frontmatter.

By default, it automatically syncs yesterday's health data when Obsidian starts. If the matching Daily Note does not exist, nothing is created.

Daily Vitals only updates enabled frontmatter fields. It never modifies note body content and never deletes existing fields.
```

## MVP Summary

Daily Vitals MVP:

* Plugin name: Daily Vitals
* Source: Google Health
* Default sync target: yesterday
* Automatic sync on Obsidian startup
* Manual sync yesterday command
* Backfill existing notes command
* Writes flat frontmatter fields
* Uses `daily_vitals_` prefix
* Lets users choose which fields to sync
* Does not create Daily Notes
* Does not modify note body content
* Does not delete existing fields
* Disabled fields are ignored, not removed
* Initial enabled metrics:

  * steps
  * sleep minutes
  * resting heart rate
* Initial optional metric:

  * active calories
