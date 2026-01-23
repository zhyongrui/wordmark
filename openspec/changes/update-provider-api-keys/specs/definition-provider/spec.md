## ADDED Requirements
### Requirement: Definition backfill uses provider-scoped API keys
When online definition backfill is enabled, the system SHALL use the API key stored for the selected provider. A
missing API key for the selected provider MUST result in a not-configured response, even if other provider keys
exist.

#### Scenario: Backfill rejects missing provider key
- **WHEN** definition backfill is enabled and the selected provider has no stored API key
- **THEN** the system returns a not-configured response and performs no network request
