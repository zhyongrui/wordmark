---
description: "Tasks for Spec 003 implementation"
---

# Tasks: Online English Definition Backfill (Spec 003)

**Input**: Design documents from `/specs/003-definition-provider/`  
**Prerequisites**: `specs/003-definition-provider/plan.md`, `specs/003-definition-provider/spec.md`, `specs/003-definition-provider/contracts/`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared contracts/types needed across the feature

- [x] T001 Add `DefinitionSource` marker (`local|generated`) and definition backfill message types in `src/shared/messages.ts` (thread through lookup payload in `src/background/handlers/lookup.ts` and `src/content/index.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Provider API surface and plain-text safety utilities (required before wiring background/content)

- [x] T002 Implement `generateDefinition` provider API + sanitization utilities in `src/shared/definition/providers/gemini.ts` (and `src/shared/definition/types.ts`, `src/shared/definition/sanitize.ts`, `src/shared/definition/providers/provider.ts`)

---

## Phase 3: User Story 1 - See an English definition even when local dictionary misses (Priority: P1) 🎯 MVP

**Goal**: For dictionary misses (and only when opt-in is enabled), backfill a short English definition and its Chinese translation without blocking the overlay.

**Independent Test**: Enable translation + API key, look up a word missing from the embedded dictionary; see loading → short English definition + Chinese translation.

### Implementation for User Story 1

- [x] T003 [US1] Implement background backfill flow (dictionary miss → generate definitionEn → translate to zh → return {definitionEn, definitionSource, definitionZh}) in `src/background/handlers/definition-backfill.ts` (route via `src/background/index.ts`)
- [x] T004 [US1] Render loading/success states for generated definition (definitionEn + definitionZh) in `src/content/lookup-overlay.ts` (trigger/request wiring in `src/content/index.ts`)

---

## Phase 4: User Story 2 - Avoid repeated waiting via session caching (Priority: P2)

**Goal**: Cache backfilled results so repeated lookups in the same session do not re-request the provider.

**Independent Test**: Look up the same missing-definition word twice; second lookup shows immediately (no loading).

### Implementation for User Story 2

- [x] T005 [US2] Add in-memory cache (at least `Map`, preferably TTL) for backfill results in `src/background/handlers/definition-backfill.ts`

---

## Phase 5: User Story 3 - Clear fallback when the online enhancement fails (Priority: P3)

**Goal**: On errors/not configured, show a short, actionable fallback and allow user-triggered retry (shortcut).

**Independent Test**: Enable translation but remove API key (or simulate provider error) and verify the overlay shows a short error + retry hint, without breaking lookup.

### Implementation for User Story 3

- [x] T006 [US3] Add failure fallback UI mapping in `src/content/lookup-overlay.ts` + optional unit test for cache-hit/fallback branch in `tests/unit/definition/definition-backfill.test.ts`

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Keep Spec 001/002 behavior stable and validate docs

Manual validation: run `specs/003-definition-provider/quickstart.md` after completing US1–US3.

---

## Dependencies & Execution Order

- Complete Phase 1 → Phase 2 → Phase 3 before starting caching work.
- US2 depends on the US1 background backfill pipeline.
- US3 can be done after US1; tests should cover at least one cache-hit or fallback branch.
