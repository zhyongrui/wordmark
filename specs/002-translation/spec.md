# Feature Specification: Optional Translation (Chinese) (Spec 002)

**Feature Branch**: `002-translation`  
**Created**: 2025-12-26  
**Status**: Draft  
**Input**: User description: "Spec name: 002-translation Goal: Add optional translation support for looked-up words without changing or extending the existing MVP behavior defined in Spec 001. Scope: Provide Chinese translation for the queried English word and the English definition text (if present). Translation is additive; all existing lookup, highlight, and popup behaviors remain unchanged. Translation is triggered only in contexts explicitly defined by this spec (no automatic background translation). Non-Goals: No changes to word counting/normalization/storage semantics from Spec 001. No learning system/spaced repetition/note-taking. No modification of Spec 001 UI flows unless explicitly stated here. Technical Constraints: Network access is allowed only for translation requests and must be explicitly scoped. Translation provider is pluggable (initial target specified in the prompt). All translation calls must be optional and gracefully fail (offline/quota exceeded). No blocking UI; translation may be async or deferred. User Experience: User can request translation for a word/definition they are already viewing; translated content is clearly labeled and visually distinct; users can enable/disable translation globally. Open Questions: where translation is displayed; caching policy; API key configuration flow/storage."

## Context *(non-normative)*

Spec 001 (WordMark MVP v0.1) is complete and frozen. Spec 002 is a strictly additive feature that:

- Does NOT change Spec 001 lookup, highlighting, or popup list behaviors.
- Does NOT change Spec 001 counting/normalization/storage semantics.
- Adds an optional, explicitly user-triggered translation capability for already-looked-up content.

## Clarifications

### Session 2025-12-26

- Q: Where is translation displayed — lookup overlay, popup, or both? → A: Lookup overlay only (popup remains unchanged).
- Q: Cache policy and retention — no cache vs TTL vs until clear → A: No persistent cache in MVP (optional in-session de-dup only).
- Q: API key configuration surface (options vs popup) and storage location within local extension storage → A: Options page only; stored locally under a dedicated key; never exposed to content scripts.

### Session 2025-12-27

- Q: When translation is enabled, should lookup automatically translate on every shortcut-triggered overlay open (no Translate button)? → A: Yes; opening the lookup overlay via the existing shortcut automatically triggers translation for the looked-up word and (if present) the English definition. Remove the Translate button.
- Q: Should the UI/layout changes apply when translation is disabled? → A: No; when translation is disabled, the lookup overlay UI/behavior remains identical to Spec 001 (no layout changes and no translation networking).
- Q: Cache strategy — none vs in-memory TTL vs persistent → A: In-memory TTL cache in the background for translation results keyed by (word, definition text, target language); TTL ~10–30 minutes; never persisted to disk.
- Q: Failure retry behavior when translation fails (Translate button removed) → A: No automatic retries; show a short error + “press the shortcut again to retry”.
- Q: If the English definition is unavailable, should translation still be attempted? → A: Yes; attempt word translation; keep “Definition unavailable.” for the English definition, and omit the definition-translation block.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - On-demand Chinese translation for word + definition (Priority: P1)

While reading, users sometimes want a Chinese translation of the English word they just looked up,
and (when present) a Chinese translation of the English definition text, without turning the
product into a general translator.

**Why this priority**: It delivers the core translation value while preserving Spec 001 behavior and
privacy defaults when translation is disabled.

**Independent Test**: With Spec 001 already working, user enables translation, triggers a lookup,
requests translation for the displayed word/definition, sees labeled translated content, and can
disable translation to revert to pure Spec 001 behavior.

**Acceptance Scenarios**:

1. **Given** translation is disabled, **When** the user performs Spec 001 flows (lookup/highlight/popup),
   **Then** behavior remains unchanged and no translation network activity occurs.
2. **Given** translation is enabled and configured, **When** the user opens the lookup overlay via the
   existing WordMark shortcut for a looked-up word (with an English definition when available),
   **Then** the system automatically fetches and displays Chinese translations for (a) the word and (b)
   the definition text (if present), clearly labeled and visually distinct, without requiring a Translate click.
3. **Given** translation is enabled but the device is offline or a quota limit is hit, **When** the user
   opens the lookup overlay via the shortcut, **Then** the translation attempt fails gracefully with a
   clear “unavailable” state (and a retry hint) and the original lookup/highlight/popup behaviors remain
   fully usable.
4. **Given** a translation request is in progress, **When** the user continues interacting with the page,
   **Then** the UI remains responsive and the base lookup UI is not blocked.

---

### User Story 2 - Translation settings & consent (Priority: P2)

Users must be able to control whether translation is enabled at all, and configure the required
credentials/settings safely, with explicit consent for any network usage.

**Why this priority**: It enforces privacy/security constraints and ensures “no network by default”
for users who do not opt in.

**Independent Test**: User can enable/disable translation globally, configure credentials, and verify
that disabling translation stops network usage immediately.

**Acceptance Scenarios**:

1. **Given** translation is disabled, **When** the user does not enable it, **Then** the system never
   makes translation network requests.
2. **Given** the user enables translation, **When** they later disable it, **Then** translation UI entry
   points become unavailable and in-flight translation requests do not break the app.

### Edge Cases

