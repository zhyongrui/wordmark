## Context
The current translation experience revolves around English and Chinese and keeps direction state, UI controls, and storage focused on that pair. Adding Japanese needs coordinated updates to every component that touches translation directions, selection detection, provider prompts, and stored labels.

## Goals / Non-Goals
- Goals:
  - Treat Japanese as a peer language to English and Chinese in terms of detection, direction state, and persisted labels.
  - Preserve existing EN↔ZH flows without regressions while still surfacing new options for EN↔JA and ZH↔JA.
  - Keep the providers’ JSON response contract (`translatedWord`/`translatedDefinition`) and avoid breaking prompts by parameterizing the source/target language strings.
- Non-goals:
  - Implement automatic machine-detected multi-hop translation (e.g., EN→ZH→JA) today.
  - Rework UI copy beyond the new directions and single/dual mode hints.

## Decisions
- Decision: Expand `WordLanguage` to include `ja` and let `detectWordLanguage` recognize Japanese syllabaries/kanji so the content script can gate lookups properly.
- Decision: Keep the `TranslationDirection` values as arrow-based strings (e.g., `EN->JA`) and add dual pairs for every unordered combination; Single mode dropdown will show the six permutations, while Dual mode lists the three bi-directional pairs.
- Decision: In the providers, build prompts with `sourceLanguageLabel`/`targetLanguageLabel` helpers derived from the requested `targetLang`, allowing each provider to reuse the same logic but swap the sample text for `English`, `Chinese`, or `Japanese`.
- Decision: Persist a `wordJa` label in the shared store so UI lists can surface language-appropriate labels just like `wordZh` and `wordEn`.

## Risks / Trade-offs
- Each provider must correctly understand the new prompt text; if any provider misinterprets Japanese instructions, the translation result may fail until the provider-specific logic is tuned.
- Expanding the selection gating adds complexity to the overlay logic; tests must cover every single-mode direction to avoid regression where `EN->JA` still allows a Chinese selection.

## Migration Plan
1. Extend the schema and store helpers so existing entries gain an undefined `wordJa` field without requiring data migration.
2. Update translation settings parsing so stored settings that only mention EN/ZH gracefully default to existing values when Java directions are added later.

## Open Questions
- Should the UI show Japanese labels (e.g., Katakana) alongside English and Chinese even when translations are not configured for that direction?
- Do we need specific guidance copy for `EN->JA` vs. `EN->ZH` when single mode blocks a lookup, or can we reuse the existing template with the selected direction/its reverse filled in?
