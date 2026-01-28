# Change: Add optional Gemini endpoint/model configuration

## Why
Gemini currently uses built-in endpoints and automatic model selection only. Users cannot target a proxy or lock a
specific model, which makes some setups impossible.

## What Changes
- Add optional Gemini endpoint URL and model ID fields on the Options page.
- Persist Gemini configuration locally and share it across translation and definition providers.
- When configured, Gemini providers use the override endpoint/model; when empty, keep existing defaults.

## Impact
- Affected specs: translation, definition-provider
- Affected code: options UI, Gemini providers, translation config storage/status helpers
