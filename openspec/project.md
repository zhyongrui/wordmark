# Project Context

## Purpose

WordMark is a Chromium (Manifest V3) browser extension for reading-time vocabulary lookup and review.
It provides an in-page lookup overlay for selected single words (shortcut-triggered), local history,
highlighting of previously looked-up words, and a popup word list for search/delete + highlight
toggle. Optional (opt-in) translation and definition backfill use Gemini.

## Tech Stack

- TypeScript 5.6.x (strict)
- Chrome Extension APIs (MV3): `runtime`, `storage`, `tabs`, `commands`, content scripts, options/popup pages
- Build: esbuild (`esbuild.config.mjs`) bundling entrypoints to `dist/`
- Lint/format: ESLint + @typescript-eslint + Prettier (`.prettierrc`)
- Tests: Vitest (node environment)

## Project Conventions

### Code Style

- Use Prettier formatting (print width 100, single quotes, no trailing commas).
- Keep TypeScript strict and explicit at module boundaries (messages, storage schema, provider responses).
- Prefer safe runtime checks for untrusted inputs and external API responses.
- Prefer DOM-safe rendering: treat all dynamic text as plain text (no HTML injection).

### Architecture Patterns

- MV3 structure:
  - Background service worker: `src/background/index.ts` (routes `chrome.runtime.onMessage` and command handlers)
  - Content script: `src/content/index.ts` (lookup overlay UI + highlighting on pages)
  - Popup: `src/popup/index.ts` (renders word list UI; uses messaging, no networking)
  - Options: `src/options/index.ts` (translation settings + API key management)
  - Shared logic: `src/shared/**` (storage schema/migrations, word logic, translation/definition providers)
- Messaging contracts live in `src/shared/messages.ts` and are used by popup/content to talk to background.
- Storage is `chrome.storage.local`:
  - Main store: `wordmark:storage` (`src/shared/storage/schema.ts`, `src/shared/storage/migrate.ts`)
  - Translation settings: `wordmark:translation:settings`
  - Translation secrets (API key): `wordmark:translation:secrets`
  - Helpers fall back to an in-memory store when `chrome` is unavailable (supports unit tests).
- Networking is opt-in only:
  - Default behavior is local-only.
  - Optional translation/definition backfill uses Gemini (`https://generativelanguage.googleapis.com/*`).
  - Do not persist translation/definition caches; background uses short in-memory TTL caches and request de-duping.

### Testing Strategy

- Unit tests with Vitest under `tests/unit/**` for shared logic and background/content helpers.
- Avoid relying on real browser APIs/network; modules should tolerate missing `chrome` and allow stubbing `fetch`.
- Common commands: `npm test`, `npm run lint`, `npm run typecheck`.

### Git Workflow

- No repo-specific workflow is enforced. Keep changes small, focused, and easy to review.
- When using OpenSpec, prefer verb-led kebab-case change IDs for branches/dirs (e.g., `add-...`, `update-...`).

## Domain Context

- Word normalization is strict: lowercased, trims leading/trailing punctuation, allows internal apostrophes/hyphens,
  and rejects multi-word selections (`src/shared/word/normalize.ts`).
- The popup list sorts by `queryCount` desc, then `lastQueriedAt` desc; search is case-insensitive on English word
  fields (optional `wordZh` is display-only).
- Privacy defaults matter: local-only storage; network requests happen only when the user enables/configures them.
- Existing feature plans/specs live under `specs/` (001–004); OpenSpec specs under `openspec/specs/` may be added later.

## Important Constraints

- Manifest V3 service worker lifecycle: background in-memory state is ephemeral and must not be relied on for persistence.
- Least-privilege: keep permissions minimal (`storage`; Gemini host permission only for optional features).
- Security: never inject/render untrusted HTML; do not log or leak API keys; sanitize error messages.
- Performance: keep lookup/overlay responsive; avoid blocking the main thread during highlighting or network calls.
- License: PolyForm Noncommercial (see `LICENSE.md`).

## External Dependencies

- Chrome/Edge extension runtime (MV3 APIs) and Chrome Web Store distribution.
- Optional Gemini Generative Language API (`generativelanguage.googleapis.com`) for translation/definition backfill.
