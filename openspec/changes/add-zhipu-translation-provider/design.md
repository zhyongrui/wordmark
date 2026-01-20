## Context
WordMark supports Gemini and Volcengine for translation and definition backfill. Translation remains opt-in and
requests are executed by the background service worker with in-memory caching and request de-duplication.

This change adds Zhipu (GLM-4.7) Chat Completions as an additional provider. Users must configure the
endpoint URL and model ID explicitly; no defaults are provided.

## Goals / Non-Goals
- Goals:
  - Add Zhipu as a selectable provider for translation and definition backfill.
  - Use API key + Bearer auth with the Chat Completions endpoint.
  - Require user-provided endpoint URL and model ID (no defaults).
  - Keep opt-in/consent, data minimization, and caching behavior unchanged.
- Non-Goals:
  - Enabling `thinking` mode.
  - Automatic model discovery or default model selection.
  - AK/SK signature auth.

## Decisions
- Decision: Use `Authorization: Bearer <apiKey>` for Zhipu calls.
  - Rationale: Matches the documented example and keeps configuration simple.
- Decision: Store Zhipu config in a dedicated local key (e.g., `wordmark:translation:zhipu`).
  - Fields: `endpointUrl`, `modelId`, `updatedAt`.
  - Rationale: Avoid mixing provider-specific config with generic settings.
- Decision: Treat missing endpoint or model ID as `not_configured` and skip network calls.
  - Rationale: No defaults; explicit user consent required.
- Decision: Use Chat Completions request/response shape with `messages` and parse `choices[0].message.content`.
  - Translation prompt returns strict JSON (`translatedWord`, optional `translatedDefinition`).
  - Definition prompt returns 1-2 sentence plain text; sanitize to plain text.

## Risks / Trade-offs
- Misconfiguration (bad endpoint/model) yields provider errors.
  - Mitigation: Validate config before requests; surface `not_configured` early.
- Provider response not in expected JSON/plain-text format.
  - Mitigation: Defensive parsing; return `provider_error` with safe messaging.

## Migration Plan
- Add new storage key for Zhipu config with empty defaults.
- No migrations needed; existing providers remain unchanged.

## Open Questions
- None.
