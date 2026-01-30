# Change: add Japanese translation support

## Why
Users expect WordMark to handle Japanese text the same way it handles English and Chinese: auto-detect language, translate in the configured direction, store translations, and surface a matching popup/list experience. The current translation mode is hard-coded around the EN/ZH pair, so a dedicated plan is needed to extend the settings, UI, storage, detection, and provider prompts for three-way translations while preserving the existing EN/ZH behavior.

## What Changes
- Extend translation settings, translation APIs, and word storage to carry a third language (Japanese) and the additional direction options required for Single and Dual modes (EN↔JA, ZH↔JA plus the original EN↔ZH).
- Update the lookup/content flow to detect Japanese selections, enforce single-mode restrictions, drive the correct `targetLang`, and persist Japanese labels when translations succeed.
- Refresh every translation provider prompt/response path to accept Japanese targets and ensure prompts still emit the `translatedWord`/`translatedDefinition` JSON schema for EN, ZH, and JA.
- Surface the new directions in the Options page and popup list controls, including expanded dropdown/toggle options, new guidance text, and UI filtering behavior for the extra language pair.
- Update the translation specification (and tests) so the requirements reflect the new detection, storage, and direction behaviors for Japanese.

## Impact
- Affected specs: translation
- Affected code: `src/shared/translation/*`, `src/content/index.ts`, `src/background/handlers/translation.ts`, `src/options/*`, `src/popup/index.ts`, `src/shared/word/*`, relevant tests under `tests/unit`
