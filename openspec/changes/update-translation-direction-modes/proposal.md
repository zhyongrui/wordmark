# Change: Update translation direction modes and word list filtering

## Why
Users want a single-direction default (EN->ZH) with explicit dual-mode controls, while keeping
translation lookup fast and vocabulary lists scoped to the selected direction.

## What Changes
- Add translation mode selection (Single/Dual) with per-mode language pair dropdowns.
- Use EN/ ZH labels and arrows in UI, keep WORDMARK/WORDS uppercase in popup header.
- Single mode enforces the selected direction and shows a guidance message on opposite-language lookups.
- Dual mode auto-detects lookup language, updates list direction on any translation trigger, and
  shows a popup direction toggle between WORDMARK and WORDS count.
- Word list filters by direction (English entries vs Chinese entries).
- When translation is disabled, mode and language controls remain visible but disabled.

## Impact
- Affected specs: `translation`.
- Affected code: `src/options/options.html`, `src/options/index.ts`, `src/shared/translation/settings.ts`,
  `src/shared/messages.ts`, `src/content/index.ts`, `src/background/handlers/translation.ts`,
  `src/popup/popup.html`, `src/popup/styles.css`, `src/popup/index.ts`.
