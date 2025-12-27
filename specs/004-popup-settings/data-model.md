# Data Model: Popup Settings Entry and Centered Count

## Entities

- **WordEntry**
  - Fields: `normalizedWord` (string), `displayWord` (string), `wordZh?` (string), `queryCount` (number), `lastQueriedAt` (ISO string), `definition?` (string|null), `pronunciationAvailable` (boolean).
  - Notes: Count display uses the total number of entries; no new fields added.

- **Preferences**
  - Fields: `highlightEnabled` (boolean).
  - Notes: Toggle behavior must remain unchanged by header layout updates.

- **Popup Header UI State**
  - Fields: `wordCount` (derived from `words.length`), `settingsAction` (click opens options page).
  - Notes: Derived state only; no persistence changes.

## Relationships and Rules

- `wordCount` is derived from the number of `WordEntry` records loaded into the popup list.
- Changes to storage (`chrome.storage.onChanged` for the storage key) must trigger UI refresh so the centered count stays in sync.
- Settings action uses runtime APIs only; no additional data dependencies.
