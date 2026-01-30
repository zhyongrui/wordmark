## MODIFIED Requirements
### Requirement: Language-restricted selection normalization
The system SHALL accept lookup selections that are either a pure English token (letters with
optional internal apostrophes/hyphens), a pure Chinese token (Han characters only), or a pure
Japanese token (Kana/Han) after trimming whitespace. Any selection containing mixed scripts,
digits, or punctuation MUST be rejected and MUST NOT create a lookup entry.

#### Scenario: English token accepted
- **WHEN** the user selects a pure English token
- **THEN** the system normalizes the token and proceeds with lookup

#### Scenario: Chinese token accepted
- **WHEN** the user selects a pure Chinese token
- **THEN** the system normalizes the token and proceeds with lookup

#### Scenario: Japanese token accepted
- **WHEN** the user selects a pure Japanese token
- **THEN** the system normalizes the token and proceeds with lookup

#### Scenario: Mixed token rejected
- **WHEN** the user selects a token containing mixed English, Chinese, or Japanese scripts
- **THEN** the system ignores the selection and performs no lookup
