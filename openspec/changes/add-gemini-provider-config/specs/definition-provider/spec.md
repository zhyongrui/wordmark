## ADDED Requirements
### Requirement: Gemini definition backfill supports optional endpoint overrides
When the online definition backfill feature is enabled and Gemini is selected, the system SHALL use a user-
configured Gemini base endpoint URL and model ID when provided; otherwise it SHALL fall back to built-in Gemini
base URLs and automatic model selection. The response MUST be parsed from the Gemini `generateContent` response
and sanitized as plain text.

#### Scenario: Gemini definition backfill uses configured endpoint
- **WHEN** Gemini is selected, an API key is present, and a Gemini endpoint URL plus model ID are saved
- **THEN** the system requests a definition from the configured endpoint/model and returns a sanitized definition

#### Scenario: Gemini definition backfill uses default endpoints when not configured
- **WHEN** Gemini is selected and no Gemini endpoint/model override is saved
- **THEN** the system uses the built-in Gemini endpoints and automatic model selection
