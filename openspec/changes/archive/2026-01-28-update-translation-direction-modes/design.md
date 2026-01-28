## Context
- Translation currently supports bidirectional lookups but has no mode or language-pair selection.
- The popup list shows all stored words without direction filtering.
- Options already host translation settings, so adding mode controls there keeps configuration centralized.

## Goals / Non-Goals
- Goals:
  - Default Single mode with EN->ZH selection.
  - Dual mode auto-detects lookup language and exposes a popup list toggle.
  - Use EN/ ZH labels (no Chinese characters) and keep WORDMARK/WORDS uppercase in popup header.
  - Update list direction after any translation trigger, even if translation fails.
  - Keep controls visible but disabled when translation is off.
- Non-Goals:
  - Add additional language pairs beyond EN<->ZH in this change.
  - Change provider configuration flows or API key storage.

## Decisions
- Settings shape:
  - Store `mode` (single|dual), `singleDirection` (EN->ZH|ZH->EN), and `dualPair` (EN<->ZH).
  - Store `lastDirection` for popup list defaults; update on translation trigger.
- UI placement:
  - Options: show mode toggle, then a dropdown for the selected mode, then a Dual-mode hint line.
  - Popup header: layout is `WORDMARK` on the left, direction toggle centered, `NN WORDS` + gear on the right.
- Filtering:
  - English entries identified via word normalization rules; Chinese entries via Han-only normalization.
  - Single mode: list and popup show only entries for the selected direction.
  - Dual mode: list direction defaults to `lastDirection` and can be toggled in the popup.

## Risks / Trade-offs
- Direction filtering relies on language detection; mixed-script entries remain unsupported.
- Popup layout gains an extra control, so spacing must adapt to narrow widths.

## Migration Plan
- Extend translation settings schema with new fields and default values.
- Initialize `lastDirection` to EN->ZH on first use.

## Open Questions
- None.
