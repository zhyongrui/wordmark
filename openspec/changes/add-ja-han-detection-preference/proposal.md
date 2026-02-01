# Change: Add Japanese Kanji-only Detection Preference

## Why
Japanese words written only in Kanji (Han script) are currently detected as Chinese, which makes JA translation
directions unreliable (e.g., `学校`, `日本`).

## What Changes
- Add an Options UI preference that controls how Kanji-only selections are treated when the active translation
  direction includes Japanese.
- Improve content-script language detection for Kanji-only selections using page language (`<html lang>`) as a hint.

## Impact
- Affected specs: `specs/002-translation/spec.md`
- Affected code:
  - `src/options/options.html`
  - `src/options/index.ts`
  - `src/shared/translation/settings.ts`
  - `src/shared/word/normalize.ts`
  - `src/content/index.ts`

