## ADDED Requirements
### Requirement: Translation mode and language selection
The system SHALL expose translation mode selection (Single or Dual) on the Options page. In Single
mode, the system SHALL present a direction dropdown with `EN->ZH` and `ZH->EN`. In Dual mode, the
system SHALL present a language-pair dropdown with `EN<->ZH` and display the note `查词自动识别语言`.
When translation is disabled, the mode and dropdown controls MUST remain visible but disabled.
All direction labels MUST use EN/ ZH language codes and arrow glyphs.

#### Scenario: Single mode selection
- **WHEN** the user selects Single mode
- **THEN** the Options page shows the `EN->ZH` / `ZH->EN` dropdown and hides the dual pair dropdown

#### Scenario: Dual mode selection
- **WHEN** the user selects Dual mode
- **THEN** the Options page shows the `EN<->ZH` dropdown and the auto-detect note

#### Scenario: Translation disabled
- **WHEN** translation is disabled
- **THEN** the mode and dropdown controls are visible but disabled

### Requirement: Single-mode lookup enforcement
In Single mode, the system SHALL translate only in the selected direction and MUST block lookups
in the opposite language with a guidance message that includes “或开启双向翻译模式”.

#### Scenario: Single mode blocks opposite-language lookup
- **WHEN** Single mode is set to `EN->ZH` and the user selects a Chinese word
- **THEN** the system shows “当前为 EN->ZH 模式，请到设置切换为 ZH->EN 或开启双向翻译模式” and performs no lookup

#### Scenario: Single mode allows matching-language lookup
- **WHEN** Single mode is set to `ZH->EN` and the user selects a Chinese word
- **THEN** the system proceeds with lookup and translation

### Requirement: Dual-mode lookup and list direction updates
In Dual mode, the system SHALL auto-detect lookup language and translate to the opposite language.
The system MUST update the list direction after any translation trigger, regardless of translation
success, and default the list direction to `EN->ZH` on first use.

#### Scenario: Dual mode auto-detects language
- **WHEN** Dual mode is enabled and the user selects a Chinese word
- **THEN** the system translates to English

#### Scenario: Direction updates on trigger
- **WHEN** a translation request is triggered in the lookup flow
- **THEN** the list direction updates to the triggered direction even if the request fails

### Requirement: Popup list direction toggle
When Dual mode is enabled, the popup SHALL show a direction toggle centered between `WORDMARK`
and the `NN WORDS` count. The toggle SHALL use labels `EN->ZH` and `ZH->EN` and filter the word
list by direction (English entries for EN->ZH, Chinese entries for ZH->EN). The displayed count
MUST reflect the filtered list. In Single mode, the toggle MUST be hidden and the list MUST show
only entries for the selected direction.

#### Scenario: Dual mode shows toggle
- **WHEN** Dual mode is enabled
- **THEN** the popup displays the direction toggle between `WORDMARK` and `NN WORDS`

#### Scenario: List filters by direction
- **WHEN** the user selects `ZH->EN` in the popup toggle
- **THEN** the popup shows only Chinese entries and updates the `NN WORDS` count accordingly
