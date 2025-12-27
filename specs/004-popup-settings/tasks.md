# Tasks: Popup Settings Entry and Centered Count

**Input**: Design documents from `/specs/004-popup-settings/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Minimal manual checks requested unless necessary; include targeted smoke steps per task.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm workspace ready for popup work

- [x] T001 Ensure dependencies and scripts run: `npm install` if needed, then `npm run build` in repo root using `package.json` to verify toolchain.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None required beyond setup for this UI-only change

---

## Phase 3: User Story 1 - Open settings from popup (Priority: P1) 🎯 MVP

**Goal**: Settings icon in popup header opens extension options page with MV3-friendly fallback.

**Independent Test**: Open popup, click settings icon; options page appears (or focuses) without errors.

### Implementation for User Story 1

- [x] T002 [US1] Add settings control in header and wire click handler with `chrome.runtime.openOptionsPage()` fallback to `chrome.tabs.create({ url: chrome.runtime.getURL("options/options.html") })` in `src/popup/popup.html`, `src/popup/styles.css`, and `src/popup/index.ts`; acceptance: clicking icon from popup always presents options page without console errors.

---

## Phase 4: User Story 2 - See total word count at a glance (Priority: P2)

**Goal**: Total word count is centered and stays accurate as list changes.

**Independent Test**: Open popup and observe centered total; add/delete words and confirm count updates and remains centered.

### Implementation for User Story 2

- [x] T003 [US2] Center the word count in the header layout and keep settings icon anchored right; ensure count text derives from `words.length` and updates after refresh via `renderList`/`refreshWords` in `src/popup/popup.html`, `src/popup/styles.css`, and `src/popup/index.ts`; acceptance: centered count reflects additions/deletions within popup session.

---

## Phase 5: User Story 3 - Keep current popup flows intact (Priority: P3)

**Goal**: Existing toggle/search/list/delete flows continue to work with new header layout.

**Independent Test**: Run smoke flows with updated header.

### Verification for User Story 3

- [x] T004 [US3] Manual smoke: in popup exercise highlight toggle, search, list rendering, delete; confirm no regressions or console errors while header shows centered count and settings icon per `specs/004-popup-settings/quickstart.md` and `src/popup/index.ts`.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: None beyond targeted smoke in this scope; rely on quickstart checks.

---

## Dependencies & Execution Order

- Setup (T001) precedes story work.
- US1 (T002) precedes US2 (T003) because header structure/layout affects centered count.
- US3 verification (T004) runs after US1–US2 to validate regressions.

## Parallel Opportunities

- None recommended; changes touch the same popup header files. Run sequentially to avoid merge conflicts.

## Implementation Strategy

- Deliver MVP via US1 (settings opener + icon) first, then US2 (centered count), then US3 smoke validation. Keep changes minimal to popup header and script, avoiding new permissions.
