## ADDED Requirements
### Requirement: Volcengine translation provider
The system SHALL support Volcengine Chat Completions as a translation provider when selected, using
API key Bearer auth and the user-configured endpoint URL plus model/endpoint ID. The translation
request MUST include only the looked-up word and optional definition text. The provider response
MUST be parsed from `choices[0].message.content` as a strict JSON payload containing
`translatedWord` and optional `translatedDefinition`.

#### Scenario: Volcengine translation success
- **WHEN** the user selects Volcengine, supplies an API key, endpoint URL, and model/endpoint ID, and
  opens the lookup overlay with translation enabled
- **THEN** the system sends a Chat Completions request to the configured endpoint and returns the
  Chinese translation for the word (and definition when present)

#### Scenario: Volcengine translation missing configuration
- **WHEN** Volcengine is selected but the endpoint URL or model/endpoint ID is missing
- **THEN** the system returns a `not_configured` translation error and performs no network request

### Requirement: Volcengine configuration is user-managed
The system SHALL expose Volcengine configuration fields (endpoint URL and model/endpoint ID) on the
Options page, persist them locally, and provide no defaults. These settings MUST NOT be exposed to
content scripts.

#### Scenario: User saves Volcengine configuration
- **WHEN** the user enters a Volcengine endpoint URL and model/endpoint ID and saves settings
- **THEN** the values are persisted locally for background translation use

#### Scenario: Volcengine configuration remains optional
- **WHEN** the user leaves Volcengine configuration empty
- **THEN** the system continues to treat Volcengine as not configured and avoids network calls
