## 1. Translation core
- [ ] Expand `TranslationTargetLang`, `TranslationDirection`, and `TranslationDualPair` to include Japanese and update `updateTranslationSettings`/`parseSettings` to treat `ja` values correctly.
- [ ] Add `wordJa` persistence alongside `wordEn`/`wordZh`, ensure storage schema/versioning handles the new field, and flow `updateWord*` helpers write the Japanese label after a successful lookup.
- [ ] Update the language detection helpers and translation request logic so `src/content/index.ts` enforces the right direction and sends `targetLang` values in {`en`,`zh`,`ja`}, including single-mode gating and auto-detect for Dual.
- [ ] Extend `src/background/handlers/translation.ts` caching/updating logic to support the Japanese target and to store the new label when translations succeed.
- [ ] Refresh every provider prompt/response path (`shared/translation/providers/*`) so their prompts mention the requested source/target language (EN/ZH/JA) and they continue to parse `translatedWord`/`translatedDefinition` JSON.

## 2. UI updates
- [ ] Expand the Options page controls and toggle logic (`options.html`, `src/options/index.ts`) to show the new direction dropdown values (`EN->ZH`, `ZH->EN`, `EN->JA`, `JA->EN`, `ZH->JA`, `JA->ZH`) plus dual pairs (`EN<->ZH`, `EN<->JA`, `ZH<->JA`), and to show guidance for selecting the correct combination.
- [ ] Update the popup word list direction toggle to support the three language directions, filter results accordingly, and display `wordJa` labels alongside `wordZh`/`wordEn`.

## 3. Specs and tests
- [ ] Write the translation spec delta covering the new detection, storage, and direction requirements for Japanese, and ensure the delta updates any existing requirements that mention only EN/ZH.
- [ ] Update unit tests (`content`, `popup`, `translation/settings`, etc.) to cover Japanese selections, label persistence, and toggle/filter behavior.
- [ ] Run `npm test && npm run lint` (or the subset required) to verify the new language paths.

## 4. Validation
- [ ] Run `openspec validate add-japanese-translation --strict --no-interactive` after drafting the spec delta.
