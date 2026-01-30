## MODIFIED Requirements
### Requirement: Bidirectional translation with automatic language detection
The system SHALL detect whether a lookup selection is English or Chinese when the selection is a
single-language token and SHALL translate to the opposite language using the configured provider
when translation is enabled. The system MUST reject mixed-language selections and MUST NOT perform
any translation request. When translation is disabled, the system SHALL still perform the lookup
and record the word entry without issuing a translation request.

#### Scenario: English lookup translated to Chinese
- **WHEN** the user selects a pure English word and translation is enabled
- **THEN** the system requests translation with target language `zh` and displays the Chinese translation

#### Scenario: Chinese lookup translated to English
- **WHEN** the user selects a pure Chinese word and translation is enabled
- **THEN** the system requests translation with target language `en` and displays the English translation

#### Scenario: Mixed-language selection rejected
- **WHEN** the user selects text that mixes English and Chinese characters
- **THEN** the system ignores the selection and performs no lookup or translation

#### Scenario: Chinese selection with translation disabled
- **WHEN** the user selects a pure Chinese word while translation is disabled
- **THEN** the system performs the lookup, records the word entry, and performs no translation request

### Requirement: Popup list direction toggle
When Dual mode is enabled, the popup SHALL show a direction toggle centered between `WORDMARK`
and the `NN WORDS` count. The toggle SHALL use labels `EN->ZH` and `ZH->EN` and filter the word
list by direction (English entries for EN->ZH, Chinese entries for ZH->EN). The displayed count
MUST reflect the filtered list. In Single mode, the toggle MUST be hidden and the list MUST show
only entries for the selected direction. When translation is disabled, the popup SHALL hide the
direction toggle and instead show a language filter list with `All`, `EN`, `ZH`, and `JA` options.
The list MUST filter by the source language only and MUST NOT require a translated label to
display the entry.

#### Scenario: Dual mode shows toggle
- **WHEN** Dual mode is enabled
- **THEN** the popup displays the direction toggle between `WORDMARK` and `NN WORDS`

#### Scenario: List filters by direction
- **WHEN** the user selects `ZH->EN` in the popup toggle
- **THEN** the popup shows only Chinese entries and updates the `NN WORDS` count accordingly

#### Scenario: Translation disabled shows language filter
- **WHEN** translation is disabled
- **THEN** the popup hides the direction toggle and shows the language filter list instead

#### Scenario: Translation disabled filters by source language
- **WHEN** translation is disabled and the user selects `JA` in the language filter
- **THEN** the popup shows only Japanese entries and updates the `NN WORDS` count accordingly
