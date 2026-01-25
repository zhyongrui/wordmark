## ADDED Requirements
### Requirement: Definition backfill controls
The system SHALL expose user settings to enable online definition backfill and to enable translation
of generated definitions. Both toggles MUST default to off. When definition backfill is disabled, the
translation-of-definition toggle MUST remain visible but disabled. When definition translation is
disabled, the translated-definition UI MUST be hidden.

#### Scenario: Definition backfill disabled
- **WHEN** definition backfill is disabled
- **THEN** the system skips definition backfill requests and does not request definition translations

#### Scenario: Backfill enabled without definition translation
- **WHEN** definition backfill is enabled and definition translation is disabled
- **THEN** the system requests only the generated definition text without a translated definition
- **AND** the translated-definition UI is hidden

#### Scenario: Backfill and definition translation enabled
- **WHEN** definition backfill and definition translation are enabled
- **THEN** the system requests a generated definition and, when available, a translated definition
