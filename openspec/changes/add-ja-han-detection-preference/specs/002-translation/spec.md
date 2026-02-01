# Spec 002 Delta: Japanese Kanji-only Detection Preference

## ADDED Requirements

### Requirement: Kanji-only detection preference for Japanese directions
The system SHALL provide a user preference that influences how Kanji-only (Han-only) selections are interpreted
when the active translation direction includes Japanese (`JA->*` or `*<->JA`).

#### Scenario: Toggle is shown only for Japanese directions
- **GIVEN** the user is configuring translation direction in Options
- **WHEN** the selected direction includes `JA`
- **THEN** the UI shows an additional preference control near the Direction selector
- **AND** it is enabled by default
- **AND** when the selected direction does not include `JA`, the control is hidden

#### Scenario: Kanji-only selection is treated as Japanese when enabled
- **GIVEN** the user has enabled the preference
- **AND** the selected direction includes `JA`
- **WHEN** the user looks up a Kanji-only word
- **THEN** the lookup SHOULD treat the selection language as Japanese, using the page language hint when available

#### Scenario: Kanji-only selection falls back to Chinese when disabled
- **GIVEN** the user has disabled the preference
- **WHEN** the user looks up a Kanji-only word
- **THEN** the system uses the existing script-based language detection behavior

