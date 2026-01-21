# Change: Add DeepSeek translation provider

## Why
- Provide an additional provider option (DeepSeek) for translation and definition backfill.
- DeepSeek is OpenAI API-compatible, but benefits from a dedicated provider label and separate endpoint/model config.

## What Changes
- Add a DeepSeek provider option for translation and definition backfill, using Chat Completions.
- Introduce DeepSeek configuration (endpoint URL and model ID) on the Options page, with no defaults.
- Keep translation/definition opt-in and existing default behavior unchanged.

## Impact
- Affected specs: translation, definition-provider
- Affected code: shared translation/definition providers and handlers, options UI/config storage, tests (no new host permissions required)

