## ADDED Requirements
### Requirement: Qwen translation provider
The system SHALL support Qwen (DashScope) Chat Completions as a translation provider when selected, using
API key Bearer auth and the user-configured endpoint URL plus model ID. The translation request MUST
include only the looked-up word and optional definition text. The provider response MUST be parsed from
`choices[0].message.content` as a strict JSON payload containing `translatedWord` and optional
`translatedDefinition`.

#### Scenario: Qwen translation success
- **WHEN** the user selects Qwen, supplies an API key, endpoint URL, and model ID, and opens the
  lookup overlay with translation enabled
- **THEN** the system sends a Chat Completions request to the configured endpoint and returns the
  Chinese translation for the word (and definition when present)

#### Scenario: Qwen translation missing configuration
- **WHEN** Qwen is selected but the endpoint URL or model ID is missing
- **THEN** the system returns a `not_configured` translation error and performs no network request

### Requirement: Qwen configuration is user-managed
The system SHALL expose Qwen configuration fields (endpoint URL and model ID) on the Options page,
persist them locally, and provide no defaults. These settings MUST NOT be exposed to content scripts.

#### Scenario: User saves Qwen configuration
- **WHEN** the user enters a Qwen endpoint URL and model ID and saves settings
- **THEN** the values are persisted locally for background translation use

#### Scenario: Qwen configuration remains optional
- **WHEN** the user leaves Qwen configuration empty
- **THEN** the system continues to treat Qwen as not configured and avoids network calls
