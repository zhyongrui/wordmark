## ADDED Requirements
### Requirement: Translation requests are prioritized over definition backfill
When translation and definition backfill are both enabled for a lookup, the system SHALL complete
(or fail) the translation request before issuing the definition backfill request.

#### Scenario: Translation request completes before backfill
- **WHEN** translation and definition backfill are both enabled for a lookup
- **THEN** the system performs the translation request first and only then issues the definition backfill request

### Requirement: Translation results are cached for up to 7 days
The system SHALL cache successful translation results in memory for up to 7 days to reduce repeat
provider requests for the same word, direction, and definition payload.

#### Scenario: Cached translation served within TTL
- **WHEN** the user repeats a translation request within 7 days of a prior successful response
- **THEN** the system returns the cached translation without issuing a new provider request
