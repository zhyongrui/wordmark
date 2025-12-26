# Implementation Plan: WordMark MVP

**Branch**: `001-wordmark-mvp-spec` | **Date**: 2025-12-21 | **Spec**: /Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/spec.md
**Input**: Feature specification from `/specs/001-wordmark-mvp-spec/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver the MVP for WordMark: keyboard-triggered lookup of selected words with definition and
pronunciation, persistent local word tracking (count + last queried time), low-interference page
highlighting with one-click disable, and a popup word list with search, sort, and delete.

## Technical Context

**Language/Version**: TypeScript (project toolchain version aligned with repo)  
**Primary Dependencies**: Browser extension APIs; embedded dictionary dataset for basic definitions  
**Storage**: `chrome.storage.local` with versioned schema  
**Testing**: Unit test runner for word logic; minimal integration checks in Edge/Chromium  
**Target Platform**: Edge + Chromium (Manifest V3 service worker)  
**Project Type**: Browser extension (MV3)  
**Performance Goals**: 95% of lookups show results within 1s on typical pages; highlight toggle
completes within 2s  
**Constraints**: Offline by default, no network/analytics; no main-thread blocking; incremental
highlighting; do not touch input/textarea/script/style  
**Scale/Scope**: Single-user MVP; typical pages up to ~10k words; word list in the low thousands

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Scope: feature supports reading-time vocabulary marking/memory; not a full dictionary
- [x] Privacy: store only in `chrome.storage.local`; no network/analytics by default; sync opt-in
- [x] UX: hotkey lookup fast and non-blocking; def/pronunciation UI non-obstructive; highlight
      low-interference with one-click disable
- [x] Performance: incremental highlight (MutationObserver + throttling); no main-thread blocking;
      no full scan on huge pages; ignore input/textarea/script/style
- [x] Security: no untrusted HTML injection; isolated from page JS; least permissions
- [x] Engineering: TypeScript; modules split (background/content/popup/options); versioned data
      schemas with migration
- [x] Testability: normalization/counting/sorting/import/export logic independently testable;
      UI/data decoupled

## Phase 0: Research

Outputs: /Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/research.md

## Phase 1: Design & Contracts

Outputs:
- /Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/data-model.md
- /Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/contracts/wordmark-api.yaml
- /Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/quickstart.md

## Post-Design Constitution Check

- [x] Scope, privacy, UX, performance, security, engineering, and testability gates remain satisfied

## Project Structure

### Documentation (this feature)

```text
specs/001-wordmark-mvp-spec/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── wordmark-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── background/
├── content/
├── popup/
├── options/
├── shared/
└── assets/

manifest.json

tests/
├── unit/
│   └── word-logic/
└── integration/
    └── extension-flows/
```

**Structure Decision**: Single MV3 extension project with explicit background/content/popup/options
modules and shared logic isolated for unit testing.

## Complexity Tracking

No constitution violations identified.
