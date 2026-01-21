# Change: Add OpenAI translation provider

## Why
- Provide an additional provider option (OpenAI) for translation and definition backfill.
- Support the Chat Completions API with user-controlled endpoint and model configuration.

## What Changes
- Add an OpenAI provider option for translation and definition backfill, using Chat Completions.
- Introduce OpenAI configuration (endpoint URL and model ID) on the Options page, with no defaults.
- Keep translation/definition opt-in and existing default behavior unchanged.

## Impact
- Affected specs: translation, definition-provider
- Affected code: shared translation/definition providers and handlers, options UI/config storage, manifest host permissions, tests
