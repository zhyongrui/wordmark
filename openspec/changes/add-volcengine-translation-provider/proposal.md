# Change: Add Volcengine translation provider

## Why
- Provide a second provider choice (Volcengine) for translation and definition backfill to avoid single-provider reliance.
- Support a China-based endpoint to reduce latency/compliance risk for users who cannot use Gemini.

## What Changes
- Add a Volcengine provider option for translation and definition backfill, using the Chat Completions API.
- Introduce Volcengine-specific configuration (endpoint URL, model/endpoint ID) on the Options page.
- Keep translation/definition opt-in and default behaviors unchanged (Gemini remains default; translation stays disabled by default).

## Impact
- Affected specs: translation, definition-provider
- Affected code: shared translation/definition providers and handlers, options UI/config storage, manifest host permissions, tests
