---

description: "Task list for Optional Translation (Chinese) (Spec 002)"

---

# Tasks: Optional Translation (Chinese) (Spec 002)

**Input**: Design documents from `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/`
**Prerequisites**: `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/plan.md`
(required), `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/spec.md` (required for
user stories), `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/research.md`,
`/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/data-model.md`,
`/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/contracts/`,
`/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/quickstart.md`

**Tests**: Tests are REQUIRED for translation core logic, in-session cache/de-dup behavior, and
degradation/fallback behavior (disabled/no-key/offline/quota/timeout/provider error). This enforces:
default-off networking, safe API key handling, and “no break” guarantees for Spec 001.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Every task includes explicit acceptance criteria (AC) in the description.

## Path Conventions

- **Single project**: `/Users/zhaoyongrui/Desktop/Code/wordmark/src/`,
  `/Users/zhaoyongrui/Desktop/Code/wordmark/tests/` at repository root

---

## Phase 1: Setup (Translation Scaffolding)

**Purpose**: Add isolated Spec 002 scaffolding without changing Spec 001 behaviors.

- [ ] T001 [P] Create translation shared module skeleton in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/translation/ (types/settings/secrets/providers)
  plus in-session cache helper placeholder in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/translation/cache.ts; AC: `npm run typecheck`
  passes and nothing is wired into runtime yet.
- [ ] T002 [P] Add translation message type(s) in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/messages.ts; AC: existing message type strings
  are unchanged; new types are additive (e.g., `translation:request`) and do not include secrets.
- [ ] T003 [P] Create translation handler skeleton in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/handlers/translation.ts; AC: file compiles,
  returns `{ ok: false, error: "not-implemented" }` (or equivalent) and is not wired yet (no behavior changes).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Settings/secrets storage + in-session cache/de-dup + handler wiring required before any
UI can request translation.

### Tests for Foundational (write first; must fail before implementation) ⚠️

- [ ] T004 [P] Add translation settings unit tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/translation/settings.test.ts; AC: tests assert
  default `enabled=false`, provider selection is stored, and write/read round-trips; tests FAIL with placeholders.
- [ ] T005 [P] Add translation secrets unit tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/translation/secrets.test.ts; AC: tests assert
  set/clear semantics, `hasApiKey()` toggles correctly, and storage uses a dedicated key; tests FAIL with placeholders.
- [ ] T006 [P] Add in-session cache/de-dup unit tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/translation/cache.test.ts; AC: tests assert
  (a) identical concurrent requests share one underlying call (de-dup), (b) after completion, a new
  request triggers a new call (no persistent cache); tests FAIL with placeholders.
- [ ] T007 [P] Add background translation gating unit tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/translation/handler-gating.test.ts; AC: tests
  verify (a) when disabled, handler returns `disabled` and does NOT call `fetch`, (b) when enabled but
  no API key, returns `not_configured` and does NOT call `fetch`; tests FAIL with placeholders.
- [ ] T008 [P] Add degradation mapping unit tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/translation/error-mapping.test.ts; AC: tests
  verify offline/quota/timeout/provider-error conditions map to stable error codes (no throwing), and
  can be rendered safely (no secrets in messages); tests FAIL with placeholders.

### Core Infrastructure

- [ ] T009 [P] Define translation request/response types + error codes in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/translation/types.ts; AC: types are used by both
  background handler and UI wiring; errors cover at least `disabled`, `not_configured`, `offline`,
  `quota_exceeded`, `timeout`, `provider_error`.
- [ ] T010 Implement translation settings storage in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/translation/settings.ts; AC: T004 passes; default
  is disabled; storage key is separate from `wordmark:storage`; no Spec 001 data semantics are changed.
- [ ] T011 Implement translation API key storage in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/translation/secrets.ts; AC: T005 passes; key is
  stored only in `chrome.storage.local` under a dedicated key, never logged, and never exposed to page scripts.
- [ ] T012 Implement in-session cache/de-dup helper in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/translation/cache.ts; AC: T006 passes; helper is
  pure/in-memory (no persistent storage); prevents duplicate in-flight identical requests within a
  short window/session.
- [ ] T013 [P] Define provider interface in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/translation/providers/provider.ts; AC: interface
  supports pluggable providers and enforces minimal input fields (word + optional definition only).
- [ ] T014 Implement translation handler gating in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/handlers/translation.ts; AC: T007 passes; when
  disabled or missing key, handler returns a stable `{ ok: false, error }` response and does not throw.
- [ ] T015 Wire translation handler into /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/index.ts;
  AC: new message case is additive; existing Spec 001 message routing remains unchanged.

**Checkpoint**: Translation settings/secrets + message wiring are ready; no UI changes yet; default remains disabled.

---

## Phase 3: User Story 1 - On-demand Chinese translation for word + definition (Priority: P1) 🎯 MVP

**Goal**: Users can explicitly request Chinese translation for the looked-up word and (when present)
its English definition, without changing Spec 001 behaviors.

**Independent Test**: With translation enabled and API key configured, perform a normal Spec 001
lookup, then explicitly request translation in the lookup UI and see labeled Chinese translations;
disable translation and confirm Spec 001 behavior reverts unchanged.

### Tests for User Story 1 (write first; must fail before implementation) ⚠️

- [ ] T016 [P] [US1] Add provider adapter unit tests (Gemini) in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/translation/provider-gemini.test.ts; AC: tests
  mock `fetch` to assert request payload contains only word/definition (no page context), supports
  timeout via `AbortController`, and maps offline/quota/timeout/provider errors to stable codes; tests
  FAIL before implementation.
