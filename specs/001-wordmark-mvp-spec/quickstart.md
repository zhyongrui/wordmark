# Quickstart: WordMark MVP

## Prerequisites

- Edge or Chromium-based browser
- Node.js (LTS) and a package manager (npm recommended)

## Build (from scratch)

1. Install dependencies:
   - `npm install`
2. Build the extension bundle:
   - `npm run build`

## Load Unpacked (Edge / Chromium)

1. Open extensions page:
   - Edge: `edge://extensions`
   - Chromium: `chrome://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked** → select `dist/`.
4. Open a new tab (or refresh the current tab) to ensure the content script is injected.
5. After each rebuild, click **Reload** on the extension card, then refresh the active tab.

## Configure the Shortcut (US1)

1. Open shortcuts:
   - Edge: `edge://extensions/shortcuts`
   - Chromium: `chrome://extensions/shortcuts`
2. Set **Lookup selected word** to `Alt+W` (or any preferred key).

## Manual Test (US1/US2/US3)

For the full checklist, see `tests/integration/extension-flows/smoke-test.md`.

### US1 — Lookup overlay + record counts

1. Open an English article page (e.g., Wikipedia).
2. Select a single word like `hello`, press the shortcut.
3. Expected:
   - An in-page overlay appears near the selected word (first attempt).
   - Definition is shown when available; otherwise “Definition unavailable.”
   - Pronunciation button appears only when available.
4. Repeat lookup of the same word 2 more times.
5. Expected:
   - Open the extension popup: the word exists and the query count increases.

### US2 — Page highlighting + toggle (in popup)

1. With at least 1 queried word stored, open a page that contains that word.
2. Expected:
   - The word is highlighted automatically (incremental; should not freeze scrolling/selection).
3. Open the extension popup and toggle **Highlights** OFF, then ON.
4. Expected (within ~2 seconds):
   - OFF: highlights are removed and no new highlights appear.
   - ON: highlights re-appear.

### US3 — Popup word list (sort/search/delete)

1. Ensure at least 3 words were looked up (e.g., `hello`, `world`, `word`).
2. Open the extension popup.
3. Expected:
   - Default ordering is by query count descending.
   - Search filters results (case-insensitive).
   - Delete removes the word; when Highlights are ON, its highlights disappear on the active page within ~2 seconds.

## Regression Points (Long page + SPA / ChatGPT)

Run these after an extension **Reload** + page refresh (first-interaction after reload).

- Long page performance: page stays responsive while highlights apply (see smoke test section “Regression — Long page performance”).
- SPA / ChatGPT:
  - Selecting a word in inline code (gray background) places the overlay near the selection on the first attempt.
  - Selecting a word in a code block places the overlay near the selection on the first attempt.
  - With Highlights ON, previously queried words highlight in normal text, inline code, and code blocks.
  - Newly added SPA content (new ChatGPT message) becomes highlighted without reloading the page.

## Console Logs (Performance)

- On very large pages, the highlight engine may enter incremental-only mode; look for:
  - `[WordMark][highlight] entering degraded mode (incremental-only)`
- This should appear only when size/time thresholds are exceeded; normal pages should not log it.
  - Check the active page DevTools Console (not the extension service worker console).

## Troubleshooting

- If the popup list is empty after lookup, reload the extension and refresh the active tab.
- If pronunciation is unavailable, verify local speech synthesis voices are installed.
