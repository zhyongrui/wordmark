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

### Requirement: Bidirectional translation with automatic language detection
The system SHALL detect whether a lookup selection is English or Chinese when the selection is a
single-language token and SHALL translate to the opposite language using the configured provider.
The system MUST reject mixed-language selections and MUST NOT perform a translation request.

#### Scenario: English lookup translated to Chinese
- **WHEN** the user selects a pure English word and translation is enabled
- **THEN** the system requests translation with target language `zh` and displays the Chinese translation

#### Scenario: Chinese lookup translated to English
- **WHEN** the user selects a pure Chinese word and translation is enabled
- **THEN** the system requests translation with target language `en` and displays the English translation

#### Scenario: Mixed-language selection rejected
- **WHEN** the user selects text that mixes English and Chinese characters
- **THEN** the system ignores the selection and performs no lookup or translation

#### Scenario: Chinese selection with translation disabled
- **WHEN** the user selects a pure Chinese word while translation is disabled
- **THEN** the system performs no lookup or translation and preserves existing behavior

### Requirement: Chinese lookup overlay shows English translation only
When the source word is Chinese, the system SHALL display only the English translation content
and SHALL hide English definition and translated definition blocks.

#### Scenario: Chinese translation shown without definitions
- **WHEN** a Chinese lookup is translated successfully
- **THEN** the overlay shows the English translation and hides definition sections

#### Scenario: Chinese translation failure
- **WHEN** a Chinese lookup translation fails
- **THEN** the overlay shows a failure message with a retry hint and hides definition sections

### Requirement: Persist translation labels for both directions
The system SHALL persist translated labels for both directions: `wordZh` for English source words
and `wordEn` for Chinese source words. The popup list SHALL display the stored label immediately
after the word text.

#### Scenario: English lookup stores Chinese label
- **WHEN** an English lookup translation succeeds
- **THEN** the system stores `wordZh` and the popup shows the label after the English word

#### Scenario: Chinese lookup stores English label
- **WHEN** a Chinese lookup translation succeeds
- **THEN** the system stores `wordEn` and the popup shows the label after the Chinese word

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

### Requirement: Translation mode and language selection
The system SHALL expose translation mode selection (Single or Dual) on the Options page. In Single
mode, the system SHALL present a direction dropdown with `EN->ZH` and `ZH->EN`. In Dual mode, the
system SHALL present a language-pair dropdown with `EN<->ZH` and display the note `查词自动识别语言`.
When translation is disabled, the mode and dropdown controls MUST remain visible but disabled.
All direction labels MUST use EN/ ZH language codes and arrow glyphs.

#### Scenario: Single mode selection
- **WHEN** the user selects Single mode
- **THEN** the Options page shows the `EN->ZH` / `ZH->EN` dropdown and hides the dual pair dropdown

#### Scenario: Dual mode selection
- **WHEN** the user selects Dual mode
- **THEN** the Options page shows the `EN<->ZH` dropdown and the auto-detect note

#### Scenario: Translation disabled
- **WHEN** translation is disabled
- **THEN** the mode and dropdown controls are visible but disabled

### Requirement: Single-mode lookup enforcement
In Single mode, the system SHALL translate only in the selected direction and MUST block lookups
in the opposite language with a guidance message that includes “或开启双向翻译模式”.

#### Scenario: Single mode blocks opposite-language lookup
- **WHEN** Single mode is set to `EN->ZH` and the user selects a Chinese word
- **THEN** the system shows “当前为 EN->ZH 模式，请到设置切换为 ZH->EN 或开启双向翻译模式” and performs no lookup

#### Scenario: Single mode allows matching-language lookup
- **WHEN** Single mode is set to `ZH->EN` and the user selects a Chinese word
- **THEN** the system proceeds with lookup and translation

### Requirement: Dual-mode lookup and list direction updates
In Dual mode, the system SHALL auto-detect lookup language and translate to the opposite language.
The system MUST update the list direction after any translation trigger, regardless of translation
success, and default the list direction to `EN->ZH` on first use.

#### Scenario: Dual mode auto-detects language
- **WHEN** Dual mode is enabled and the user selects a Chinese word
- **THEN** the system translates to English

#### Scenario: Direction updates on trigger
- **WHEN** a translation request is triggered in the lookup flow
- **THEN** the list direction updates to the triggered direction even if the request fails

### Requirement: Popup list direction toggle
When Dual mode is enabled, the popup SHALL show a direction toggle centered between `WORDMARK`
and the `NN WORDS` count. The toggle SHALL use labels `EN->ZH` and `ZH->EN` and filter the word
list by direction (English entries for EN->ZH, Chinese entries for ZH->EN). The displayed count
MUST reflect the filtered list. In Single mode, the toggle MUST be hidden and the list MUST show
only entries for the selected direction.

#### Scenario: Dual mode shows toggle
- **WHEN** Dual mode is enabled
- **THEN** the popup displays the direction toggle between `WORDMARK` and `NN WORDS`

#### Scenario: List filters by direction
- **WHEN** the user selects `ZH->EN` in the popup toggle
- **THEN** the popup shows only Chinese entries and updates the `NN WORDS` count accordingly

