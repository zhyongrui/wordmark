## 1. Implementation
- [x] 1.1 Add DeepSeek provider config storage (endpoint URL + model ID) with validation helpers.
- [x] 1.2 Implement DeepSeek translation provider (Chat Completions + JSON parsing + error mapping).
- [x] 1.3 Implement DeepSeek definition provider (Chat Completions + plain-text parsing + sanitization).
- [x] 1.4 Wire provider selection in background handlers (translation + definition backfill), returning `not_configured` when DeepSeek config is missing.
- [x] 1.5 Update Options UI to configure DeepSeek endpoint and model ID; persist locally; adjust status messaging.
- [x] 1.6 Add/extend unit tests for DeepSeek parsing, config validation, and error handling.
- [x] 1.7 Run `npm test`, `npm run lint`, and `npm run typecheck`.
