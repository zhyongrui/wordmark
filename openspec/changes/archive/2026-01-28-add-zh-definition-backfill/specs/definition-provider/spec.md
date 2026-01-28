## ADDED Requirements
### Requirement: Chinese definition backfill
The system SHALL, when the online definition backfill feature is enabled and the looked-up word is Chinese,
generate a short Chinese definition (1-2 sentences, plain text) using the selected provider and
translate that definition to English. The overlay SHALL display the Chinese definition and the English
translation in the same layout order used for English-source definitions.

#### Scenario: Chinese definition backfill success
- **WHEN** a Chinese word without a local definition is looked up and definition backfill is enabled
- **THEN** the system generates a short Chinese definition, translates it to English, and displays both

#### Scenario: Chinese definition translation unavailable
- **WHEN** a Chinese definition is generated but the translation provider returns no translated definition
- **THEN** the overlay displays the Chinese definition and shows the existing translation-unavailable message
