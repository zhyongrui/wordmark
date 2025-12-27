# Quickstart: Online English Definition Backfill (Spec 003)

This quickstart validates Spec 003 definition backfill behavior while preserving Spec 001 defaults
and relying on Spec 002’s explicit opt-in for any networking.

## Build & Load (same as Spec 001)

1. `npm install`
2. `npm run build`
3. Edge/Chromium extensions page → Developer mode → **Load unpacked** → select `dist/`
4. After rebuilds: **Reload** the extension → refresh the active tab.

## Verify Default-Off (no online backfill)

1. Ensure translation is disabled (default) in the extension Options page.
2. Trigger lookup via the shortcut on a word that is NOT in the embedded dictionary
   (the embedded dictionary currently contains only `hello`, `world`, `word`).
3. Expected:
   - Overlay is shown immediately.
   - English definition shows `Definition unavailable.`
   - No online definition backfill requests occur.

## Enable Opt-in (Spec 002 prerequisite)

1. Open the extension Options page.
2. Enable translation (explicit opt-in).
3. Configure provider (Gemini) and set an API key.
4. Expected:
   - API key is stored locally and can be cleared/replaced.
   - API key is never logged.

## Spec 003 Backfill Flow (dictionary miss)

Precondition: translation enabled + API key configured.

1. Local path (embedded dictionary hit):
   - Select `hello`, press the WordMark shortcut.
   - Expected: English definition shows immediately from the local dictionary (no backfill loading state).
2. Generated path (embedded dictionary miss):
   - Select a word that is NOT in the embedded dictionary (e.g., `apple`), press the shortcut.
   - Expected:
     - Overlay opens immediately (no blocking).
     - The English definition section shows a loading/placeholder state.
     - After the online request completes, the English definition section updates to:
       - a short English definition (plain text, <= 240 chars)
       - a Chinese translation of that English definition beneath it

## Cache Expectation (session/TTL)

1. Repeat the same missing-definition lookup within a short time window.
2. Expected:
   - The backfilled English definition + Chinese translation appear without a noticeable wait (cache-backed).

## Safe Degradation (no crashes)

1. Enabled but no API key:
   - Enable translation but clear the API key.
   - Trigger a missing-definition lookup.
   - Expected: a clear “not configured” state for backfill; base overlay remains usable.
2. Offline:
   - Disconnect network (airplane mode).
   - Trigger a missing-definition lookup.
   - Expected: a clear “unavailable/offline” state; no crashes; retry is user-triggered.

## Validation Record

- 2025-12-27: `npm test` ✅, `npm run lint` ✅, `npm run typecheck` ✅, `npm run build` ✅
