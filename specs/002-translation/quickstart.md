# Quickstart: Optional Translation (Chinese) (Spec 002)

This quickstart validates Spec 002 translation features without changing Spec 001 behaviors.

## Spec 002 验收入口 (Shortcut auto-translate)

1. 先完成一次正常查词（或直接选中单词后按快捷键触发查词）
2. 在 Options 中开启 Translation，并配置 API key
3. 回到网页，选中一个英文单词，按 WordMark 快捷键打开浮窗
4. 预期：浮窗立即显示查词结果，并自动触发翻译（无需点击 Translate；按钮已移除）

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

Precondition: use the existing WordMark shortcut to open the in-page lookup overlay for a selected word.

1. With translation enabled, press the shortcut to open the lookup overlay.
2. Expected:
   - Base lookup result remains visible immediately (translation does not block the overlay).
   - A loading state is shown, then Chinese translations appear for:
     - the English word
     - the English definition text (if present)
   - UI layout (when translation is enabled):
     - Under the word title: Chinese translation (word)
     - In the lower section: English definition (dictionary) + Chinese translation of that definition (if present)
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
3. Quota exceeded / rate-limited:
   - Use a provider account/key that is out of quota or temporarily rate-limited.
   - Click **Translate**.
   - Expected: a clear “quota exceeded/unavailable” state; no crashes; no background retry loops; Spec 001 remains usable.
4. Timeout (slow network):
   - Throttle network (e.g., DevTools → Network → Slow 3G) so translation cannot complete promptly.
   - Press the shortcut to open the overlay.
   - Expected: a clear “timeout/unavailable” state; no crashes; retry only happens if the user presses the shortcut again.

## Retry & Cache Expectations (MVP)

- Retry: On translation failures, the overlay shows a short error with a hint to “press the shortcut again to retry”.
- Cache: Successful translations may be reused in-memory for a short TTL (no disk persistence). Repeating the same lookup
  shortly may not trigger another provider request; after the TTL expires, a new request may be sent.

## Validation Record

- 2025-12-26: `npm test` ✅, `npm run lint` ✅, `npm run typecheck` ✅, `npm run build` ✅
- 2025-12-27: `npm test` ✅, `npm run build` ✅ (Spec 002 auto-translate + overlay layout update)
- Manual (required): run `tests/integration/extension-flows/smoke-test.md` with translation disabled to confirm Spec 001 behavior is unchanged and no translation networking occurs by default.
