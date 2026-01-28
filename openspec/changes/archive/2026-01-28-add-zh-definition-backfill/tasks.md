## 1. Implementation
- [x] 1.1 Extend definition request/response types to carry source language and Chinese definition output.
- [x] 1.2 Update definition provider prompts/sanitizers to generate Chinese definitions when source language is zh.
- [x] 1.3 Update definition backfill handler to accept Chinese selections, cache by language, and translate zh definitions to en.
- [x] 1.4 Update content lookup flow to request backfill for Chinese source words when translation is enabled.
- [x] 1.5 Update lookup overlay rendering to show zh definition + en translation in the same layout order as EN->ZH.
- [x] 1.6 Add/adjust unit tests for zh definition backfill and overlay rendering.

## 2. Validation
- [x] 2.1 Run `npm test`.
- [x] 2.2 Run `npm run lint`.
