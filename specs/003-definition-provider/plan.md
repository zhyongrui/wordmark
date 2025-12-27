# Implementation Plan: Online English Definition Backfill (Spec 003)

**Branch**: `003-definition-provider` | **Date**: 2025-12-27 | **Spec**: /Users/zhaoyongrui/Desktop/Code/wordmark/specs/003-definition-provider/spec.md  
**Input**: Feature specification from `/specs/003-definition-provider/spec.md`

## Summary

When the embedded local dictionary cannot provide an English definition, optionally (opt-in only)
generate a short English definition online, then translate that definition to Chinese and render it
under the English definition, without blocking the lookup overlay or changing Spec 001 behavior by
default.

## Technical Context

**Language/Version**: TypeScript 5.6.x  
**Primary Dependencies**: Browser extension APIs (Manifest V3); optional online provider (initial: Gemini)  
**Storage**: `chrome.storage.local` (Spec 001 storage key unchanged; no persistent cache for this feature)  
**Testing**: `vitest` unit tests for backfill handler/provider/caching + Spec 001 regression steps  
**Target Platform**: Edge + Chromium (MV3 service worker)  
**Project Type**: Browser extension  
**Performance Goals**: overlay appears immediately; backfill/translation are async and never block UI  
**Constraints**: default-off networking; word-only payload; safe plain-text rendering; no new permissions  
**Scale/Scope**: single-user MVP; only triggered on user shortcut lookups

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Scope: definition backfill is limited to already-looked-up single words; not a full dictionary
- [x] Privacy: default off; networking only via explicit opt-in; payload is word-only; safe API key handling
- [x] UX: shortcut lookup remains fast/non-blocking; backfill uses placeholders and does not block overlay
- [x] Performance: no new scanning; no main-thread blocking
- [x] Security: no untrusted HTML injection; provider output treated as plain text; least permissions
- [x] Engineering: keep background/content/options boundaries; reuse Spec 002 translation key handling
- [x] Testability: provider adapter + caching + handler flow are independently testable

## Clarified Defaults (MVP)

- **Definition source precedence**: local embedded dictionary first; backfill only when local definition is missing.
- **Opt-in**: use existing Spec 002 “translation enabled + API key configured” as the opt-in gate for online calls.
- **UI**: show a placeholder in the English definition section while backfill is in progress; never block overlay.
- **Caching**: in-memory TTL cache (10–30 minutes) with in-flight de-dupe; never persisted.
- **Retry**: no automatic retries; user re-presses shortcut to retry.

## Architecture (Minimal Implementation)

### High-level flow (lookup → maybeGenerateDefinition → translateDefinition)

1. Content sends `lookup:request` (existing).
2. Background returns the lookup result with `definition: string | null` (existing).
3. Content immediately renders the overlay (existing behavior; no waiting).
4. If translation is enabled (Spec 002), content triggers `translation:request` for the word translation (existing).
5. If `definition === null` and translation is enabled (new):
   - Content triggers `definition:backfill:request` in parallel.
   - Background:
     - `maybeGenerateDefinition`: call provider `generateDefinition(word)` to get **English definition (short)**.
     - `translateDefinition`: translate that generated English definition to Chinese (reuse Spec 002 translation pipeline).
   - Content updates the overlay definition section with:
     - English definition (backfilled)
     - Chinese translation of the English definition (below it)

### New provider API: `generateDefinition`

Add a provider API dedicated to generating a short English definition.

**New modules**:
- `src/shared/definition/types.ts`
- `src/shared/definition/providers/provider.ts`
- `src/shared/definition/providers/gemini.ts` (initial)
- `src/shared/definition/sanitize.ts` (plain-text normalization)

**Provider contract (sketch)**:
- Request: `{ word: string; style: "short"; maxSentences: 2 }`
- Success: `{ ok: true; englishDefinition: string }`
- Error: `{ ok: false; error: "offline" | "timeout" | "quota_exceeded" | "provider_error"; message?: string }`

Rules:
- Provider output MUST be treated as plain text only (no markdown, no HTML rendering).
- Sanitization: trim, collapse whitespace, strip code fences, clamp length.

### Background handler: `definition:backfill:request`

**New handler**:
- `src/background/handlers/definition-backfill.ts`