- [ ] T017 [P] [US1] Add translation handler “happy path” + degrade unit tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/translation/handler-success.test.ts; AC: tests
  verify enabled+configured handler returns translated strings for (a) word only and (b) word+definition,
  integrates in-session de-dup, and maps provider failures to stable error codes; tests FAIL before implementation.

### Implementation for User Story 1

- [ ] T018 [P] [US1] Implement Gemini provider adapter in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/shared/translation/providers/gemini.ts; AC: T016 passes;
  adapter uses minimal request payload, supports timeout/abort, and never logs API keys or request bodies.
- [ ] T019 [US1] Implement translation execution + error mapping in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/background/handlers/translation.ts; AC: T017 passes;
  offline/quota/timeout/provider errors map to clear UI-safe codes (see T008); no automatic retries.
- [ ] T020 [P] [US1] Add translation UI surface (button + labeled sections) in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/lookup-overlay.ts and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/lookup-overlay.css; AC: all rendering uses safe
  DOM APIs (`textContent`); translation UI is visually distinct and does not break base overlay layout.
- [ ] T021 [US1] Wire overlay translation action to background request in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/index.ts and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/lookup-overlay.ts; AC: translation is only
  triggered by explicit user action; base lookup result shows immediately; show loading + failure states.
- [ ] T022 [US1] Add minimal provider host access (if required) in
  /Users/zhaoyongrui/Desktop/Code/wordmark/manifest.json; AC: host permissions are limited to the
  provider endpoint only (no broad wildcards); translation remains disabled by default.

**Checkpoint**: User Story 1 is functional and independently testable via manual lookup + translate.

---

## Phase 4: User Story 2 - Translation settings & consent (Priority: P2)

**Goal**: Users can enable/disable translation globally and configure API key safely, with explicit
opt-in and immediate disable behavior.

**Independent Test**: Translation is disabled by default. Without enabling and without an API key,
there are no translation requests. When enabled, users can set/clear API key. Disabling translation
immediately removes translation entry points and in-flight requests do not break the app.

### Tests for User Story 2 (write first; must fail before implementation) ⚠️

- [ ] T023 [P] [US2] Add translation status logic unit tests in
  /Users/zhaoyongrui/Desktop/Code/wordmark/tests/unit/translation/status.test.ts; AC: tests verify a
  helper (e.g., `getTranslationAvailability`) returns `{ enabled, configured }` based on settings + key
  presence and drives “entry points unavailable when disabled”; tests FAIL before implementation.

### Implementation for User Story 2

- [ ] T024 [US2] Implement translation settings + API key UI in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/options/options.html and
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/options/index.ts; AC: default is OFF; enabling is an
  explicit user action; API key can be set/cleared; UI text explains data minimization + opt-in; key is
  not printed or logged.
- [ ] T025 [US2] Implement translation entry-point gating in
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/index.ts (and/or
  /Users/zhaoyongrui/Desktop/Code/wordmark/src/content/lookup-overlay.ts); AC: when disabled, the
  translate button/controls are unavailable; when enabled but not configured, UI provides a safe prompt
  to configure; disabling during in-flight requests keeps overlay stable.

**Checkpoint**: User Story 2 completes explicit opt-in, key handling, and safe disable behavior.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Hardening and validation to ensure Spec 001 remains unchanged and Spec 002 stays safe.

- [ ] T026 [P] Update Spec 002 manual verification steps in
  /Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/quickstart.md; AC: includes (a) Spec 001
  regression run with translation disabled (no networking), (b) translation happy path, (c) offline/quota/timeout
  failure states without breaking Spec 001.
- [ ] T027 [P] Add Spec 002 security audit record in
  /Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/checklists/security-audit.md; AC:
  documents that translation UI uses safe DOM rendering (`textContent`), no secrets are logged, and content scripts
  never access API keys.
- [ ] T028 [P] Record validation results (tests/lint/typecheck) in
  /Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/quickstart.md; AC: `npm test`,
  `npm run lint`, and `npm run typecheck` pass; Spec 001 smoke test passes unchanged with translation disabled.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately; should not change behaviors
- **Foundational (Phase 2)**: Blocks all user story work until settings/secrets + wiring exist
- **US1 (Phase 3)**: Depends on Foundational completion
- **US2 (Phase 4)**: Depends on Foundational completion; must remain default-off and safe when unconfigured
- **Polish (Phase N)**: After desired user stories are complete

### Dependency Graph

Setup (T001-T003)
→ Foundational (T004-T015)
→ {US1 (T016-T022), US2 (T023-T025)}
→ Polish (T026-T028)

### Parallel Opportunities

- T004/T005/T006/T007/T008 can be written in parallel (different test files)
- T009/T010/T011/T012/T013 can be implemented in parallel after tests exist (different files)
- T016/T017 can be written in parallel (different test files)
- T020 can be done in parallel with T018/T019 once message + handler wiring exists (UI vs provider)
- T026/T027 can be parallel in Phase N (docs vs audit)

---

## Parallel Examples

### Foundational

```text
T004 (settings tests) + T005 (secrets tests) + T006 (cache tests) + T007 (gating tests) + T008 (error mapping tests)
```

### User Story 1

```text
T016 (provider adapter tests) + T017 (handler success tests)
```

### User Story 2

```text
T023 (status tests) → then T024 (options UI) + T025 (entry-point gating)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1–2 (T001–T015)
2. Complete US1 (T016–T022)
3. **STOP and VALIDATE** via `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/quickstart.md`

### Incremental Delivery

1. US1 delivers on-demand translation behind explicit opt-in (default OFF)
2. US2 hardens settings/API key flows and ensures safe disable + entry-point gating
