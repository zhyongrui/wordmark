# Research: Online English Definition Backfill (Spec 003)

This document captures key implementation decisions for Spec 003 and the alternatives considered.
The goal is a minimal, additive enhancement that preserves Spec 001 defaults and relies on Spec 002’s
explicit opt-in for any networking.

## Decision 1: Reuse Spec 002 opt-in (translation enabled + API key) as the gate

**Decision**: Online definition backfill is only attempted when Spec 002 translation is enabled and
an API key is configured. With translation disabled (default), no online definition requests occur.

**Rationale**:
- Satisfies constitution privacy defaults (offline by default; explicit opt-in for networking).
- Avoids introducing another consent surface or extra settings/migrations.
- Keeps Spec 001 behavior unchanged by default.

**Alternatives considered**:
- Separate “definition backfill” toggle (rejected for MVP: extra UI + policy surface; same opt-in semantics as translation).

## Decision 2: Add a dedicated internal message for definition backfill (do not overload TranslationRequest)

**Decision**: Introduce `definition:backfill:request` as a separate background message and handler.

**Rationale**:
- Keeps Spec 002 translation request/response stable and reduces regression risk.
- Allows backfill to be optional and independently cached/tested.
- Failure of backfill does not have to override the word translation UI.

**Alternatives considered**:
- Extend `translation:request` to also generate missing English definitions (rejected for MVP: couples concerns and complicates caching keys and UI mapping).

## Decision 3: Provider contract returns plain text only (sanitized), 1–2 sentences

**Decision**: Provider output is treated as plain text and normalized:
- No markdown (strip code fences / formatting artifacts when present).
- No HTML rendering (content uses `textContent` only).
- Clamp length to keep overlay stable.

**Rationale**:
- Satisfies constitution security constraint (no untrusted HTML injection).
- Stabilizes UX and avoids layout blow-ups from long model outputs.

**Alternatives considered**:
- Allow markdown formatting (rejected: introduces rendering ambiguity and potential injection risk if rendered incorrectly).

## Decision 4: Background-only networking + strict data minimization

**Decision**: All provider calls happen in the background service worker; request payload includes
only the looked-up word (no page context, no selection context, no word list).

**Rationale**:
- Avoids API key exposure to page scripts and content scripts.
- Complies with data minimization and keeps the feature “reading-time aid” scoped.

**Alternatives considered**:
- Content script provider calls (rejected: weakens isolation; increases key leakage risk).

## Decision 5: In-memory TTL cache + in-flight de-dupe in background

**Decision**: Cache `{ englishDefinition, translatedDefinition }` in-memory for a short TTL and
dedupe concurrent requests by a stable key.

**Rationale**:
- Meets “at least session cache” requirement without persistence/migrations.
- Reduces repeated waiting and repeated provider cost.

**Alternatives considered**:
- Persistent cache in `chrome.storage.local` (rejected for MVP: introduces retention semantics and migration burden).

## Decision 6: Translate the generated English definition via existing Spec 002 translation pipeline

**Decision**: After generating an English definition, translate it to Chinese by calling the same
translation handler/provider logic already used by Spec 002.

**Rationale**:
- Reuses consistent error mapping (offline/quota/timeout/provider error).
- Reuses existing API key handling and redaction/safety policies.

**Alternatives considered**:
- A separate “translateText” API for definitions (rejected for MVP: unnecessary surface area; duplicates error handling).
