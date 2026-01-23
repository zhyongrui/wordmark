# Change: Scope translation API keys per provider

## Why
The current translation API key is stored globally, which can incorrectly mark providers as configured when only a
different provider's key is saved.

## What Changes
- Store translation API keys per provider instead of a single global key.
- Treat configuration as valid only when the selected provider has its own key (plus endpoint/model where required).
- Keep per-provider key clearing (clear current provider only).

## Impact
- Affected specs: translation, definition-provider
- Affected code: translation secrets storage, status/availability checks, options UI, translation and definition handlers