- Definition text is absent (translation should still handle the word-only case).
- Rapid repeated translation requests (must not freeze UI; should provide clear loading/error states).
- Special characters in displayed content (must render safely; no HTML/script execution).
- Offline/airplane mode, provider quota exceeded, or request timeout.
- Page is a SPA (content changes frequently) — translation request must remain user-triggered only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a global enable/disable control for translation.
- **FR-002**: When translation is disabled, the system MUST NOT perform any translation network requests
  and MUST preserve Spec 001 behaviors unchanged.
- **FR-003**: When translation is enabled, the system MUST automatically attempt Chinese translation for
  the looked-up word when the lookup overlay is opened via the existing WordMark shortcut (no Translate
  button).
- **FR-004**: If an English definition is present for the looked-up word, the system MUST automatically
  attempt Chinese translation for that definition text as part of the same shortcut-triggered flow.
- **FR-005**: Translation MUST be user-triggered only (no automatic background translation of pages or
  the full word list). The only trigger in MVP is opening the lookup overlay via the shortcut (after a
  lookup action), with translation enabled.
- **FR-006**: Translation requests MUST be scoped to the minimal data required (word and/or definition
  text only) and MUST NOT include surrounding page context or full-page content.
- **FR-007**: The translation provider MUST be pluggable (provider choice and credentials are configured
  by the user).
- **FR-008**: Translated content MUST be clearly labeled and visually distinct from the original text.
  Display surface MUST be the lookup overlay shown for Spec 001 lookups (popup remains unchanged). When
  enabled, the overlay MUST show (a) the Chinese translation under the word title, and (b) an “English
  definition” section that shows the dictionary definition (or “Definition unavailable.”), followed by
  (c) the Chinese translation of that English definition when available.
- **FR-009**: Translation failures (offline/quota/timeouts/provider errors) MUST be handled gracefully:
  show a clear failure/unavailable state with a short retry hint (“press the shortcut again to retry”)
  and MUST NOT break lookup, highlight, or popup behaviors. The system MUST NOT auto-retry in the
  background.
- **FR-010**: Translation results MAY be cached to reduce repeated requests, but caching behavior MUST be
  explicit and privacy-preserving. MVP MUST NOT persist translation results (no on-disk cache). The
  system SHOULD cache translation results in memory with a short TTL (e.g., 10–30 minutes) to reduce
  repeated requests.
- **FR-011**: The system MUST provide a safe API key configuration flow and local storage handling for
  credentials. API key configuration MUST be provided in the extension Options page, stored locally
  under a dedicated key separate from Spec 001 word data, and MUST NOT be exposed to content scripts.

### Non-Functional Requirements

- **NFR-001**: Lookup UI from Spec 001 MUST remain fast and non-blocking; translation MAY load
  asynchronously and MUST NOT delay showing the base lookup result.
- **NFR-002**: Translation requests MUST NOT block scrolling or text selection; the UI remains responsive
  during request/response handling.

### Constitution Constraints *(mandatory)*

- **CC-001**: Feature MUST stay within reading-time vocabulary marking/memory scope; translation is
  limited to already-looked-up words/definitions.
- **CC-002**: Privacy default: local-only; translation networking is opt-in only, with explicit consent
  and data minimization.
- **CC-003**: UX: existing Spec 001 flows remain unchanged; translated content is additive and clearly
  labeled; provide a clear global disable.
- **CC-004**: Performance: no new page scanning is introduced by translation; no main-thread blocking.
- **CC-005**: Security: do not inject untrusted HTML; credentials are stored locally, never logged, and
  never exposed to page scripts.
- **CC-006**: Engineering & tests: keep module boundaries; new translation settings/caching behavior is
  independently testable.

### Key Entities *(include if feature involves data)*

- **TranslationPreference**: Global translation enabled flag (default disabled) and provider selection.
- **TranslationCredential**: Provider credential material (e.g., API key) stored locally and manageable by user.
- **TranslationCacheEntry**: In-memory cached translation for (word, definition text, target language) with metadata (timestamp/expiry/TTL).

## Out of Scope (Spec 002 MVP)

- Translating arbitrary text that is not part of a looked-up word/definition
- Full-page translation
- Any changes to Spec 001 counting, normalization, stored word semantics, highlight behavior, or popup list
  sort/search/delete semantics
- Learning system, spaced repetition, or user note-taking
- Automatic background translation of all words or pages

## Dependencies

- Spec 001 remains stable and unchanged.
- User explicitly opts into translation before any translation networking occurs.

## Assumptions

- Translation is primarily used as a supporting aid for words already looked up, not as a general translator.
- The initial MVP can ship with a single provider integration; provider details are handled in planning.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With translation disabled (default), Spec 001 smoke tests pass unchanged and no translation
  network requests occur.
- **SC-002**: With translation enabled and configured, users can successfully obtain labeled Chinese
  translations for the word and (when present) the definition text in typical conditions when opening
  the lookup overlay via the shortcut (no Translate click).
- **SC-003**: When offline/quota exceeded/timeout occurs, translation fails gracefully and Spec 001 lookup,
  highlight, and popup remain usable (no crashes, no broken UI).
- **SC-004**: Translation requests do not block UI interactions (scrolling and selection remain responsive).
