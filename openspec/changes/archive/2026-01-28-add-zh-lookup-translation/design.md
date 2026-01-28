## Context
- Lookup normalization currently only accepts English tokens.
- Translation requests target Chinese only.
- Definition backfill generates English definitions for English words.

This change adds Chinese word lookup and bidirectional translation while preserving existing
English flows and opt-in networking.

## Goals / Non-Goals
- Goals:
  - Accept pure English or pure Chinese selections for lookup.
  - Auto-detect source language and translate to the opposite language.
  - Show only English translation content for Chinese source words.
  - Persist translation labels for both directions and display them in the popup list.
  - Highlight Chinese entries when highlight is enabled.
- Non-Goals:
  - Mixed-language or sentence translation.
  - English definitions for Chinese source words.
  - Automatic translation of pages or word lists.
  - Popup search by translated labels (unless requested later).

## Decisions
- Language detection: use strict token checks.
  - English token: existing pattern (letters with optional internal apostrophes/hyphens).
  - Chinese token: Han characters only (`\p{Script=Han}` with `u` flag).
  - Any mixed script, digits, or punctuation results in rejection.
- Normalization & storage:
  - Keep `normalizedWord` as normalized English token or the trimmed Chinese token.
  - Add optional `wordEn` to store English translation labels for Chinese source words.
  - Keep `wordZh` for English source words as-is.
- Translation routing:
  - Extend `TranslationTargetLang` to `"zh" | "en"`.
  - English source -> target `zh` with optional definition.
  - Chinese source -> target `en` with no definition payload.
- Overlay behavior:
  - English source: unchanged (English definition + Chinese translation when available).
  - Chinese source: show only the English translation section; hide definition blocks.
- Definition backfill:
  - Skip online definition requests when the source word is Chinese.
- Highlighting:
  - Add Han matching when there are Chinese entries; keep English highlight flow unchanged.

## Risks / Trade-offs
- Unicode regex and additional highlight scanning may impact performance on large pages.
  Mitigation: only enable Han matching when Chinese entries exist and respect existing scan budgets.
- Adding `wordEn` requires a schema migration and careful UI rendering for label display.

## Migration Plan
- Bump storage schema version to include optional `wordEn` on `WordEntry`.
- Migrate existing data by leaving `wordEn` unset.

## Open Questions
- Should popup search match `wordEn`/`wordZh` labels?
