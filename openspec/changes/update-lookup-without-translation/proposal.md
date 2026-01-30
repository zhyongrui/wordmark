# Change: update lookup and list behavior when translation is disabled

## Why
When translation is disabled, WordMark currently blocks Chinese/Japanese lookups and the popup list depends on translation-direction filtering, which prevents users from building a word list for offline memorization. Users want to record any EN/ZH/JA word without enabling translation and browse the list by source language.

## What Changes
- Allow lookups for supported languages even when translation is disabled; translation requests remain disabled.
- Replace the popup direction toggle with a language filter list (All/EN/ZH/JA) when translation is disabled, filtering by source language only.
- Hide translated labels in the popup list when translation is disabled.

## Impact
- Affected specs: translation, word-selection
- Affected code: `src/content/index.ts`, `src/popup/popup.html`, `src/popup/index.ts`, popup styles, relevant tests
