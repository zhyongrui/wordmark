# Implementation Plan: Popup Settings Entry and Centered Count

**Branch**: `[004-popup-settings]` | **Date**: 2025-12-27 | **Spec**: specs/004-popup-settings/spec.md
**Input**: Feature specification from `/specs/004-popup-settings/spec.md`

## Summary

Add a settings icon to the popup header (top-right) that opens the extension options page, and center the total word count in the header while keeping existing popup behaviors intact. Use `chrome.runtime.openOptionsPage()` with a tabs fallback, adjust header layout and count rendering, and ensure highlight toggle, search, list rendering, and delete continue to work without console errors.

## Technical Context

**Language/Version**: TypeScript 5.6.x  
**Primary Dependencies**: Chrome Extension MV3 APIs (runtime, storage, tabs), vanilla DOM/TS, existing shared helpers  
**Storage**: `chrome.storage.local` (versioned schema)  
**Testing**: `npm test` (vitest) + `npm run lint`, optional `npm run typecheck`  
**Target Platform**: Chromium-based browsers (MV3 extension popup)  
**Project Type**: Single browser extension project  
**Performance Goals**: Popup renders/updates instantly for small word lists; no user-visible delays when opening settings  
**Constraints**: MV3, no new permissions, no popup console errors, layout stays compact  
**Scale/Scope**: Small client-side word list; single popup surface change

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file is placeholder with no enforceable principles; proceed under standard repo quality practices (tests/lint) and keep plan implementation-focused. Gate passed.

## Project Structure

### Documentation (this feature)

```text
specs/004-popup-settings/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
src/
├── popup/          # popup.html, popup.ts build, styles.css (header/layout work here)
├── options/        # options page (target for settings opener)
├── background/     # message handling
├── content/        # page interactions
├── shared/         # storage schema, messaging types, helpers
├── types/          # shared type definitions
└── assets/

tests/
├── unit/
└── integration/
```

**Structure Decision**: Single MV3 extension project; this feature touches `src/popup/*` for UI/layout and uses existing shared storage/message types from `src/shared`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