Responsibilities:
- Gating: reuse Spec 002 settings + API key (no key ⇒ return `not_configured`; no network).
- Caching:
  - in-memory TTL cache for `{ englishDefinition, translatedDefinition }`
  - in-session in-flight de-dupe to collapse repeated shortcut presses
- Chain calls:
  1) `generateDefinition` (word only)
  2) translate generated definition to Chinese (call `handleTranslationRequest` with `definition` set)

### Message structure extensions

**New message type**:
- `src/shared/messages.ts`: `DefinitionBackfillRequest: "definition:backfill:request"`

**Request/Response types**:
- `src/shared/definition/types.ts`
- Response errors reuse translation-like error codes for consistent UI mapping:
  - `disabled`, `not_configured`, `offline`, `quota_exceeded`, `timeout`, `provider_error`

### Cache key design

Cache key MUST be stable and based on normalized word + provider + target language + prompt version.

- Key: `defbackfill|<providerId>|zh|<normalizedWord>|short-v1`
  - `normalizedWord`: same normalization as Spec 001 lookup (`normalizeWord`)
  - `short-v1`: prompt/schema version (allows future invalidation without migrations)
- TTL: 20 minutes (match Spec 002 translation TTL)

## UI integration points (overlay-only)

- `src/content/index.ts`: when dictionary definition is missing and translation is enabled, send `definition:backfill:request` without blocking.
- `src/content/lookup-overlay.ts`: add helpers to render:
  - loading placeholder for the English definition block
  - backfilled English definition + its Chinese translation (both as `textContent`)

## Data Model (Spec 003)

See `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/003-definition-provider/data-model.md`.

## Contracts (Internal)

See `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/003-definition-provider/contracts/wordmark-definition-backfill-api.yaml`.

## Degradation & Failure Strategy

- **Default off**: no backfill calls; lookup behaves like Spec 001/Spec 002 baseline.
- **Enabled but no key**: show short “not configured” state for backfill area; keep overlay usable.
- **Provider/offline/quota/timeout**: show “Definition backfill unavailable. Press the shortcut again to retry.”
- **No automatic retries**: retry is user-triggered (shortcut).

## Permissions Strategy (Minimal)

- No new permissions beyond Spec 002 translation host permission.

## Test Strategy

- **Unit tests (required)**:
  - handler gating (disabled/no-key ⇒ no `fetch`)
  - caching (within TTL ⇒ returns cached)
  - provider sanitization (plain text, no markdown fences, clamp)
  - content flow (dictionary miss triggers backfill request; UI placeholder shown immediately)
- **Manual regression**:
  - translation disabled: Spec 001 flows unchanged; no networking
  - translation enabled: look up a word not in the embedded dictionary and observe placeholder → backfilled English definition + zh translation

## Phase 0: Research

Outputs: `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/003-definition-provider/research.md`

## Phase 1: Design & Contracts

Outputs:
- `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/003-definition-provider/data-model.md`
- `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/003-definition-provider/contracts/wordmark-definition-backfill-api.yaml`
- `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/003-definition-provider/quickstart.md`

## Post-Design Constitution Check

- [x] Optional network remains explicit opt-in only and data-minimized (word only)
- [x] API key handling remains local-only and non-leaking
- [x] Backfill/translation is async and does not block overlay
- [x] No untrusted HTML injection (render via `textContent`)

## Project Structure

### Documentation (this feature)

```text
specs/003-definition-provider/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── wordmark-definition-backfill-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── background/
│   ├── handlers/
│   │   ├── lookup.ts
│   │   ├── translation.ts
│   │   └── definition-backfill.ts       # new
│   └── index.ts
├── content/
│   ├── index.ts                         # add backfill trigger + UI updates
│   └── lookup-overlay.ts                # add placeholder + backfill render helpers
└── shared/
    ├── messages.ts                      # add definition:backfill message type
    ├── dictionary.ts                    # existing local dictionary lookup
    ├── translation/                     # existing Spec 002 translation pipeline
    └── definition/                      # new provider API + sanitization utilities

tests/
└── unit/
    └── definition/                      # new unit tests for provider/handler
```

**Structure Decision**: Add a small, isolated definition backfill pipeline (provider + background
handler + overlay-only UI updates) that reuses Spec 002 opt-in and translation infrastructure.

## Complexity Tracking

No constitution violations identified.
