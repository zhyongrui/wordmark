# Implementation Plan: Optional Translation (Chinese) (Spec 002)

**Branch**: `002-translation` | **Date**: 2025-12-26 | **Spec**: /Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/spec.md
**Input**: Feature specification from `/specs/002-translation/spec.md`

## Summary

Add optional, explicitly user-triggered Chinese translation for already-looked-up content:
the looked-up English word and (when present) the English definition text. Translation is disabled
by default, performs no network activity unless explicitly enabled, and MUST NOT modify or extend
Spec 001 lookup/highlight/popup behaviors.

## Technical Context

**Language/Version**: TypeScript 5.6.x  
**Primary Dependencies**: Browser extension APIs (Manifest V3); optional translation provider (initial: Gemini)  
**Storage**: `chrome.storage.local` (Spec 001 storage key unchanged; Spec 002 uses dedicated keys)  
**Testing**: `vitest` unit tests for translation settings/secrets/gating/provider parsing + manual regression steps  
**Target Platform**: Edge + Chromium (MV3 service worker)  
**Project Type**: Browser extension  
**Performance Goals**: Spec 001 lookup overlay remains fast; translation is async and never delays base lookup rendering  
**Constraints**: Default-off networking; explicit opt-in; data minimization; no background translation; graceful offline/quota/timeout handling; API keys never logged/exposed to page scripts  
**Scale/Scope**: Single-user MVP; translation requests are user-initiated (low frequency)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Scope: translation is limited to already-looked-up word/definition; not a general translator
- [x] Privacy: default off; no network unless enabled; minimal payload only; user can disable to stop requests immediately
- [x] UX: existing Spec 001 flows remain unchanged; translation is additive, clearly labeled, and non-blocking
- [x] Performance: no new scanning; no main-thread blocking; translation handled asynchronously
- [x] Security: no untrusted HTML injection; credentials stored locally, never logged, never exposed to page scripts
- [x] Engineering: keep background/content/popup/options boundaries; Spec 002 storage isolated from Spec 001
- [x] Testability: translation settings/secrets/gating/provider adapter independently testable; UI/data decoupled

## Clarified Defaults (MVP)

- **Display surface**: lookup overlay only (popup remains unchanged).
- **Caching**: no persistent cache in MVP (optional in-session de-dup only).
- **API key**: configured in Options only; stored locally under a dedicated key; never exposed to content scripts.

## Scope Boundaries (No Spec 001 Pollution)

- Spec 001 storage key `wordmark:storage` remains unchanged (no schema bumps or migrations for Spec 002).
- No changes to Spec 001 word counting/normalization/storage semantics.
- No changes to Spec 001 popup list behaviors (sort/search/delete) and highlight behavior.
- No automatic/background translation of pages or word lists; translation is explicit user action only.

## Architecture (Spec 002 only)

### High-level flow

1. User performs a normal Spec 001 lookup → lookup overlay is shown immediately (unchanged).
2. If translation is enabled + configured, user clicks **Translate** in the overlay.
3. Content script sends a translation request message to the background service worker.
4. Background enforces gating (enabled + API key present) and performs provider call.
5. Background returns either translated strings or a stable error code; overlay renders a labeled result or “unavailable” state.

### Module boundaries (target files)

**Shared (pure, testable)**
- `src/shared/translation/types.ts`: request/response types + stable error codes
- `src/shared/translation/settings.ts`: translation settings read/write (default `enabled=false`)
- `src/shared/translation/secrets.ts`: API key read/write/clear (sensitive; local-only)
- `src/shared/translation/providers/provider.ts`: provider interface (pluggable)
- `src/shared/translation/providers/gemini.ts`: initial provider adapter
- `src/shared/messages.ts`: message contracts (no secrets in payloads)

**Background (network + policy enforcement)**
- `src/background/handlers/translation.ts`: gating + provider calls + error mapping + timeouts; no retries
- `src/background/index.ts`: routes translation messages (additive)

**Content (UI only; no secrets/network)**
- `src/content/lookup-overlay.ts`: add translate control + render labeled translations (safe DOM APIs)
- `src/content/index.ts`: wire overlay action to background messages

**Options (consent + configuration)**
- `src/options/options.html`, `src/options/index.ts`: enable/disable translation, set/clear API key, explain opt-in + minimization

## Data Model (Spec 002)

See `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/data-model.md`.

MVP uses separate storage records:
- Translation settings (enabled/providerId) under a dedicated key.
- Translation secrets (API key) under a dedicated key.
- No persistent translation cache.

## Contracts (Internal)

See `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/contracts/wordmark-translation-api.yaml`.

Minimal internal contract surface:
- `POST /translation/request`
- `GET/PUT /translation/settings`

## API Key Management

- **Storage**: `chrome.storage.local`, dedicated key(s) separate from Spec 001 data.
- **Access**: only Options writes/clears; only background reads on-demand for translation calls.
- **Safety**: key MUST NOT be logged, returned in any message payload, or exposed to page scripts.
- **No key fallback**: translation requests return `not_configured` without throwing; Spec 001 remains usable.

## Degradation & Failure Strategy

- **Disabled (default)**: no translation UI entry point (or clearly disabled state); no network requests.
- **Enabled but no key**: return `not_configured`; show a clear prompt to configure; no crash; no retries.
- **Offline/quota/timeout/provider error**: return stable error codes; show “unavailable”; keep base overlay and all Spec 001 features usable.
- **No automatic retries**: retry only via explicit user click.

## Permissions Strategy (Minimal)

- Spec 001 remains `storage`-only by default.
- If the provider requires explicit host access, add the minimum possible host permission for the translation endpoint only.
- Even with host permission present, translation remains default-off and user-triggered only.

## Test Strategy

- **Unit tests (required)**:
  - settings defaults + persistence
  - secrets set/clear + “has key” checks
  - background gating: disabled/no-key must not call `fetch` and must return stable errors
  - provider adapter: request shaping (minimal payload) + error normalization (mock fetch)
- **Manual regression**:
  - With translation disabled: run Spec 001 quickstart + smoke test unchanged; confirm no translation networking.
  - With translation enabled + configured: verify overlay translation shows labeled results and remains non-blocking.
  - Offline/no-key: verify graceful “unavailable/not configured” states without breaking Spec 001 flows.

## Phase 0: Research

Outputs: `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/research.md`

## Phase 1: Design & Contracts

Outputs:
- `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/data-model.md`
- `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/contracts/wordmark-translation-api.yaml`
- `/Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/quickstart.md`

## Post-Design Constitution Check

- [x] Optional network remains explicit opt-in only and data-minimized
- [x] API key handling remains local-only and non-leaking
- [x] Translation is non-blocking and does not introduce page scanning
- [x] Spec 001 behaviors and storage semantics remain unchanged

## Project Structure

### Documentation (this feature)

```text
specs/002-translation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── wordmark-translation-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── background/
│   ├── handlers/
│   └── index.ts
├── content/
│   ├── index.ts
│   ├── lookup-overlay.ts
│   └── ...
├── popup/
├── options/
├── shared/
│   ├── messages.ts
│   └── translation/
└── assets/

manifest.json

tests/
├── unit/
└── integration/
```

**Structure Decision**: Keep Spec 002 isolated by introducing `src/shared/translation/` and a
background translation handler, with overlay-only UI integration and Options-only configuration.

## Complexity Tracking

No constitution violations identified.
