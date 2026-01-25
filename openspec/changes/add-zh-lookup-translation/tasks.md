## 1. Implementation
- [x] 1.1 Add language detection + normalization for English/Chinese selections; reject mixed selections.
- [x] 1.2 Extend translation types/providers for targetLang `en` and route requests by detected language.
- [x] 1.3 Update lookup overlay rendering and states for Chinese source words (English translation only).
- [x] 1.4 Add `wordEn` to the storage schema and migration; persist English labels for Chinese entries.
- [x] 1.5 Update popup rendering to display `wordEn` after Chinese words (keep `wordZh` for English).
- [x] 1.6 Update highlight engine to support Chinese entries while keeping performance guardrails.
- [x] 1.7 Skip online definition backfill for Chinese source words.
- [x] 1.8 Add unit tests for detection/normalization, translation routing, label persistence, and highlighting.

## 2. Validation
- [x] 2.1 Run `npm test`.
- [x] 2.2 Run `npm run lint`.
