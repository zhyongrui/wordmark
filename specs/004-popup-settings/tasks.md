# Tasks: Popup Settings Entry and Centered Count (UI polish)

**Input**: Design documents from `/specs/004-popup-settings/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Manual smoke where noted; no new automated tests required.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions and acceptance points

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm workspace ready (reuse existing setup)

- [x] T001 Confirm toolchain still builds: run `npm run build` (no code changes) to ensure baseline passes.

---

## Phase 3: User Story 1 - Open settings from popup (Priority: P1) 🎯 MVP

**Goal**: Borderless gear with larger visual size/hit area opens options reliably.

**Independent Test**: Open popup, click gear; options page opens/focuses without errors.

### Implementation for User Story 1

- [x] T002 [US1] Update gear icon appearance and hit area in `src/popup/popup.html` and `src/popup/styles.css` to be borderless, visually ~18–22px, with clickable area ≥32×32 while keeping top-right placement; acceptance: icon renders as a clean gear glyph without border/background, hot zone meets size, no overlap issues.
- [x] T003 [US1] Ensure options opener still works after styling changes in `src/popup/index.ts` (no behavior change, just verify handler remains wired); acceptance: click opens options page (or fallback tab) with no popup console errors.

---

## Phase 4: User Story 2 - See total word count at a glance (Priority: P2)

**Goal**: Count sits on same row immediately left of gear with 6–10px spacing; updates with list changes.

**Independent Test**: Open popup; count appears beside gear (not centered). Add/delete words; count updates and alignment holds.

### Implementation for User Story 2

- [x] T004 [US2] Adjust header layout/alignment in `src/popup/popup.html` and `src/popup/styles.css` so the count is on the same row to the left of the gear with ~6–10px gap, vertically centered, not centered across the header; acceptance: count and gear align as specified for empty and non-empty lists.
- [x] T005 [US2] Keep count rendering logic in `src/popup/index.ts` tied to `words.length` with readable singular/plural text; acceptance: count beside gear reflects add/delete within one second, no regressions to list/render/search/delete.

---

## Phase 5: User Story 3 - Keep current popup flows intact (Priority: P3)

**Goal**: Existing popup behaviors remain unaffected.

**Independent Test**: Smoke key flows with updated header.

### Verification for User Story 3

- [x] T006 [US3] Update manual smoke checklist in `tests/integration/extension-flows/smoke-test.md` to reflect new gear/count alignment and run through highlight toggle, search, list rendering, delete, and options click; acceptance: instructions include gear/count checks and no regressions observed during run.

---

## Dependencies & Execution Order

- Setup (T001) is already completed. Execute US1 (T002–T003) before US2 (T004–T005) to lock header structure, then US3 (T006) for smoke verification.

## Parallel Opportunities

- None recommended: same header files touched; proceed sequentially.

## Implementation Strategy

- Minimal DOM/CSS edits for gear/count alignment; retain existing opener handler. Validate via manual smoke per updated checklist.
