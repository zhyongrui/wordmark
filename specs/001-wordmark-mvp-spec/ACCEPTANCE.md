# Spec 001 Acceptance — WordMark MVP v0.1

**Status**: Complete and frozen (no further scope changes in Spec 001).

## Completed User Stories

- **US1**: Hotkey lookup of selected word with in-page overlay, local persistence (count + lastQueriedAt), and pronunciation when available.
- **US2**: Automatic page highlighting of previously queried words with a single global toggle (in popup), incremental updates, and delete-driven highlight removal.
- **US3**: Popup word list with default sort by query count, search filtering, and deletion.

## Verification Artifacts

- Manual smoke test: `tests/integration/extension-flows/smoke-test.md`
- Quickstart validation: `specs/001-wordmark-mvp-spec/quickstart.md`
- Closeout tasks completed: `specs/001-wordmark-mvp-spec/tasks.md` (T040–T043)

## Change Policy

Any new features or scope expansions MUST be introduced via a new spec (e.g., `002-...`) rather than modifying Spec 001.
