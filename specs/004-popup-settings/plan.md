# Implementation Plan: Popup Settings Entry and Centered Count (UI polish)

**Branch**: `[004-popup-settings]` | **Date**: 2025-12-27 | **Spec**: specs/004-popup-settings/spec.md
**Input**: Feature specification from `/specs/004-popup-settings/spec.md`

## Summary

Polish the popup header so the gear is a larger, borderless icon on the top-right with a minimum 32×32 clickable area, and the word-count label sits on the same row immediately to its left with 6–10px spacing. Keep all existing popup behaviors (search, list render, delete, highlight toggle, options opening) unchanged. Work is limited to popup DOM/CSS/script (`src/popup/popup.html`, `src/popup/styles.css`, `src/popup/index.ts`) with no new dependencies or storage/background changes.

## Technical Context

**Language/Version**: TypeScript 5.6.x  
**Primary Dependencies**: Chrome Extension MV3 APIs (runtime/tabs for options opener), vanilla DOM/CSS  
**Storage**: `chrome.storage.local` (unchanged)  
**Testing**: `npm test`, `npm run lint`, `npm run build`  
**Target Platform**: MV3 browser extension popup  
**Project Type**: Single extension project  
**Performance Goals**: Instant popup render/update for header; no added latency for options opening  
**Constraints**: DOM/CSS changes only in popup header; count sits left of gear on same row; gear borderless visual size ~18–22px with ≥32×32 hit area; spacing between count and gear ~6–10px; no new dependencies or permissions; no storage/background changes  
**Scale/Scope**: Small UI polish confined to `src/popup/popup.html`, `src/popup/styles.css`, `src/popup/index.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file is placeholder; apply standard repo quality gates (tests/lint) and stay within popup UI scope. Gate passed.

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
├── popup/          # popup.html, styles.css, index.ts (header layout/count/gear work here)
├── options/
├── background/
├── content/
├── shared/
├── types/
└── assets/

tests/
├── unit/
└── integration/    # manual smoke instructions file
```

**Structure Decision**: Single MV3 extension; only popup header files (`src/popup/popup.html`, `src/popup/styles.css`, `src/popup/index.ts`) change. Tests rely on existing commands; no new assets or modules added.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
