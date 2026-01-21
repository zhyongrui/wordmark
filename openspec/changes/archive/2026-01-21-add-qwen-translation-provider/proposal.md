# Change: Add Qwen (DashScope) translation provider

## Why
- Provide a Qwen (DashScope) option for translation and definition backfill to broaden provider availability.
- Support the DashScope-compatible Chat Completions API with user-controlled endpoint/model configuration.

## What Changes
- Add a Qwen provider option for translation and definition backfill, using the Chat Completions API.
- Introduce Qwen configuration (endpoint URL and model ID) on the Options page, with no defaults.
- Keep translation/definition opt-in and default behaviors unchanged (Gemini remains default; translation stays disabled by default).

## Impact
- Affected specs: translation, definition-provider
- Affected code: shared translation/definition providers and handlers, options UI/config storage, tests
