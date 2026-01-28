# Change: Add Chinese definition backfill for ZH->EN lookups

## Why
Users want the ZH->EN flow to mirror the EN->ZH experience, including a source-language definition
and its translation, so Chinese lookups feel equally complete.

## What Changes
- Generate short Chinese definitions for Chinese source words when definition backfill is enabled.
- Translate generated Chinese definitions to English and show both in the lookup overlay.
- Keep the display order and styling consistent with the existing EN->ZH definition UI.

## Impact
- Affected specs: `definition-provider`.
- Affected code: `src/background/handlers/definition-backfill.ts`, `src/shared/definition/providers/*`,
  `src/shared/definition/types.ts`, `src/shared/definition/sanitize.ts`, `src/content/index.ts`,
  `src/content/lookup-overlay.ts`, `src/shared/messages.ts`, related tests.
