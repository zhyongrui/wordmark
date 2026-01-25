## ADDED Requirements
### Requirement: Bidirectional translation with automatic language detection
The system SHALL detect whether a lookup selection is English or Chinese when the selection is a
single-language token and SHALL translate to the opposite language using the configured provider.
The system MUST reject mixed-language selections and MUST NOT perform a translation request.

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
- **THEN** the system performs no lookup or translation and preserves existing behavior

### Requirement: Chinese lookup overlay shows English translation only
When the source word is Chinese, the system SHALL display only the English translation content
and SHALL hide English definition and translated definition blocks.

#### Scenario: Chinese translation shown without definitions
- **WHEN** a Chinese lookup is translated successfully
- **THEN** the overlay shows the English translation and hides definition sections

#### Scenario: Chinese translation failure
- **WHEN** a Chinese lookup translation fails
- **THEN** the overlay shows a failure message with a retry hint and hides definition sections

### Requirement: Persist translation labels for both directions
The system SHALL persist translated labels for both directions: `wordZh` for English source words
and `wordEn` for Chinese source words. The popup list SHALL display the stored label immediately
after the word text.

#### Scenario: English lookup stores Chinese label
- **WHEN** an English lookup translation succeeds
- **THEN** the system stores `wordZh` and the popup shows the label after the English word

#### Scenario: Chinese lookup stores English label
- **WHEN** a Chinese lookup translation succeeds
- **THEN** the system stores `wordEn` and the popup shows the label after the Chinese word
