<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# wordmark Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-21

## Active Technologies
- TypeScript 5.6.x + Browser extension APIs (MV3); embedded assets where applicable (002-translation)
- `chrome.storage.local` (versioned schema + migrations) (002-translation)
- TypeScript 5.6.x + Browser extension APIs (Manifest V3); optional online provider (initial: Gemini) (003-definition-provider)
- `chrome.storage.local` (Spec 001 storage key unchanged; no persistent cache for this feature) (003-definition-provider)
- TypeScript 5.6.x + Chrome Extension MV3 APIs (runtime, storage, tabs), vanilla DOM/TS, existing shared helpers (004-popup-settings)
- `chrome.storage.local` (versioned schema) (004-popup-settings)

- TypeScript (project toolchain version aligned with repo) + Browser extension APIs; embedded dictionary dataset for basic definitions (001-wordmark-mvp-spec)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (project toolchain version aligned with repo): Follow standard conventions

## Recent Changes
- 004-popup-settings: Added TypeScript 5.6.x + Chrome Extension MV3 APIs (runtime, storage, tabs), vanilla DOM/TS, existing shared helpers
- 004-popup-settings: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 003-definition-provider: Added TypeScript 5.6.x + Browser extension APIs (Manifest V3); optional online provider (initial: Gemini)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
