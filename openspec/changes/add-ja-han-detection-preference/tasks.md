## 1. Implementation
- [ ] Add a new translation setting: prefer Japanese for Kanji-only selections (default: enabled)
- [ ] Options UI: show the toggle only when the Direction selection includes `JA`
- [ ] Content script: use the new setting + page `<html lang>` hint to treat Kanji-only selections as `ja` in JA directions
- [ ] Add/update unit tests for settings parsing and content-script behavior

## 2. Verification
- [ ] `npm test`
- [ ] `npm run lint`

