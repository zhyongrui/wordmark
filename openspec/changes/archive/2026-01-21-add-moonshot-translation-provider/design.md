## Context
WordMark supports Gemini, Volcengine, Zhipu, and OpenAI for optional translation and definition backfill.
Translation remains opt-in and requests are executed by the background service worker with in-memory
caching and request de-duplication.

This change adds Moonshot Chat Completions as an additional provider. Users must configure the
target endpoint URL and model ID explicitly; no defaults are provided. Endpoints are user-defined
and may be outside the Moonshot domain (HTTPS only).

## Goals / Non-Goals
- Goals:
  - Add Moonshot as a selectable provider for translation and definition backfill.
  - Use API key + Bearer auth with the Chat Completions endpoint.
  - Require user-provided endpoint URL and model ID (no defaults).
  - Allow custom HTTPS endpoints to support gateways or proxies.
  - Keep opt-in/consent, data minimization, and caching behavior unchanged.
- Non-Goals:
  - Streaming responses or function/tool calling.
  - Automatic model discovery or default model selection.
  - Custom auth schemes beyond Bearer API keys.

## Decisions
- Decision: Use `Authorization: Bearer <apiKey>` for Moonshot calls.
  - Rationale: Matches documented examples and keeps configuration simple.
- Decision: Store Moonshot config in a dedicated local key (e.g., `wordmark:translation:moonshot`).
  - Fields: `endpointUrl`, `modelId`, `updatedAt`.
  - Rationale: Avoid mixing provider-specific config with generic settings.
- Decision: Treat missing endpoint or model ID as `not_configured` and skip network calls.
  - Rationale: No defaults; explicit user consent required.
- Decision: Use Chat Completions request/response shape with `messages` and parse `choices[0].message.content`.
  - Translation prompt returns strict JSON (`translatedWord`, optional `translatedDefinition`).
  - Definition prompt returns 1-2 sentence plain text; sanitize to plain text.
- Decision: Expand host permissions to allow user-defined HTTPS endpoints.
  - Rationale: Custom endpoints may not be under `moonshot.cn`.

## Risks / Trade-offs
- Broad host permissions increase extension reach.
  - Mitigation: Restrict to HTTPS-only (`https://*/*`) and keep calls opt-in and API-key gated.
- Misconfiguration (bad endpoint/model) yields provider errors.
  - Mitigation: Validate config before requests; surface `not_configured` early.
- Provider response not in expected JSON/plain-text format.
  - Mitigation: Defensive parsing; return `provider_error` with safe messaging.

## Migration Plan
- Add new storage key for Moonshot config with empty defaults.
- No migrations needed; existing providers remain unchanged.

## Open Questions
- None.
