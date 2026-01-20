## 1. Implementation
- [x] 1.1 Add Zhipu provider config storage (endpoint URL + model ID) with validation helpers.
- [x] 1.2 Implement Zhipu translation provider (Chat Completions + JSON parsing + error mapping) with `thinking` disabled.
- [x] 1.3 Implement Zhipu definition provider (Chat Completions + plain-text parsing + sanitization).
- [x] 1.4 Wire provider selection in background handlers (translation + definition backfill), returning `not_configured` when Zhipu config is missing.
- [x] 1.5 Update Options UI to configure Zhipu endpoint and model ID; persist locally; adjust status messaging.
- [x] 1.6 Add host permission for Zhipu endpoint in `manifest.json`.
- [x] 1.7 Add/extend unit tests for Zhipu parsing, config validation, and error handling.
