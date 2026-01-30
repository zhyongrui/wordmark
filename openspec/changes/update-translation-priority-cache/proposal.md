# Change: prioritize translation requests and extend cache TTL

## Why
Users want faster translation responses. When translation and definition backfill are both enabled, the definition backfill request can compete with translation. Extending the translation cache TTL reduces repeat API calls, and prioritizing translation keeps the primary response fast.

## What Changes
- Ensure translation requests complete before definition backfill when both are triggered.
- Extend translation result cache TTL to 7 days (in-memory).

## Impact
- Affected specs: translation
- Affected code: `src/content/index.ts`, `src/background/handlers/translation.ts`
