# Research Notes: WordMark MVP

## Decision 1: Offline Definitions Source

**Decision**: Bundle a compact, curated dictionary dataset with basic definitions inside the
extension package for MVP. If a word is not found, show a "not available" state while still
recording the lookup.

**Rationale**: The MVP requires offline functionality and prohibits network access by default.
Bundling a small dataset meets privacy and offline constraints while keeping package size
manageable.

**Alternatives considered**:
- Remote dictionary API (rejected: violates offline/no-network default)
- Full dictionary dataset (rejected: package size and complexity)

## Decision 2: Pronunciation Playback

**Decision**: Use the browser's built-in text-to-speech capability (speech synthesis) as the
primary pronunciation path when available; otherwise fall back to "not available".

**Rationale**: Built-in TTS avoids network access and large audio assets, aligns with offline
requirements, and provides a single supported path for MVP.

**Alternatives considered**:
- Packaged audio files per word (rejected: size and maintenance)
- Remote TTS service (rejected: violates offline/no-network default)

## Decision 3: Highlighting Strategy

**Decision**: Incremental highlighting driven by DOM mutations, processed in small batches to
avoid blocking the main thread; ignore input/textarea/script/style nodes.

**Rationale**: Incremental processing meets the performance and UX constraints while supporting
long or dynamic pages.

**Alternatives considered**:
- Full-page scans on load and every mutation (rejected: performance risks on large pages)

## Decision 4: Storage Schema & Versioning

**Decision**: Store a versioned schema in `chrome.storage.local` with a word map keyed by
normalized word and a separate preferences object (highlight enabled). Include schema version
for future migration.

**Rationale**: Aligns with privacy requirements and enables controlled evolution of stored data.

**Alternatives considered**:
- IndexedDB (rejected: unnecessary complexity for MVP)
- Unversioned storage (rejected: blocks future migrations)

## Decision 5: Testing Focus

**Decision**: Prioritize unit tests for normalization, counting, sorting, search filtering, and
import/export-ready logic; add minimal integration checks for lookup → highlight → popup flow.

**Rationale**: Constitution mandates independently testable core word logic; lightweight
integration checks cover MVP acceptance criteria without heavy infrastructure.

**Alternatives considered**:
- End-to-end automation across multiple browsers (deferred: high setup cost for MVP)
