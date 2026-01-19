## Context
WordMark currently supports Gemini for translation and definition backfill. Translation settings are opt-in and
stored locally. The background service worker performs network calls and uses in-memory caching and
request de-duplication.

This change adds Volcengine (Ark) Chat Completions as an additional provider. The user explicitly configures
endpoint URL and model/endpoint ID; no defaults are provided.

## Goals / Non-Goals
- Goals:
  - Add Volcengine as a selectable provider for translation and definition backfill.
  - Use API key + Bearer auth and the Chat Completions API.
  - Require user-provided endpoint URL and model/endpoint ID (no defaults).
  - Keep opt-in/consent, data minimization, and caching behavior unchanged.
- Non-Goals:
  - AK/SK signature auth.
  - Automatic model discovery or default model selection.
  - Changing existing lookup/overlay flows or persistent caching.

## Decisions
- Decision: Use `Authorization: Bearer <apiKey>` for Volcengine calls.
  - Rationale: Aligns with user guidance and keeps configuration simple.
- Decision: Store Volcengine config in a dedicated local key (e.g., `wordmark:translation:volcengine`).
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
- Add new storage key for Volcengine config with empty defaults.
- No migrations needed; existing Gemini settings and secrets remain unchanged.

## Open Questions
- None.
