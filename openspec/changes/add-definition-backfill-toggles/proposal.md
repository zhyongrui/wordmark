# Change: Add definition backfill toggles

## Why
Definition backfill adds noticeable latency for some users. We need explicit controls to keep it opt-in and to let users skip translating generated definitions.

## What Changes
- Add settings to enable/disable online definition backfill (default off).
- Add settings to enable/disable translation of generated definitions (default off).
- Disable the translation-of-definition toggle when backfill is off (visible but disabled).
- Place the two definition toggles inline with the translation opt-in control, aligned to the right.
- Gate backfill and definition-translation requests based on these settings.

## Impact
- Affected specs: definition-provider
- Affected code: src/shared/translation/settings.ts, src/options/options.html, src/options/index.ts, src/content/index.ts, src/background/handlers/definition-backfill.ts, src/content/lookup-overlay.ts, tests/unit/**
