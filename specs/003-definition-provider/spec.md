# Feature Specification: Online English Definition Backfill (Spec 003)

**Feature Branch**: `003-definition-provider`  
**Created**: 2025-12-27  
**Status**: Draft  
**Input**: User description: "Spec 002 enhancement：英文释义来源升级 优先使用本地 dictionary definition。 若 dictionary miss，则调用在线 provider 生成 “English definition (short)”（1–2 sentences, plain text, no markdown). 再将该 English definition 翻译成中文并展示在其下方。 要求：有缓存（至少 session cache），失败兜底清晰；不允许注入 HTML；不得阻塞 UI（先显示 loading/占位）。"

## Context *(non-normative)*

Spec 001 (WordMark MVP) is complete and frozen. Spec 002 adds optional Chinese translation and is
also additive. This spec extends the “definition availability” experience without turning WordMark
into a full dictionary or general translator:

- Prefer the local embedded dictionary for English definitions.
- When the local dictionary is missing a definition, optionally backfill with a short online English
  definition (opt-in only), and show a Chinese translation of that English definition below it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See an English definition even when local dictionary misses (Priority: P1)

While reading, users need a quick English definition to confirm meaning. When the local embedded
dictionary does not include the selected word, the product should still provide a useful definition
without changing Spec 001’s default offline behavior.

**Why this priority**: It directly improves the “quick lookup” value in real reading situations,
where the embedded dictionary is incomplete.

**Independent Test**: With the feature disabled (default), lookups behave like Spec 001. With the
feature enabled and configured, looking up a word that is not in the local dictionary shows a short
English definition and its Chinese translation without blocking the overlay.

**Acceptance Scenarios**:

1. **Given** the optional online enhancement is disabled (default), **When** the user triggers a lookup
   for a word missing from the local dictionary, **Then** the lookup remains usable, shows
   “Definition unavailable.” for the English definition, and performs no network activity for
   definition backfill.
2. **Given** the optional online enhancement is enabled and configured, **When** the user triggers a
   lookup for a word missing from the local dictionary, **Then** the UI shows a non-blocking loading
   state for the missing definition and later updates to show a short plain-text English definition
   and its Chinese translation below it.
3. **Given** the local dictionary contains a definition, **When** the user triggers a lookup, **Then**
   the shown English definition is the local definition (no online definition backfill required).

---

### User Story 2 - Avoid repeated waiting via session caching (Priority: P2)

When users encounter the same unfamiliar word multiple times on a page, they should not repeatedly
wait for the same definition backfill.

**Why this priority**: It reduces latency, cost, and user frustration during real reading flows.

**Independent Test**: With the feature enabled, look up a missing-definition word twice in the same
session; the second lookup shows the previously obtained English definition + Chinese translation
immediately (no loading state needed for the cached result).

**Acceptance Scenarios**:

1. **Given** the feature is enabled and a backfilled definition was previously obtained for a word in
   the current session, **When** the user looks up the same word again, **Then** the UI shows the
   backfilled English definition and its Chinese translation immediately.

---

### User Story 3 - Clear fallback when the online enhancement fails (Priority: P3)

Online services can fail (offline, quota, provider errors). The product must remain usable and
communicate failure clearly.

**Why this priority**: Reliability and trust are critical for a reading-time tool, especially when
network is optional.

**Independent Test**: Enable the feature but simulate failure (invalid configuration or provider
error). The overlay remains usable, and failure messaging is short and actionable.

**Acceptance Scenarios**:

1. **Given** the feature is enabled but not configured, **When** the user triggers a lookup for a
   missing-definition word, **Then** the UI shows a clear “not configured” state for definition
   backfill and the lookup remains usable.
2. **Given** the feature is enabled and configured but the online request fails, **When** the user
   triggers a lookup for a missing-definition word, **Then** the UI shows a short failure state and a
   clear retry hint, without blocking the page or breaking lookup/highlight/popup behaviors.

### Edge Cases

- Provider returns an empty/overlong response: treat as unavailable and show a clear fallback message.
- Provider returns formatted text (markdown) or HTML: display as plain text only; no formatting is
  rendered.
