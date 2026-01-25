# definition-provider Specification

## Purpose
TBD - created by archiving change add-qwen-translation-provider. Update Purpose after archive.
## Requirements
### Requirement: Qwen definition backfill provider
When the online definition backfill feature is enabled and Qwen is selected, the system SHALL
use Qwen (DashScope) Chat Completions to generate a short English definition (1-2 sentences, plain text)
using the configured endpoint URL and model ID with Bearer API key auth. The response MUST
be parsed from `choices[0].message.content` and sanitized as plain text.

#### Scenario: Qwen definition backfill success
- **WHEN** Qwen is selected, configured, and a word without a local dictionary definition is
  looked up
- **THEN** the system requests a short English definition from Qwen and displays it (and its
  Chinese translation) without blocking the UI

#### Scenario: Qwen definition backfill missing configuration
- **WHEN** Qwen is selected but the endpoint URL or model ID is missing
- **THEN** the system returns a `not_configured` backfill response and performs no network request

### Requirement: DeepSeek definition backfill provider
When the online definition backfill feature is enabled and DeepSeek is selected, the system SHALL
use DeepSeek Chat Completions to generate a short English definition (1-2 sentences, plain text)
using the configured endpoint URL and model ID with Bearer API key auth. The response MUST
be parsed from `choices[0].message.content` and sanitized as plain text.

#### Scenario: DeepSeek definition backfill success
- **WHEN** DeepSeek is selected, configured, and a word without a local dictionary definition is
  looked up
- **THEN** the system requests a short English definition from DeepSeek and displays it (and its
  Chinese translation) without blocking the UI

#### Scenario: DeepSeek definition backfill missing configuration
- **WHEN** DeepSeek is selected but the endpoint URL or model ID is missing
- **THEN** the system returns a `not_configured` backfill response and performs no network request

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

### Requirement: Zhipu definition backfill provider
When the online definition backfill feature is enabled and Zhipu is selected, the system SHALL
use Zhipu Chat Completions to generate a short English definition (1-2 sentences, plain text)
using the configured endpoint URL and model ID with Bearer API key auth. The response MUST
be parsed from `choices[0].message.content`, sanitized as plain text, and MUST NOT enable `thinking`.

#### Scenario: Zhipu definition backfill success
- **WHEN** Zhipu is selected, configured, and a word without a local dictionary definition is
  looked up
- **THEN** the system requests a short English definition from Zhipu and displays it (and its
  Chinese translation) without blocking the UI

#### Scenario: Zhipu definition backfill missing configuration
- **WHEN** Zhipu is selected but the endpoint URL or model ID is missing
- **THEN** the system returns a `not_configured` backfill response and performs no network request

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

### Requirement: Definition backfill controls
The system SHALL expose user settings to enable online definition backfill and to enable translation
of generated definitions. Both toggles MUST default to off. When definition backfill is disabled, the
translation-of-definition toggle MUST remain visible but disabled. When definition translation is
disabled, the translated-definition UI MUST be hidden.

#### Scenario: Definition backfill disabled
- **WHEN** definition backfill is disabled
- **THEN** the system skips definition backfill requests and does not request definition translations

#### Scenario: Backfill enabled without definition translation
- **WHEN** definition backfill is enabled and definition translation is disabled
- **THEN** the system requests only the generated definition text without a translated definition
- **AND** the translated-definition UI is hidden

#### Scenario: Backfill and definition translation enabled
- **WHEN** definition backfill and definition translation are enabled
- **THEN** the system requests a generated definition and, when available, a translated definition

