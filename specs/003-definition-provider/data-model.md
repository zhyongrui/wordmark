# Data Model: Online English Definition Backfill (Spec 003)

Spec 003 introduces **no new persistent storage**. It reuses Spec 002’s opt-in translation settings
and secrets, and adds only in-memory (session) caches in the background.

## Existing Entities (Spec 001)

- **WordEntry** (keyed by `normalizedWord`): recorded word + display word + queryCount + lastQueriedAt (+ definition/pronunciation flags).
- **Preferences**: includes `highlightEnabled`.

## Reused Records (Spec 002)

Spec 003 uses Spec 002’s existing records for opt-in and API key handling:

- `wordmark:translation:settings`
- `wordmark:translation:secrets`

No new settings are required for MVP; definition backfill is gated by translation enabled + API key configured.

## New Session-Only Structures (Spec 003)

### DefinitionBackfillRequest

Represents a request to backfill an English definition when the local dictionary misses.

**Fields**:
- `word`: string (single looked-up word; no page context)

### DefinitionBackfillResponse

Represents the background result used to update the overlay’s English definition block.

**Success fields**:
- `ok`: `true`
- `englishDefinition`: string (plain text, 1–2 sentences)
- `translatedDefinition`: string | null (Chinese translation of `englishDefinition`)

**Error fields**:
- `ok`: `false`
- `error`: one of `disabled | not_configured | offline | quota_exceeded | timeout | provider_error`
- `message`: optional UI-safe message (MUST NOT contain secrets)

### DefinitionBackfillCacheEntry

Session-only cache value stored in the background to avoid repeated waiting/cost.

**Fields**:
- `englishDefinition`: string
- `translatedDefinition`: string | null
- `expiresAt`: number (ms epoch; TTL-based)

## Cache Keys (Spec 003)

Definition backfill cache keys MUST be stable and based on normalized word + provider + language + prompt version.

Example:
- `defbackfill|<providerId>|zh|<normalizedWord>|short-v1`

Notes:
- `normalizedWord` follows Spec 001 normalization (lowercased, single-token english word).
- `short-v1` is a prompt/schema version marker to allow future invalidation without persistence/migrations.
