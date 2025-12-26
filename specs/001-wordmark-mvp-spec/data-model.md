# Data Model: WordMark MVP

## Schema Overview

- **SchemaVersion**: integer (starting at 1)
- **StorageEnvelope**:
  - schemaVersion
  - wordsByKey (map: normalizedWord → WordEntry)
  - preferences
  - updatedAt (ISO timestamp)

## Entities

### WordEntry

Represents a single normalized word tracked by the user.

- **normalizedWord** (string, required): normalized key used for storage and lookup
- **displayWord** (string, required): last-seen display form for UI
- **queryCount** (integer, required): total number of lookups
- **lastQueriedAt** (ISO string, required): most recent lookup time
- **definition** (string, optional): basic definition text when available
- **pronunciationAvailable** (boolean, required): whether pronunciation playback is available

### Preferences

- **highlightEnabled** (boolean, required): default true for MVP

### WordStore (Derived View)

- **sortedByCount** (array of WordEntry): derived list sorted by queryCount desc, then lastQueriedAt
- **searchResults** (array of WordEntry): derived subset filtered by case-insensitive match

## Validation Rules

- **normalizedWord**
  - Lowercased
  - Trims leading/trailing punctuation and symbols
  - Allows internal apostrophes and hyphens (e.g., "don't", "well-being")
  - Must be a single token after normalization
- **displayWord**
  - Captures the last selected form for UI display
- **queryCount**
  - Starts at 1 on first lookup
  - Increments by 1 per successful lookup
- **lastQueriedAt**
  - Updated on each lookup
- **definition**
  - Optional; if unavailable, UI shows a "not available" state

## State Transitions

### Lookup

- If normalizedWord not found:
  - Create WordEntry with queryCount = 1
- If normalizedWord exists:
  - Increment queryCount
  - Update lastQueriedAt
- Persist updated StorageEnvelope

### Delete

- Remove WordEntry by normalizedWord
- Persist updated StorageEnvelope
- Current page highlight removes the deleted word within 2 seconds

### Toggle Highlight

- Update preferences.highlightEnabled
- Persist preferences and propagate change to active content scripts

## Relationships

- StorageEnvelope owns WordEntry map and Preferences
- Derived views are computed from wordsByKey for popup rendering
