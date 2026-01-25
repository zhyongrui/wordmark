## ADDED Requirements
### Requirement: Definition backfill runs only for English source words
The system SHALL skip online definition backfill when the source word is Chinese, even when a
provider is configured and translation is enabled.

#### Scenario: Chinese lookup skips definition backfill
- **WHEN** a Chinese word is looked up without a local dictionary definition
- **THEN** the system performs no definition backfill request and keeps the definition unavailable

#### Scenario: English lookup continues to backfill
- **WHEN** an English word without a local dictionary definition is looked up
- **THEN** the system performs definition backfill per existing behavior
