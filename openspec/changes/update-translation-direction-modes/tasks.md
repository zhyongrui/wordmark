## 1. Implementation
- [x] 1.1 Extend translation settings schema with mode, single-direction, dual-pair, and last-direction fields.
- [x] 1.2 Update Options UI and logic for Single/Dual selection, per-mode dropdowns, and disabled controls when translation is off.
- [x] 1.3 Enforce Single-mode direction in lookup flow with the updated guidance message.
- [x] 1.4 Update translation trigger handling to persist last-direction on every trigger.
- [x] 1.5 Add popup header direction toggle between WORDMARK and WORDS, and filter the list by direction.
- [x] 1.6 Ensure Dual mode auto-detects lookup language while keeping the list toggle independent.
- [x] 1.7 Add/adjust unit tests for settings defaults, single/dual filtering, popup toggle, and direction updates.

## 2. Validation
- [x] 2.1 Run `npm test`.
- [x] 2.2 Run `npm run lint`.
