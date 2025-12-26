# Research: Optional Translation (Chinese) (Spec 002)

This document captures key implementation decisions for Spec 002 and the alternatives considered.
It focuses on “translation-only” scope and preserves Spec 001 behavior unchanged by default.

## Decision 1: Translation is user-triggered in the lookup overlay only

**Decision**: Translation UI entry point and translated content display live in the in-page lookup
overlay (the same surface used to show the base lookup result). The popup word list remains
unchanged.

**Rationale**:
- Minimizes UI and behavior change surface area (preserves Spec 001 popup behaviors).
- Keeps translation tightly scoped to “already-looked-up content”.
- Provides the clearest “explicit user action” trigger.

**Alternatives considered**:
- Add translation to the popup list (rejected: risks expanding Spec 001 popup scope and interaction model).
- Support both popup + overlay (rejected for MVP: extra UI complexity for little incremental value).

## Decision 2: Default off + explicit opt-in for any translation networking

**Decision**: Translation is disabled by default. No translation network requests occur unless the
user explicitly enables translation.

**Rationale**:
- Meets constitution privacy default (local-only unless opt-in).
- Prevents “surprise networking” and keeps Spec 001 smoke tests unchanged when translation is off.

**Alternatives considered**:
- Enable translation by default (rejected: violates privacy expectations and increases failure surface).
- Background prefetch translation (rejected: implicit/bulk requests; violates user-triggered constraint).

## Decision 3: Background-only networking + strict data minimization

**Decision**: Provider networking happens only in the background service worker. Requests include
only the minimal required payload: the looked-up English word and (if present) the English
definition text. No page context or word list is transmitted.

**Rationale**:
- Ensures API keys are not exposed to page scripts or content scripts.
- Enforces data minimization and avoids accidental leakage of page text.
- Keeps UI responsive (content scripts remain lightweight; translation is async).

**Alternatives considered**:
- Content script calls provider directly (rejected: weakens isolation; increases key leakage risk).
- Send selected surrounding text for “better translation” (rejected: violates minimization).

## Decision 4: API key configuration is Options-only, stored locally, never logged

**Decision**: API key is configured via the extension Options page and stored in local extension
storage under a dedicated key (separate from Spec 001 word data). The key is never included in any
message payload and never logged.

**Rationale**:
- Keeps credential handling in extension-controlled UI surfaces.
- Prevents key leakage to page context and avoids accidental logging.
- Makes “no key ⇒ safe degradation” straightforward and testable.

**Alternatives considered**:
- Configure key in popup (rejected for MVP: increases UI surface and risks mixing with Spec 001 flows).
- Bundle a default key (rejected: security violation and unacceptable operational coupling).

## Decision 5: No persistent caching in MVP

**Decision**: MVP does not persist translation results (no on-disk cache). At most, requests may be
de-duplicated within a single open overlay session.

**Rationale**:
- Minimizes stored derived data and simplifies privacy posture.
- Avoids adding cache invalidation/TTL/clear controls and related migration burden.
- Keeps MVP scope focused on opt-in translation + graceful failure handling.

**Alternatives considered**:
- TTL cache (rejected for MVP: adds policy/UX complexity and extra persistence surface).
- Cache until user clears (rejected for MVP: requires additional UI and retention semantics).

## Decision 6: Failure handling is non-blocking with explicit user-driven retries

**Decision**: Offline/quota/timeout/provider errors are surfaced as a clear “unavailable” state in
the overlay. Base lookup/highlight/popup behaviors remain usable. No automatic retries; retry is
explicitly user-triggered.

**Rationale**:
- Prevents background retry loops and unbounded request behavior.
- Preserves reading flow and avoids blocking UI.
- Keeps failure semantics consistent and testable.

**Alternatives considered**:
- Automatic retries/backoff (rejected: can create unexpected network usage and resource drain).

## Decision 7: Provider is pluggable; initial integration targets Gemini

**Decision**: Define a provider interface and implement a Gemini adapter as the initial provider.
The rest of the code depends only on the provider interface.

**Rationale**:
- Enables swapping providers without touching content/UI flows.
- Keeps provider-specific request/response handling isolated for testing.

**Alternatives considered**:
- Hard-code provider calls across the app (rejected: increases coupling and rework risk).
