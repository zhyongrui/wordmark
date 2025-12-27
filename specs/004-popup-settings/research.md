# Research: Popup Settings Entry and Centered Count

## Findings

- **Decision**: Use `chrome.runtime.openOptionsPage()` with a fallback to `chrome.tabs.create({ url: chrome.runtime.getURL("options/options.html") })`.
  - **Rationale**: Satisfies MV3 best practice and the requirement to always open the options page, even if the first API is unavailable.
  - **Alternatives considered**: Directly opening a fixed URL without fallback (rejected; could fail on some MV3 environments), opening a new window (rejected; unnecessary UX change).

- **Decision**: Center the total word count within the popup header while keeping the settings control anchored top-right.
  - **Rationale**: Improves visibility of the count per spec while preserving a predictable spot for the settings control.
  - **Alternatives considered**: Left-aligning the count under the title (rejected; less visible), keeping the count right-aligned (rejected; contradicts requirement).

- **Decision**: Reuse existing word list state (`words.length`) for count display and rely on current refresh triggers (initial load + `chrome.storage.onChanged`) to keep the total accurate.
  - **Rationale**: Avoids duplicating data flow; leverages existing refresh logic that already reacts to storage changes.
  - **Alternatives considered**: Introducing separate count fetch or additional message type (rejected; adds surface area without benefit).

- **Decision**: Keep current permissions and assets; no new MV3 permissions or external calls required.
  - **Rationale**: Options page is bundled; opening it does not require new host or permission changes.
  - **Alternatives considered**: Requesting new permissions for tab focus management (rejected; not needed for options opener).
