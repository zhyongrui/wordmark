# Change: Add Moonshot translation provider

## Why
- Provide an additional provider option (Moonshot) for translation and definition backfill.
- Support the Moonshot Chat Completions API with user-controlled endpoint and model configuration.

## What Changes
- Add a Moonshot provider option for translation and definition backfill, using Chat Completions.
- Introduce Moonshot configuration (endpoint URL and model ID) on the Options page, with no defaults.
- Allow user-configured endpoints beyond the Moonshot domain (HTTPS only).
- Keep translation/definition opt-in and existing default behavior unchanged.

## Impact
- Affected specs: translation, definition-provider
- Affected code: shared translation/definition providers and handlers, options UI/config storage, manifest host permissions, tests
