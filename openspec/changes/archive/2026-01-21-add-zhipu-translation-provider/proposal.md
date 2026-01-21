# Change: Add Zhipu (GLM-4.7) translation provider

## Why
- Provide a third provider option (Zhipu) for translation and definition backfill to broaden availability.
- Support the GLM-4.7 Chat Completions API with user-controlled endpoint/model configuration.

## What Changes
- Add a Zhipu provider option for translation and definition backfill, using the Chat Completions API.
- Introduce Zhipu configuration (endpoint URL and model ID) on the Options page, with no defaults.
- Keep translation/definition opt-in and default behaviors unchanged (Gemini remains default; translation stays disabled by default).

## Impact
- Affected specs: translation, definition-provider
- Affected code: shared translation/definition providers and handlers, options UI/config storage, manifest host permissions, tests
