## ADDED Requirements
### Requirement: Translation API keys are provider-scoped
The system SHALL store translation API keys per provider and treat the selected provider as configured only when
its own API key is present (in addition to any required endpoint/model configuration). Clearing the API key while
a provider is selected SHALL remove only that provider's key and MUST NOT remove keys for other providers.

#### Scenario: Provider key saves without impacting others
- **WHEN** the user saves an API key while provider A is selected
- **THEN** the system stores the key for provider A and leaves other provider keys unchanged

#### Scenario: Clearing a provider key is scoped
- **WHEN** the user clears the API key while provider B is selected
- **THEN** the system removes only provider B's key and leaves other provider keys unchanged

#### Scenario: Configured status requires the selected provider key
- **WHEN** the selected provider lacks a stored API key
- **THEN** the system reports translation as not configured even if other provider keys exist
