---

description: "Task list for WordMark MVP implementation"
---

# Tasks: WordMark MVP

**Input**: Design documents from `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/`
**Prerequisites**: /Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/plan.md
(required), /Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/spec.md (required
for user stories), /Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/research.md,
/Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/data-model.md,
/Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/contracts/

**Tests**: Tests are REQUIRED for word normalization, counting, sorting, and other core word logic
per the constitution; only these tests are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `/Users/zhaoyongrui/Desktop/Code/wordmark/src/`,
  `/Users/zhaoyongrui/Desktop/Code/wordmark/tests/` at repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per plan in /Users/zhaoyongrui/Desktop/Code/wordmark/src/
  (background/content/popup/options/shared/assets) and
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/ (unit/word-logic, integration/extension-flows)
- [x] T002 Initialize Node project and scripts in /Users/zhaoyongrui/Desktop/Code/wordmark/package.json
  (build, test, lint, typecheck)
- [x] T003 [P] Create TypeScript config in /Users/zhaoyongrui/Desktop/Code/wordmark/tsconfig.json
- [x] T004 [P] Add build configuration in /Users/zhaoyongrui/Desktop/Code/wordmark/esbuild.config.mjs
  to emit bundles into /Users/zhaoyongrui/Desktop/Code/wordmark/dist/
- [x] T005 [P] Add test runner config in /Users/zhaoyongrui/Desktop/Code/wordmark/vitest.config.ts
  and /Users/zhaoyongrui/Desktop/Code/wordmark/tests/setup.ts
- [x] T006 [P] Configure lint/format in /Users/zhaoyongrui/Desktop/Code/wordmark/.eslintrc.cjs and
  /Users/zhaoyongrui/Desktop/Code/wordmark/.prettierrc

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create MV3 manifest in /Users/zhaoyongrui/Desktop/Code/wordmark/manifest.json
  (service worker, content script, action popup, options page, commands, permissions)
- [x] T008 [P] Define storage schema version in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/storage/schema.ts
- [x] T009 [P] Implement storage migration helper in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/storage/migrate.ts
- [x] T010 [P] Implement word normalization utility in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/word/normalize.ts
- [x] T011 [P] Implement word store CRUD + counters in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/word/store.ts
- [x] T012 [P] Implement preferences store in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/preferences.ts
- [x] T013 [P] Define message contracts in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/messages.ts
- [x] T014 [P] Add dictionary dataset and loader in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/assets/dictionary-basic.json and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/dictionary.ts
- [x] T015 Create background router in /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/index.ts
- [x] T016 Create content script bootstrap in /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/index.ts
- [x] T017 [P] Create popup scaffolding in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/popup/popup.html,
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/popup/index.ts, and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/popup/styles.css
- [x] T018 [P] Create options scaffolding in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/options/options.html and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/options/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 快速查词并记录 (Priority: P1) 🎯 MVP

**Goal**: Hotkey lookup of a selected word with definition/pronunciation and persisted counts.

**Independent Test**: On any English page, select a word and trigger the shortcut; definition
appears, pronunciation plays, and repeated lookups increment count and update last queried time.

### Tests for User Story 1 (required for core word logic) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T019 [P] [US1] Add normalization + selection validation tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/word-logic/normalize.test.ts
- [x] T020 [P] [US1] Add query count + lastQueriedAt tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/word-logic/store-counting.test.ts
- [x] T021 [P] [US1] Add lookup result shaping tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/word-logic/lookup-result.test.ts

### Implementation for User Story 1

- [x] T022 [P] [US1] Implement dictionary lookup logic in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/dictionary.ts
- [x] T023 [P] [US1] Implement lookup handler in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/handlers/lookup.ts
- [x] T024 [US1] Wire lookup handler into
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/index.ts
- [x] T025 [P] [US1] Implement selection capture and command trigger in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/index.ts
- [x] T026 [P] [US1] Implement safe lookup overlay UI in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/lookup-overlay.ts and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/lookup-overlay.css
- [x] T027 [P] [US1] Implement pronunciation playback in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/pronounce.ts
- [x] T028 [US1] Connect content script to background lookup and render results in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/index.ts

**Checkpoint**: User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - 页面高亮与关闭 (Priority: P2)

**Goal**: Highlight previously queried words on the page with a one-click disable.

**Independent Test**: With stored words present, open a page containing those words, observe
low-interference highlights, and disable them with a single action.

### Tests for User Story 2

No automated tests required for this story; validate via manual smoke test.

### Implementation for User Story 2

- [x] T029 [P] [US2] Implement highlight engine with incremental scanning and ignored nodes in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/highlight.ts
- [x] T030 [P] [US2] Implement highlight toggle UI and preference sync in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/highlight-toggle.ts
- [x] T031 [P] [US2] Implement word list and preference handlers in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/handlers/words.ts and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/handlers/preferences.ts
- [x] T032 [US2] Wire handlers into
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/index.ts
- [x] T033 [US2] Connect content script to word list + preference updates in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/index.ts
- [x] T034 [US2] Update highlight list on word delete events in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/highlight.ts and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/index.ts

**Checkpoint**: User Story 2 is fully functional and testable independently

---

## Phase 5: User Story 3 - Popup 词表管理 (Priority: P3)

**Goal**: Popup lists all words sorted by count, with search and delete.

**Independent Test**: With multiple entries, open popup to verify sort order, search filtering, and
removal updates the list.

### Tests for User Story 3 (required for core word logic) ⚠️

- [x] T035 [P] [US3] Add sorting + search filtering tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/word-logic/sort-filter.test.ts
- [x] T036 [P] [US3] Add delete behavior tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/word-logic/delete.test.ts

### Implementation for User Story 3

- [x] T037 [P] [US3] Implement popup list rendering + empty state in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/popup/index.ts
- [x] T038 [P] [US3] Implement popup search filtering + delete interactions in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/popup/index.ts
- [x] T039 [US3] Wire popup to background list/delete APIs in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/popup/index.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T040 [P] Document smoke test steps in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/integration/extension-flows/smoke-test.md
- [x] T041 [P] Tune highlight batch size/throttle constants in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/highlight.ts
- [x] T042 [P] Security audit: ensure safe rendering via textContent in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/lookup-overlay.ts and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/popup/index.ts
- [x] T043 [P] Validate quickstart steps and update
  /Users/zhaoyongrui/Desktop/Code/wordmark/specs/001-wordmark-mvp-spec/quickstart.md if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - can be tested with seeded data
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - can be tested with seeded data

### Dependency Graph

Setup (T001-T006)
→ Foundational (T007-T018)
→ {User Story 1 (T019-T028), User Story 2 (T029-T034), User Story 3 (T035-T039)}
→ Polish (T040-T043)

### Within Each User Story

- Tests (when required) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel
- All tests for a user story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
Task: "Add normalization + selection validation tests in /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/word-logic/normalize.test.ts"
Task: "Add query count + lastQueriedAt tests in /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/word-logic/store-counting.test.ts"
Task: "Implement safe lookup overlay UI in /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/lookup-overlay.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Implement highlight engine with incremental scanning in /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/highlight.ts"
Task: "Implement highlight toggle UI in /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/highlight-toggle.ts"
Task: "Implement word list and preference handlers in /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/handlers/words.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add sorting + search filtering tests in /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/word-logic/sort-filter.test.ts"
Task: "Implement popup list rendering in /Users/zhaoyongrui/Desktop/Code/wordmark/src/popup/index.ts"
Task: "Implement popup search filtering + delete interactions in /Users/zhaoyongrui/Desktop/Code/wordmark/src/popup/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
