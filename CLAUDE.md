# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WordMark is a browser extension for vocabulary lookup and highlighting. It supports English, Chinese, and Japanese with optional translation using multiple providers (Gemini, DeepSeek, Moonshot, OpenAI, Qwen, Volcengine, Zhipu).

## Development Commands

### Build and Test
```bash
npm run build          # Build extension to dist/
npm test              # Run tests with vitest
npm run lint          # Lint TypeScript files
npm run typecheck     # Type check without emitting
```

### Development Workflow
After building, load the unpacked extension from the `dist/` folder in your Chromium-based browser.

## Architecture

### Extension Structure

```
src/
├── background/        # Service worker (MV3)
│   └── handlers/      # Message handlers for different features
├── content/           # Content script injected into web pages
│   ├── index.ts       # Main content script, handles lookup logic
│   ├── highlight.ts   # Word highlighting engine
│   ├── lookup-overlay.ts  # UI overlay for lookup results
│   └── pronounce.ts   # TTS (text-to-speech) functionality
├── popup/             # Extension popup UI
├── options/           # Options/settings page
├── shared/            # Shared utilities and types
│   ├── messages.ts    # Message types for chrome.runtime messaging
│   ├── translation/   # Translation provider implementations
│   ├── definition/    # Definition provider implementations
│   ├── word/          # Word normalization and storage
│   └── storage/       # Storage schema and migrations
└── types/             # Chrome type declarations
```

### Message Passing Pattern

The extension uses Chrome runtime messaging for communication:

- **Content Script → Background**: Sends `LookupRequest`, `TranslationRequest`, `DefinitionBackfillRequest`
- **Background → Content Script**: Responds with lookup results, translations, definitions
- All message types are defined in `src/shared/messages.ts`

### Key Data Models

#### WordEntry (`src/shared/storage/schema.ts`)
```typescript
type WordEntry = {
  normalizedWord: string;
  displayWord: string;
  wordZh?: string;      // Chinese translation
  wordJa?: string;      // Japanese translation
  wordEn?: string;      // English translation
  definitionEn?: string;   // Same-language definition (English)
  definitionZh?: string;   // Same-language definition (Chinese)
  definitionJa?: string;   // Same-language definition (Japanese)
  translatedDefinitionEn?: string;
  translatedDefinitionZh?: string;
  translatedDefinitionJa?: string;
  highlightDisabled?: boolean;
  queryCount: number;
  lastQueriedAt: string;
  pronunciationAvailable: boolean;
};
```

#### Translation Settings
- Supports **single mode** (one direction, e.g., EN→ZH) and **dual mode** (bidirectional, e.g., EN↔ZH)
- Six translation directions: EN→ZH, ZH→EN, EN→JA, JA→EN, ZH→JA, JA→ZH
- Settings stored in `chrome.storage.local` under key `wordmark:translation:settings`

### Language Detection and Disambiguation

**Important**: Japanese language detection has special handling for Kanji-only (Han-only) tokens which are ambiguous between Chinese and Japanese.

The detection logic in `src/content/index.ts:refineSelectionLanguage()` uses multiple strategies:

1. **Cache-based detection**: Checks if the word has an existing Japanese definition in local storage
2. **Context-based detection**: Checks if the surrounding sentence contains Japanese kana (hiragana/katakana)
3. **Page language detection**: Falls back to `<html lang="ja">` attribute

This is controlled by the `preferJapaneseForHanSelections` setting (default: `true`).

**Language detection priority** (`src/shared/word/normalize.ts`):
1. Han-only pattern (汉字 only) → detected as Chinese
2. Japanese kana pattern (must contain kana) → detected as Japanese
3. English alphabet pattern → detected as English

### Storage Architecture

Two separate storage keys:
- `wordmark:storage` (versioned schema, currently v6): Word entries, preferences, highlight state
- `wordmark:translation:settings`: Translation provider settings

Storage migrations are handled in `src/shared/storage/migrate.ts`.

### Translation Providers

All providers implement a common interface defined in `src/shared/translation/providers/provider.ts`. Provider-specific implementations are in `src/shared/translation/providers/`.

### Definition Providers

Same-language definitions (e.g., English definition for English words) are provided by:
- Local embedded dictionary (basic definitions)
- Optional AI provider backfill (configured in options)

## Important Implementation Details

### Content Script Initialization
The content script (`src/content/index.ts`) initializes multiple subsystems:
- Selection tracking and overlay positioning
- Word highlighting engine
- Storage synchronization via `chrome.storage.onChanged`
- Translation and definition backfill handlers

### Highlighting System
- Maintains in-memory cache of words to highlight
- Updates DOM in real-time as users add/remove words
- Respects per-word `highlightDisabled` flag and global preferences

### Lookup Flow
1. User selects text and triggers lookup (via shortcut or UI)
2. Content script detects language and normalizes selection
3. Sends `LookupRequest` to background
4. Background checks local storage, records lookup (if enabled)
5. Content script displays overlay with word info
6. If enabled, fetches translation and/or definition asynchronously

## OpenSpec Workflow

This project uses OpenSpec for spec-driven development. See `openspec/AGENTS.md` for complete documentation.

**Key commands:**
```bash
openspec list                  # List active changes
openspec list --specs          # List specifications
openspec show [item]           # Display change or spec
openspec validate [item]       # Validate changes or specs
openspec archive <change-id>   # Archive after deployment
```

**When to create a proposal:**
- New features or functionality
- Breaking changes (API, schema)
- Architecture or pattern changes
- Performance optimizations (that change behavior)
- Security pattern updates

**Skip proposal for:**
- Bug fixes (restoring intended behavior)
- Typos, formatting, comments
- Non-breaking dependency updates
- Configuration changes
- Tests for existing behavior

## Browser Extension APIs

Uses Chrome Manifest V3 APIs:
- `chrome.storage.local` for persistent storage
- `chrome.runtime` for message passing
- `chrome.tts` for pronunciation (content script)
- Browser commands/shortcuts (configured by user in browser settings)

## Testing

- Tests are in `tests/` directory
- Uses vitest as test runner
- Test setup in `tests/setup.ts`
- Run individual test files: `npm test -- <test-file>`
