## ADDED Requirements
### Requirement: Volcengine definition backfill provider
When the online definition backfill feature is enabled and Volcengine is selected, the system SHALL
use Volcengine Chat Completions to generate a short English definition (1-2 sentences, plain text)
using the configured endpoint URL and model/endpoint ID with Bearer API key auth. The response MUST
be parsed from `choices[0].message.content` and sanitized as plain text.

#### Scenario: Volcengine definition backfill success
- **WHEN** Volcengine is selected, configured, and a word without a local dictionary definition is
  looked up
- **THEN** the system requests a short English definition from Volcengine and displays it (and its
  Chinese translation) without blocking the UI

#### Scenario: Volcengine definition backfill missing configuration
- **WHEN** Volcengine is selected but the endpoint URL or model/endpoint ID is missing
- **THEN** the system returns a `not_configured` backfill response and performs no network request
