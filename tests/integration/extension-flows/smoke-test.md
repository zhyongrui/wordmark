# WordMark Smoke Test (US1/US2/US3)

This is a manual smoke test checklist for the WordMark MVP.

## Preconditions

- Edge (or Chromium) with Developer mode enabled.
- Extension loaded as unpacked from `dist/`.
- Shortcut configured (default): `Alt+W` (“Lookup selected word”).
  - Edge: `edge://extensions/shortcuts`

## Build & Load

1. `npm install`
2. `npm run build`
3. Edge → Extensions → Developer mode → Load unpacked → select `dist/`
4. Open a new tab to ensure the content script is injected.

## US1 — Lookup overlay + record counts

Use an English article page (e.g., Wikipedia/Docs/blog post).

1. Select a single word like `hello`, press `Alt+W`.
   - Expected:
     - An in-page overlay appears near the selected word (not stuck in a corner).
     - The overlay shows the selected word.
     - Definition shows the embedded dictionary value when available; otherwise shows “Definition unavailable.”
     - Pronunciation button is shown only when available for the result.
2. Press the pronunciation button (if shown).
   - Expected:
     - Audio plays, or a clear “unavailable” notice is shown (device/voice dependent).
3. Repeat lookup of the same word 2 more times.
   - Expected:
     - No errors; overlay continues to appear near the selection.
     - Query count for that word increments.
4. Normalization check:
   - Select `Hello,` (with punctuation) and press `Alt+W`.
   - Expected:
     - It counts toward the same normalized entry as `hello` (not a new separate word).
5. Invalid selection check:
   - Select two words (e.g., `hello world`) and press `Alt+W`.
   - Expected:
     - A lightweight notice is shown.
     - No new word entry is created in the popup list.

## US2 — Page highlighting + one-click disable/enable

1. With at least 1 queried word stored, open a page that contains that word.
   - Expected:
     - The word is highlighted automatically (low-interference style).
     - The page remains responsive while highlights are applied (scroll/selection still works).
2. Open the extension popup, toggle **Highlights** to OFF.
   - Expected (within ~2 seconds):
     - All existing highlights on the current page are removed.
     - Newly added content on the page does not become highlighted while OFF.
3. Toggle **Highlights** back to ON.
   - Expected (within ~2 seconds):
     - Highlights re-appear on the current page.

## US3 — Popup word list (sort/search/delete)

Preparation: ensure at least 3 words have been looked up (e.g., `hello`, `world`, `word`).

1. Open the extension popup.
   - Expected:
     - The list shows all queried words.
     - Default ordering is by `queryCount` descending.
     - Each row shows the word + metadata (count + last queried date).
     - If a stored short Chinese label (`wordZh`) exists for an entry, it is shown inline after the English word.
2. Search filtering:
   - Type a query like `wor`.
   - Expected:
     - Results are filtered case-insensitively.
      - Filtering/search semantics remain English-only (the popup does not search by `wordZh`).
3. Delete behavior:
   - Click **Delete** for one entry (e.g., `world`).
   - Expected:
     - The entry is removed from the popup list.
     - If Highlights are ON, occurrences of that word stop being highlighted on the current page within ~2 seconds.

## Regression — Long page performance

Use a “long page” (very long article, infinite-scroll page, or a docs page with lots of text).

1. Confirm the page stays responsive while highlights are applied.
   - Expected:
     - No noticeable freezing; scrolling and selecting text remain usable.
2. Toggle **Highlights** OFF/ON from the popup.
   - Expected:
     - Both transitions complete within ~2 seconds.

## Regression — SPA / ChatGPT (dynamic DOM + inline code + code blocks)

Use ChatGPT (or another SPA with frequently changing DOM). Run this after reloading the extension
to reproduce “first interaction after reload” behavior.

1. Reload the extension (Edge → Extensions → “Reload”), then refresh the ChatGPT tab.
2. Inline code selection (gray background):
   - Find an inline code segment (gray background) and select a word inside it.
   - Press `Alt+W`.
   - Expected:
     - The overlay appears near the selected inline-code word on the first attempt.
3. Code block selection:
   - Find a fenced code block (multi-line) and select a word inside it.
   - Press `Alt+W`.
   - Expected:
     - The overlay appears near the selected code-block word on the first attempt.
4. Highlighting in dynamic updates:
   - With Highlights ON, ensure previously queried words are highlighted in:
     - Normal ChatGPT message text
     - Inline code (gray background)
     - Code blocks (preformatted)
   - Trigger a new message/turn that contains a previously queried word.
   - Expected:
     - Highlights appear for newly added content after it renders (without needing a page reload).
5. Toggle/delete sync in SPA:
   - Toggle Highlights OFF in the popup.
   - Expected:
     - Existing highlights in the ChatGPT page are removed within ~2 seconds.
   - Delete a word in the popup.
   - Expected:
     - That word stops being highlighted in the ChatGPT page within ~2 seconds (when Highlights are ON).
