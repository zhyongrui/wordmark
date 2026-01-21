# translation Specification

## Purpose
TBD - created by archiving change add-moonshot-translation-provider. Update Purpose after archive.
## Requirements
### Requirement: Moonshot translation provider
The system SHALL support Moonshot Chat Completions as a translation provider when selected, using
API key Bearer auth and the user-configured endpoint URL plus model ID. The translation request MUST
include only the looked-up word and optional definition text. The provider response MUST be parsed
from `choices[0].message.content` as a strict JSON payload containing `translatedWord` and optional
`translatedDefinition`.

#### Scenario: Moonshot translation success
- **WHEN** the user selects Moonshot, supplies an API key, endpoint URL, and model ID, and opens the
  lookup overlay with translation enabled
- **THEN** the system sends a Chat Completions request to the configured endpoint and returns the
  Chinese translation for the word (and definition when present)

#### Scenario: Moonshot translation missing configuration
- **WHEN** Moonshot is selected but the endpoint URL or model ID is missing
- **THEN** the system returns a `not_configured` translation error and performs no network request

### Requirement: Moonshot configuration is user-managed
The system SHALL expose Moonshot configuration fields (endpoint URL and model ID) on the Options page,
persist them locally, and provide no defaults. These settings MUST NOT be exposed to content scripts.

#### Scenario: User saves Moonshot configuration
- **WHEN** the user enters a Moonshot endpoint URL and model ID and saves settings
- **THEN** the values are persisted locally for background translation use

#### Scenario: Moonshot configuration remains optional
- **WHEN** the user leaves Moonshot configuration empty
- **THEN** the system continues to treat Moonshot as not configured and avoids network calls

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

### Requirement: DeepSeek translation provider
The system SHALL support DeepSeek Chat Completions as a translation provider when selected, using
API key Bearer auth and the user-configured endpoint URL plus model ID. The translation request MUST
include only the looked-up word and optional definition text. The provider response MUST be parsed
from `choices[0].message.content` as a strict JSON payload containing `translatedWord` and optional
`translatedDefinition`.

#### Scenario: DeepSeek translation success
- **WHEN** the user selects DeepSeek, supplies an API key, endpoint URL, and model ID, and opens the
  lookup overlay with translation enabled
- **THEN** the system sends a Chat Completions request to the configured endpoint and returns the
  Chinese translation for the word (and definition when present)

#### Scenario: DeepSeek translation missing configuration
- **WHEN** DeepSeek is selected but the endpoint URL or model ID is missing
- **THEN** the system returns a `not_configured` translation error and performs no network request

### Requirement: DeepSeek configuration is user-managed
The system SHALL expose DeepSeek configuration fields (endpoint URL and model ID) on the Options page,
persist them locally, and provide no defaults. These settings MUST NOT be exposed to content scripts.

#### Scenario: User saves DeepSeek configuration
- **WHEN** the user enters a DeepSeek endpoint URL and model ID and saves settings
- **THEN** the values are persisted locally for background translation use

#### Scenario: DeepSeek configuration remains optional
- **WHEN** the user leaves DeepSeek configuration empty
- **THEN** the system continues to treat DeepSeek as not configured and avoids network calls

### Requirement: OpenAI translation provider
The system SHALL support OpenAI Chat Completions as a translation provider when selected, using
API key Bearer auth and the user-configured endpoint URL plus model ID. The translation request MUST
include only the looked-up word and optional definition text. The provider response MUST be parsed
from `choices[0].message.content` as a strict JSON payload containing `translatedWord` and optional
`translatedDefinition`.

#### Scenario: OpenAI translation success
- **WHEN** the user selects OpenAI, supplies an API key, endpoint URL, and model ID, and opens the
  lookup overlay with translation enabled
- **THEN** the system sends a Chat Completions request to the configured endpoint and returns the
  Chinese translation for the word (and definition when present)

#### Scenario: OpenAI translation missing configuration
- **WHEN** OpenAI is selected but the endpoint URL or model ID is missing
- **THEN** the system returns a `not_configured` translation error and performs no network request

### Requirement: OpenAI configuration is user-managed
The system SHALL expose OpenAI configuration fields (endpoint URL and model ID) on the Options page,
persist them locally, and provide no defaults. These settings MUST NOT be exposed to content scripts.

#### Scenario: User saves OpenAI configuration
- **WHEN** the user enters an OpenAI endpoint URL and model ID and saves settings
- **THEN** the values are persisted locally for background translation use

#### Scenario: OpenAI configuration remains optional
- **WHEN** the user leaves OpenAI configuration empty
- **THEN** the system continues to treat OpenAI as not configured and avoids network calls

### Requirement: Zhipu translation provider
The system SHALL support Zhipu Chat Completions as a translation provider when selected, using
API key Bearer auth and the user-configured endpoint URL plus model ID. The translation request MUST
include only the looked-up word and optional definition text, and MUST NOT include `thinking` mode.
The provider response MUST be parsed from `choices[0].message.content` as a strict JSON payload
containing `translatedWord` and optional `translatedDefinition`.

#### Scenario: Zhipu translation success
- **WHEN** the user selects Zhipu, supplies an API key, endpoint URL, and model ID, and opens the
  lookup overlay with translation enabled
- **THEN** the system sends a Chat Completions request to the configured endpoint and returns the
  Chinese translation for the word (and definition when present)

#### Scenario: Zhipu translation missing configuration
- **WHEN** Zhipu is selected but the endpoint URL or model ID is missing
- **THEN** the system returns a `not_configured` translation error and performs no network request

### Requirement: Zhipu configuration is user-managed
The system SHALL expose Zhipu configuration fields (endpoint URL and model ID) on the Options page,
persist them locally, and provide no defaults. These settings MUST NOT be exposed to content scripts.

#### Scenario: User saves Zhipu configuration
- **WHEN** the user enters a Zhipu endpoint URL and model ID and saves settings
- **THEN** the values are persisted locally for background translation use

#### Scenario: Zhipu configuration remains optional
- **WHEN** the user leaves Zhipu configuration empty
- **THEN** the system continues to treat Zhipu as not configured and avoids network calls

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