- Rapid repeated lookups: avoid repeated requests for the same word via caching and/or de-duplication.
- User disables the feature during an in-flight request: stop further updates and revert to the local
  definition-only UI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: With the optional online enhancement disabled (default), the system MUST behave
  equivalently to Spec 001/Spec 002 baseline behavior (no definition backfill requests, no new user
  flows).
- **FR-002**: The system MUST prefer the embedded local dictionary definition when available.
- **FR-003**: If the local dictionary has no definition and the optional online enhancement is enabled
  and configured, the system MUST request a short English definition for the word.
- **FR-004**: The backfilled English definition MUST be plain text (no markdown), 1–2 sentences, and
  safe to display without rendering any HTML.
- **FR-005**: The system MUST produce and display a Chinese translation of the backfilled English
  definition beneath the English definition.
- **FR-006**: The UI MUST show a non-blocking loading/placeholder state while definition backfill and
  translation are in progress; base lookup UI remains responsive.
- **FR-007**: The system MUST cache definition backfill results for at least the current session to
  avoid repeated requests for the same word.
- **FR-008**: Failure handling MUST be explicit and user-friendly: when backfill/translation fails, the
  system MUST show a short “unavailable” state plus a clear retry hint; it MUST NOT block or degrade
  Spec 001/Spec 002 lookup, highlight, or popup behaviors.
- **FR-009**: Data minimization MUST be enforced: online requests MUST send only the minimal data
  needed for the single-word definition/translation (no page context, no selection context, no word
  list).

### Non-Functional Requirements

- **NFR-001**: The lookup overlay MUST appear promptly and remain interactive; any online enhancement
  work MUST be asynchronous and MUST NOT block the page.
- **NFR-002**: No untrusted HTML may be injected or rendered; online content is treated as plain text.

### Constitution Constraints *(mandatory)*

- **CC-001**: Feature MUST stay within reading-time vocabulary marking/memory scope; definition
  backfill is limited to already-looked-up single words.
- **CC-002**: Privacy default: local-only; any online definition backfill MUST be opt-in and comply
  with data minimization and safe credential handling.
- **CC-003**: UX: lookup via shortcut remains fast and non-blocking; the overlay remains unobtrusive
  and easy to close.
- **CC-004**: Performance: no main-thread blocking; no new page scanning work introduced.
- **CC-005**: Security: do not inject untrusted HTML; credentials are stored locally and are never
  logged or exposed to page scripts.
- **CC-006**: Engineering & tests: keep background/content/options boundaries; definition backfill,
  caching, and failure mapping are independently testable.

### Key Entities *(include if feature involves data)*

- **DefinitionBackfillPreference**: User-controlled enable/disable state for the optional online
  enhancement, and the minimum configuration needed to use it.
- **BackfilledDefinition**: The short English definition and its Chinese translation shown in the
  lookup overlay for a specific word.
- **DefinitionBackfillCacheEntry**: A temporary (session-scoped) cached backfill result keyed by word.

## Out of Scope

- Full dictionary coverage or long-form definitions
- Explaining words in the context of the page or sending surrounding text to an online service
- Changing Spec 001 word counting, normalization, highlight behavior, or popup list behavior
- Background/batch processing of multiple words

## Dependencies

- Spec 001 remains stable and unchanged.
- Online definition backfill requires explicit user opt-in and configuration; without opt-in, the
  feature remains local-only.

## Assumptions

- A short, plain-text English definition is sufficient for the “reading-time” use case.
- Session caching is acceptable and does not need to persist across browser restarts for MVP.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the optional online enhancement disabled (default), Spec 001 smoke tests pass
  unchanged and no online requests occur for lookups.
- **SC-002**: With the feature enabled and configured, users can successfully obtain a short English
  definition and a Chinese translation for missing-definition words during normal lookup flows.
- **SC-003**: Repeat lookups of the same missing-definition word in the same session show results
  without a noticeable wait (cache-backed).
- **SC-004**: When offline/quota exceeded/timeout occurs, the lookup overlay remains usable and shows
  a clear “unavailable” state with a retry hint.
