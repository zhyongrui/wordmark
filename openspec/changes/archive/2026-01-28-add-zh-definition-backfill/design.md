## Context
- Definition backfill currently generates short English definitions for English source words only.
- ZH->EN lookups show just the translated word and omit definition context.

## Goals / Non-Goals
- Goals:
  - When the looked-up word is Chinese, generate a short Chinese definition and translate it to English.
  - Preserve the existing overlay layout and ordering used for EN->ZH definition display.
  - Reuse existing provider selection and configuration gating.
- Non-Goals:
  - Add new language pairs beyond EN/ZH.
  - Change translation provider selection or API key flows.

## Decisions
- Definition provider API will accept a source language so providers can generate either English or Chinese definitions.
- Chinese definitions will be sanitized for length/whitespace, similar to English sanitization rules.
- Backfill will call the translation provider to translate the generated Chinese definition to English.
- The overlay will use the same definition section, but swap in the Chinese definition as the source text
  and the English translation as the translated definition when the source language is Chinese.

## Risks / Trade-offs
- This adds a second backfill path that depends on translation provider availability; failures must fall back
  to the existing error messaging without breaking the overlay.
- Provider prompts for Chinese definitions may need tuning; keep them minimal first.

## Migration Plan
- Extend definition request/response types to include source language.
- Update definition provider prompts and sanitizers.
- Update definition backfill handler to support Chinese selections.
- Update overlay rendering to handle Chinese-source definition display.

## Open Questions
- None.
