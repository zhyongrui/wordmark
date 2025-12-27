# Data Model: Optional Translation (Chinese) (Spec 002)

This data model is “translation-first” and MUST NOT change Spec 001 word counting/normalization
semantics. It may add optional fields to the existing word store entries (e.g., `wordZh`) without
changing Spec 001 sort/search/delete behavior.

## Existing Entities (Spec 001)

- **WordEntry** (keyed by `normalizedWord`): recorded word + display word + queryCount + lastQueriedAt
  (+ definition/pronunciation flags) + optional short Chinese label `wordZh` (word-level only).
- **Preferences**: includes `highlightEnabled`.

## New Records (Spec 002)

Spec 002 introduces separate records stored alongside (but not inside) Spec 001 storage.

### WordEntry augmentation (Spec 002)

Spec 002 may persist `wordZh?: string` on `WordEntry` (inside the existing Spec 001 word store key)
to support popup inline display of a short word-level Chinese label.

**Rules**:
- `wordZh` is written only during lookup/translation-success flows (not by popup lazy-loading).
- Popup renders `wordZh` only when present and never triggers networking.

### TranslationSettings

Represents the user’s global translation preferences (default disabled).

**Storage key**: Dedicated `chrome.storage.local` key (separate from Spec 001 word data).

**Fields**:
- `enabled`: boolean (default `false`)
- `providerId`: string (e.g., `gemini`)
- `updatedAt`: ISO timestamp

**Rules**:
- When `enabled=false`, the system MUST NOT perform any translation network requests.
- Settings changes MUST NOT modify Spec 001 word entries, counting, or popup behaviors.

### TranslationSecrets

Represents provider credential material for translation (API key).

**Storage key**: Dedicated `chrome.storage.local` key (separate from Spec 001 word data).

**Fields**:
- `providerId`: string
- `apiKey`: string (sensitive)
- `updatedAt`: ISO timestamp

**Rules**:
- Stored locally only; never committed to the repo; never logged.
- Must not be exposed to page scripts; content scripts must not read or handle the API key.
- User can clear/replace the key at any time.

### TranslationCacheEntry *(future / optional)*

**MVP decision**: no persistent cache.

If persistent caching is introduced later, store cache entries under a dedicated key with explicit
retention/clear controls.

**Fields (example)**:
- `cacheKey`: stable key derived from provider + target language + source text
- `translatedWord`: string
- `translatedDefinition`: string (optional)
- `createdAt`: ISO timestamp
- `expiresAt`: ISO timestamp (optional; if TTL-based)

## Storage Layout (Spec 002 vs Spec 001)

- Spec 001 key `wordmark:storage` remains unchanged (no schema version bump required for Spec 002).
- Word entries in `wordmark:storage` may include `wordZh?: string` (additive, optional).
- Spec 002 uses separate `chrome.storage.local` keys, for example:
  - `wordmark:translation:settings`
  - `wordmark:translation:secrets`
  - `wordmark:translation:cache` (future)
