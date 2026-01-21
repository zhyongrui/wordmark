## 1. Implementation
- [x] 1.1 Add Qwen provider config storage (endpoint URL + model ID) with validation helpers.
- [x] 1.2 Implement Qwen translation provider (Chat Completions + JSON parsing + error mapping).
- [x] 1.3 Implement Qwen definition provider (Chat Completions + plain-text parsing + sanitization).
- [x] 1.4 Wire provider selection in background handlers (translation + definition backfill), returning `not_configured` when Qwen config is missing.
- [x] 1.5 Update Options UI to configure Qwen endpoint and model ID; persist locally; adjust status messaging.
- [x] 1.6 Add/extend unit tests for Qwen parsing, config validation, handler gating, and error handling.
