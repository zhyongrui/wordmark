## MODIFIED Requirements
### Requirement: Bidirectional translation with automatic language detection
The system SHALL detect whether a lookup selection is English, Chinese, or Japanese when the selection is a single-language token and SHALL translate it to the opposite language defined by the active direction (in Single mode) or by auto-detecting the lookup language (in Dual mode) using the configured provider. The system MUST reject mixed-language selections that combine characters from more than one of the supported scripts and MUST NOT launch a translation request.

#### Scenario: English lookup translated to Chinese
- **WHEN** the user selects a pure English word and translation is enabled
- **THEN** the system requests translation with target language `zh` and displays the Chinese translation

#### Scenario: Chinese lookup translated to English
- **WHEN** the user selects a pure Chinese word and translation is enabled
- **THEN** the system requests translation with target language `en` and displays the English translation

#### Scenario: Japanese lookup translated to English
- **WHEN** the user selects a pure Japanese word and translation is enabled in a direction that targets English
- **THEN** the system requests translation with target language `en` and displays the English translation

#### Scenario: Mixed-language selection rejected
- **WHEN** the user selects text that mixes English, Chinese, or Japanese characters
- **THEN** the system ignores the selection and performs no lookup or translation

#### Scenario: Chinese selection with translation disabled
- **WHEN** the user selects a pure Chinese word while translation is disabled
- **THEN** the system performs no lookup or translation and preserves existing behavior

### Requirement: Persist translation labels for both directions
The system SHALL persist translated labels for every source language: `wordZh` for English source words, `wordEn` for Chinese source words, and `wordJa` for Japanese source words. The popup list SHALL display the stored label immediately after the word text when present.

#### Scenario: English lookup stores Chinese label
- **WHEN** an English lookup translation succeeds
- **THEN** the system stores `wordZh` and the popup shows the label after the English word

#### Scenario: Chinese lookup stores English label
- **WHEN** a Chinese lookup translation succeeds
- **THEN** the system stores `wordEn` and the popup shows the label after the Chinese word

#### Scenario: Japanese lookup stores Japanese label
- **WHEN** a Japanese lookup translation succeeds
- **THEN** the system stores `wordJa` and the popup shows the label after the Japanese word

### Requirement: Translation mode and language selection
The system SHALL expose translation mode selection (Single or Dual) on the Options page. In Single mode, the system SHALL present a direction dropdown with `EN->ZH`, `ZH->EN`, `EN->JA`, `JA->EN`, `ZH->JA`, and `JA->ZH`. In Dual mode, the system SHALL present a language-pair dropdown with `EN<->ZH`, `EN<->JA`, and `ZH<->JA` and display the note `查词自动识别语言`. When translation is disabled, the mode and dropdown controls MUST remain visible but disabled. All direction labels MUST use EN, ZH, and JA language codes together with arrow glyphs.

#### Scenario: Single mode selection
- **WHEN** the user selects Single mode
- **THEN** the Options page shows the six-direction dropdown and hides the dual pair dropdown

#### Scenario: Dual mode selection
- **WHEN** the user selects Dual mode
- **THEN** the Options page shows the three-pair dropdown and the auto-detect note

#### Scenario: Translation disabled
- **WHEN** translation is disabled
- **THEN** the mode and dropdown controls are visible but disabled

### Requirement: Single-mode lookup enforcement
In Single mode, the system SHALL translate only in the selected direction and MUST block lookups for the other languages with a guidance message that includes “或开启双向翻译模式”. The guidance message SHALL mention the current direction and invite the user to switch to its reverse direction or to Dual mode.

#### Scenario: Single mode blocks opposite-language lookup
- **WHEN** Single mode is set to `EN->JA` and the user selects a Chinese word
- **THEN** the system shows “当前为 EN->JA 模式，请到设置切换为 JA->EN 或开启双向翻译模式” and performs no lookup

#### Scenario: Single mode allows matching-language lookup
- **WHEN** Single mode is set to `JA->EN` and the user selects a Japanese word
- **THEN** the system proceeds with lookup and translation

### Requirement: Dual-mode lookup and list direction updates
In Dual mode, the system SHALL auto-detect the lookup language across English, Chinese, and Japanese and translate to the opposite language. The system MUST update the list direction after any translation trigger regardless of translation success and default the list direction to `EN->ZH` on first use.

#### Scenario: Dual mode auto-detects language
- **WHEN** Dual mode is enabled and the user selects a Japanese word
- **THEN** the system translates to the opposite language (English or Chinese depending on the current pair)

#### Scenario: Direction updates on trigger
- **WHEN** a translation request is triggered in the lookup flow
- **THEN** the list direction updates to the triggered direction even if the request fails

### Requirement: Popup list direction toggle
When Dual mode is enabled, the popup SHALL show a direction toggle centered between `WORDMARK` and the `NN WORDS` count. The toggle SHALL display the two directions that correspond to the currently selected language pair (for example, `EN->ZH`/`ZH->EN` or `EN->JA`/`JA->EN`) and SHALL filter the word list by the source language of the active direction (English entries for directions that start with `EN->`, Chinese entries for `ZH->`, Japanese entries for `JA->`). The displayed count MUST reflect the filtered list. In Single mode, the toggle MUST be hidden and the list MUST show only entries for the selected direction.

#### Scenario: Dual mode shows toggle
- **WHEN** Dual mode is enabled
- **THEN** the popup displays the direction toggle between `WORDMARK` and `NN WORDS`

#### Scenario: List filters by direction
- **WHEN** the user selects `JA->EN` in the popup toggle
- **THEN** the popup shows only Japanese entries and updates the `NN WORDS` count accordingly
