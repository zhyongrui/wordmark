## ADDED Requirements
### Requirement: OpenAI definition backfill provider
When the online definition backfill feature is enabled and OpenAI is selected, the system SHALL
use OpenAI Chat Completions to generate a short English definition (1-2 sentences, plain text)
using the configured endpoint URL and model ID with Bearer API key auth. The response MUST
be parsed from `choices[0].message.content` and sanitized as plain text.

#### Scenario: OpenAI definition backfill success
- **WHEN** OpenAI is selected, configured, and a word without a local dictionary definition is
  looked up
- **THEN** the system requests a short English definition from OpenAI and displays it (and its
  Chinese translation) without blocking the UI

#### Scenario: OpenAI definition backfill missing configuration
- **WHEN** OpenAI is selected but the endpoint URL or model ID is missing
- **THEN** the system returns a `not_configured` backfill response and performs no network request
