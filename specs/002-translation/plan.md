# Implementation Plan: Optional Translation (Chinese) (Spec 002)

**Branch**: `feat/spec-002-translation` | **Date**: 2025-12-27 | **Spec**: /Users/zhaoyongrui/Desktop/Code/wordmark/specs/002-translation/spec.md
**Input**: Feature specification from `/specs/002-translation/spec.md`

## Summary

Add optional Chinese translation for already-looked-up content (word + optional definition), with:

- **Default OFF**: when translation is disabled, Spec 001 behavior and overlay UI remain unchanged and no translation network requests occur.
- **Explicit trigger**: when translation is enabled, opening the lookup overlay via the existing shortcut automatically runs lookup + translation (no Translate button).
- **Non-blocking UI**: overlay shows base lookup immediately; translation loads asynchronously and updates UI.
- **Safe degradation**: no API key/offline/quota/timeout/provider errors never break Spec 001; retry is user-initiated via pressing the shortcut again.

## Technical Context

**Language/Version**: TypeScript 5.6.x  
**Primary Dependencies**: Browser extension APIs (Manifest V3); optional translation provider (initial: Gemini)  
**Storage**: `chrome.storage.local` (Spec 001 storage key unchanged; Spec 002 uses dedicated keys)  
**Testing**: `vitest` unit tests for translation settings/secrets/gating/provider parsing + TTL cache + manual regression steps  
**Target Platform**: Edge + Chromium (MV3 service worker)  
**Project Type**: Browser extension  
**Performance Goals**: Spec 001 lookup overlay remains fast; translation is async and never delays base lookup rendering  
**Constraints**: Default-off networking; explicit opt-in; data minimization; no background translation; graceful offline/quota/timeout handling; API keys never logged/exposed to page scripts  
**Scale/Scope**: Single-user MVP; translation requests are triggered on shortcut-driven overlay open (low frequency; bounded by user action)

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
- **Trigger**: when translation is enabled, opening the overlay via shortcut automatically attempts translation (no Translate button).
- **Disabled equivalence**: when translation is disabled, overlay layout and behavior remain identical to Spec 001.
- **Caching**: in-memory TTL cache for translation results in the background (no persistent storage); TTL ~10–30 minutes.
- **API key**: configured in Options only; stored locally under a dedicated key; never exposed to content scripts.
- **Retry**: no automatic retries; show a short error + “press the shortcut again to retry”.
- **No English definition**: still translate the word; show “Definition unavailable.” and omit the definition-translation block.

## Scope Boundaries (No Spec 001 Pollution)

- Spec 001 storage key `wordmark:storage` remains unchanged (no schema bumps or migrations for Spec 002).
- No changes to Spec 001 word counting/normalization/storage semantics.
- No changes to Spec 001 popup list behaviors (sort/search/delete) and highlight behavior.
- No automatic/background translation of pages or word lists; translation is explicit user action only.

## Architecture (Spec 002 only)

### High-level flow

1. User selects a word and presses the existing WordMark shortcut → content script runs Spec 001 lookup (unchanged) and shows the overlay immediately.
2. In parallel, content script reads Spec 002 translation settings.
3. If translation is enabled, content script immediately sends a translation request message to the background service worker (word + optional definition only).
4. Background enforces gating (enabled + API key present), checks the in-memory TTL cache, and uses in-flight de-duplication to avoid duplicate concurrent requests.
5. Background calls the provider (Gemini) if needed and returns either translated strings or a stable error code.
6. Content script renders:
   - Under the word title: **Chinese translation of the word** (loading → success/error)
   - In the “definition card” area: **English definition** + (if definition exists) **Chinese translation of that definition**
7. If translation fails, show a short error and “press the shortcut again to retry”. No background auto-retries.

### Module boundaries (target files)

**Shared (pure, testable)**
- `src/shared/translation/types.ts`: request/response types + stable error codes
- `src/shared/translation/settings.ts`: translation settings read/write (default `enabled=false`)
- `src/shared/translation/secrets.ts`: API key read/write/clear (sensitive; local-only)
- `src/shared/translation/cache.ts`: in-flight de-dupe + in-memory TTL cache utilities (no persistence)
- `src/shared/translation/providers/provider.ts`: provider interface (pluggable)
- `src/shared/translation/providers/gemini.ts`: initial provider adapter
- `src/shared/messages.ts`: message contracts (no secrets in payloads)

**Background (network + policy enforcement)**
- `src/background/handlers/translation.ts`: gating + TTL cache + in-flight de-dupe + provider calls + error mapping + timeouts; no retries
- `src/background/index.ts`: routes translation messages (additive)

**Content (UI only; no secrets/network)**
- `src/content/lookup-overlay.ts`: render auto-translation layout + labeled sections (safe DOM APIs); remove Translate button
- `src/content/index.ts`: on shortcut-triggered lookup, auto-request translation (if enabled) and render loading/success/error

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

- **Disabled (default)**: Spec 001 overlay layout and behavior unchanged; no translation rendering; no network requests.
- **Enabled but no key**: return `not_configured`; show a clear prompt to configure; no crash; no retries; user can press shortcut again after configuring.
- **Offline/quota/timeout/provider error**: return stable error codes; show “unavailable”; keep base overlay and all Spec 001 features usable.
- **No automatic retries**: retry only by pressing the shortcut again (Translate button removed).

## Permissions Strategy (Minimal)

- Spec 001 remains `storage`-only by default.
- If the provider requires explicit host access, add the minimum possible host permission for the translation endpoint only.
- Even with host permission present, translation remains default-off and user-triggered only.

## Test Strategy

- **Unit tests (required)**:
  - settings defaults + persistence
  - secrets set/clear + “has key” checks
  - background gating: disabled/no-key must not call `fetch` and must return stable errors
  - TTL cache: repeated requests within TTL return cached success without calling provider; cache is in-memory only
  - provider adapter: request shaping (minimal payload) + error normalization (mock fetch)
- **Manual regression**:
  - With translation disabled: run Spec 001 quickstart + smoke test unchanged; confirm no translation networking.
  - With translation enabled + configured: press shortcut to open overlay; verify auto-translation + UI layout; verify retry by pressing shortcut again.
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
