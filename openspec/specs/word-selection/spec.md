# word-selection Specification

## Purpose
TBD - created by archiving change add-zh-lookup-translation. Update Purpose after archive.
## Requirements
### Requirement: Language-restricted selection normalization
The system SHALL accept lookup selections that are either a pure English token (letters with
optional internal apostrophes/hyphens) or a pure Chinese token (Han characters only) after
trimming whitespace. Any selection containing mixed scripts, digits, or punctuation MUST be
rejected and MUST NOT create a lookup entry.

#### Scenario: English token accepted
- **WHEN** the user selects a pure English token
- **THEN** the system normalizes the token and proceeds with lookup

#### Scenario: Chinese token accepted
- **WHEN** the user selects a pure Chinese token
- **THEN** the system normalizes the token and proceeds with lookup

#### Scenario: Mixed token rejected
- **WHEN** the user selects a token containing both English and Chinese characters
- **THEN** the system ignores the selection and performs no lookup

### Requirement: Highlighting supports Chinese entries
When highlighting is enabled, the system SHALL highlight stored Chinese normalized words in page
text while preserving the existing English highlight behavior.

#### Scenario: Chinese highlight applies
- **WHEN** a Chinese word is stored and highlight is enabled
- **THEN** matching Chinese occurrences are highlighted on the page

