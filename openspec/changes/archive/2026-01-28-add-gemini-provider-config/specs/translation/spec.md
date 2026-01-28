## ADDED Requirements
### Requirement: Gemini translation provider supports optional endpoint overrides
When Gemini is selected for translation, the system SHALL use a user-configured Gemini base endpoint URL and model
ID when provided; otherwise it SHALL fall back to built-in Gemini base URLs and automatic model selection. The
translation request MUST include only the looked-up word and optional definition text, and the response MUST be
parsed from the Gemini `generateContent` response into `translatedWord` and optional `translatedDefinition`.

#### Scenario: Gemini translation uses configured endpoint
- **WHEN** the user selects Gemini, supplies an API key, and saves a Gemini endpoint URL plus model ID
- **THEN** the system sends the translation request to the configured endpoint/model and returns the translation

#### Scenario: Gemini translation uses default endpoints when not configured
- **WHEN** the user selects Gemini with an API key and leaves the Gemini endpoint/model empty
- **THEN** the system uses the built-in Gemini endpoints and automatic model selection

### Requirement: Gemini configuration is user-managed
The system SHALL expose optional Gemini configuration fields (endpoint URL and model ID) on the Options page and
persist them locally. These settings MUST NOT be exposed to content scripts.

#### Scenario: User saves Gemini configuration
- **WHEN** the user enters a Gemini endpoint URL and model ID and saves settings
- **THEN** the values are persisted locally for background translation and definition use

#### Scenario: Gemini configuration remains optional
- **WHEN** the user leaves Gemini configuration empty
- **THEN** the system continues to use the built-in Gemini endpoints and automatic model selection
