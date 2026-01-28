# Change: Add bidirectional translation with Chinese lookup

## Why
Users want to select a Chinese word directly and get an English translation while keeping the existing
English-to-Chinese translation flows.

## What Changes
- Add automatic language detection for lookup selections (English or Chinese only); reject mixed selections.
- Support translation in both directions (en->zh, zh->en) using existing providers.
- Update the lookup overlay to show only English translation content for Chinese source words.
- Persist translated labels for both directions (`wordZh` for English source, `wordEn` for Chinese source)
  and display the label after the word in the popup list.
- Extend word normalization and highlighting to support Chinese entries.
- Skip online definition backfill for Chinese source words.

## Impact
- Affected specs: `translation`, `word-selection` (new), `definition-provider`.
- Affected code: `src/shared/word/normalize.ts`, `src/content/highlight.ts`, `src/content/lookup-overlay.ts`,
  `src/content/index.ts`, `src/background/handlers/translation.ts`,
  `src/background/handlers/definition-backfill.ts`, `src/shared/translation/types.ts`,
  `src/shared/storage/schema.ts`, `src/shared/word/store.ts`, `src/popup/index.ts`.
