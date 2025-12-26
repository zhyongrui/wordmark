# Quickstart: Optional Translation (Chinese) (Spec 002)

This quickstart validates Spec 002 translation features without changing Spec 001 behaviors.

## Build & Load (same as Spec 001)

1. `npm install`
2. `npm run build`
3. Edge/Chromium extensions page → Developer mode → **Load unpacked** → select `dist/`
4. After rebuilds: **Reload** the extension → refresh the active tab.

## Verify Default-Off (Spec 001 unchanged)

1. Ensure translation is disabled (default) in the extension Options page.
2. Perform normal Spec 001 flows (lookup/highlight/popup).
3. Expected:
   - Spec 001 behavior remains unchanged.
   - No translation network requests occur.

For Spec 001 regression coverage, run:
- `tests/integration/extension-flows/smoke-test.md`
- `specs/001-wordmark-mvp-spec/quickstart.md`

## Configure Translation (explicit opt-in)

1. Open the extension Options page.
2. Enable translation (explicit opt-in).
3. Configure provider (MVP: Gemini) and set API key.
4. Expected:
   - API key is stored locally and can be cleared/replaced.
   - API key is not displayed back in full and is never logged.

## On-demand Translation (lookup overlay)

Precondition: perform a normal lookup so the in-page lookup overlay is visible.

1. In the lookup overlay, click **Translate** (explicit user action).
2. Expected:
   - Base lookup result remains visible immediately (translation does not block the overlay).
   - A loading state is shown, then Chinese translations appear for:
     - the English word
     - the English definition text (if present)
   - Translated content is clearly labeled and visually distinct.

## Safe Degradation (no crash, no retries)

1. Enabled but no API key:
   - Enable translation but clear the API key.
   - Click **Translate** in the overlay.
   - Expected: a clear “not configured” state; no crashes; no network retries.
2. Offline:
   - Disconnect network (airplane mode).
   - Click **Translate**.
   - Expected: a clear “unavailable/offline” state; Spec 001 lookup/highlight/popup remain usable.
