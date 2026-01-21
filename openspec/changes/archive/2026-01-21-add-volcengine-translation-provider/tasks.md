## 1. Implementation
- [x] 1.1 Add Volcengine provider config storage (endpoint URL + model/endpoint ID) with validation helpers.
- [x] 1.2 Implement Volcengine translation provider (Chat Completions + JSON parsing + error mapping).
- [x] 1.3 Implement Volcengine definition provider (Chat Completions + plain-text parsing + sanitization).
- [x] 1.4 Wire provider selection in background handlers (translation + definition backfill), returning `not_configured` when Volcengine config is missing.
- [x] 1.5 Update Options UI to configure Volcengine endpoint and model ID; persist locally; adjust status messaging.
- [x] 1.6 Add host permission for Volcengine endpoint in `manifest.json`.
- [x] 1.7 Add/extend unit tests for Volcengine parsing, config validation, and error handling.
