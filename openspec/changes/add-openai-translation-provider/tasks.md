## 1. Implementation
- [x] 1.1 Add OpenAI provider config storage (endpoint URL + model ID) with validation helpers.
- [x] 1.2 Implement OpenAI translation provider (Chat Completions + JSON parsing + error mapping).
- [x] 1.3 Implement OpenAI definition provider (Chat Completions + plain-text parsing + sanitization).
- [x] 1.4 Wire provider selection in background handlers (translation + definition backfill), returning `not_configured` when OpenAI config is missing.
- [x] 1.5 Update Options UI to configure OpenAI endpoint and model ID; persist locally; adjust status messaging.
- [x] 1.6 Add host permission for OpenAI endpoint in `manifest.json`.
- [x] 1.7 Add/extend unit tests for OpenAI parsing, config validation, and error handling.
- [x] 1.8 Run `npm test`, `npm run lint`, and `npm run typecheck`.
