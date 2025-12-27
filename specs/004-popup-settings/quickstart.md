# Quickstart: Popup Settings Entry and Centered Count

1) Install deps if needed: `npm install`.
2) Implement header updates in `src/popup/popup.html`, `src/popup/styles.css`, and `src/popup/index.ts` (settings button, centered count, opener fallback).
3) Build: `npm run build`; optional: `npm run typecheck`.
4) Test/lint: `npm test && npm run lint`.
5) Load/reload unpacked extension (MV3) and verify:
   - Settings icon appears top-right and opens the options page on click (fallback works if needed).
   - Total word count is centered in the header and updates after add/delete.
   - Highlight toggle, search, list rendering, and delete still behave correctly.
   - Popup console shows no errors during these flows.
