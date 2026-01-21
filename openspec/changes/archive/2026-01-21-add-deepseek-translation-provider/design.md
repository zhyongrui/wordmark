## Context
WordMark supports multiple optional online providers for translation and definition backfill via Chat Completions.
DeepSeek exposes an OpenAI-compatible API format with:
- Base URL: `https://api.deepseek.com` (optionally `https://api.deepseek.com/v1`)
- Chat Completions path: `/chat/completions`
- Auth: `Authorization: Bearer <apiKey>`

## Goals / Non-Goals
- Goals:
  - Add DeepSeek as a selectable provider for translation and definition backfill.
  - Use Chat Completions request/response shape (`messages`, parse `choices[0].message.content`).
  - Require user-provided endpoint URL and model ID (no defaults stored).
  - Keep opt-in/consent, data minimization, caching, and error mapping unchanged.
- Non-Goals:
  - Streaming responses.
  - Automatic model discovery or default model selection.

## Decisions
- Decision: Store DeepSeek config separately from OpenAI.
  - Key: `wordmark:translation:deepseek`
  - Fields: `endpointUrl`, `modelId`, `updatedAt`
  - Rationale: Avoid confusing OpenAI/DeepSeek settings and allow easy switching.
- Decision: Validate endpoints as HTTPS-only and normalize by trimming trailing slashes.
  - Rationale: Match existing provider patterns and enforce secure transport.
- Decision: Default UI placeholders suggest `https://api.deepseek.com/chat/completions` and model IDs like `deepseek-chat`.
  - Rationale: Help setup without persisting defaults.

## Risks / Trade-offs
- DeepSeek is compatible with OpenAI provider; adding a dedicated provider duplicates logic.
  - Mitigation: Keep implementation minimal and consistent with existing provider patterns.

