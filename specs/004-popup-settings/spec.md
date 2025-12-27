# Feature Specification: Popup Settings Entry and Centered Count

**Feature Branch**: `[004-popup-settings]`  
**Created**: 2025-12-27  
**Status**: Draft  
**Input**: User description: "Feature: 004-popup-settings-entry Goal: Improve usability by adding an in-popup Settings entry and adjusting header layout. Requirements: Popup top-right shows a small settings icon button. Clicking it opens the extension options page (same page as options.html). Remove the \"X WORDS\" count from the top-right header; instead display total word count centered in the popup header area (visually centered, not right-aligned). Must not break existing popup behaviors: highlight toggle, search, list rendering, delete. Acceptance: Clicking settings icon always opens options page. Word count is centered and updates correctly. Build + reload works; no console errors in popup. Notes: MV3. Prefer chrome.runtime.openOptionsPage() with fallback to chrome.tabs.create({ url: chrome.runtime.getURL(options/options.html) })."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open settings from popup (Priority: P1)

A user wants to change extension settings directly from the popup by clicking a settings icon in the header.

**Why this priority**: Enables quick access to configuration without leaving the popup, reducing friction for all users.

**Independent Test**: Open the popup, click the settings icon, and confirm the extension settings page loads without extra navigation steps.

**Acceptance Scenarios**:

1. **Given** the popup is open, **When** the user clicks the settings icon, **Then** the extension settings page opens successfully.
2. **Given** the settings page is already open in a browser context, **When** the user clicks the settings icon again, **Then** a settings view is still presented (open or focused) without error.

---

### User Story 2 - See total word count at a glance (Priority: P2)

A user wants to know how many saved words exist without hunting for the value, with the total clearly centered in the popup header.

**Why this priority**: The total count is a core indicator of progress; centering it increases visibility and reduces confusion.

**Independent Test**: Open the popup and verify the total word count appears centered in the header and matches the stored list total.

**Acceptance Scenarios**:

1. **Given** the user opens the popup, **When** the header renders, **Then** the total word count is visibly centered and readable.
2. **Given** the user adds or removes a word, **When** the popup updates, **Then** the centered total reflects the new count.

---

### User Story 3 - Keep current popup flows intact (Priority: P3)

A user expects existing popup actions (highlight toggle, search, viewing and deleting words) to keep working after the header changes.

**Why this priority**: Prevents regressions to core behaviors while improving header usability.

**Independent Test**: Run the usual popup flows (toggle highlight, search, delete a word) and confirm they behave as before alongside the new header layout.

**Acceptance Scenarios**:

1. **Given** the user toggles highlighting in the popup, **When** the header changes are present, **Then** the toggle still updates and reflects the correct state.
2. **Given** the user searches and deletes items from the list, **When** the header shows the centered count, **Then** list rendering and deletion continue to work without errors.

---

### Edge Cases

- Settings icon is clicked repeatedly or quickly: each action should still present a settings view without duplicate errors.
- Settings icon is used while offline: the settings page still opens because it is part of the extension package.
- Word list is empty: the centered total displays zero clearly without misalignment.
- Word list changes while the popup stays open (add/delete): the centered total updates promptly to match the new total.
- Very long word lists: the centered total still renders legibly and does not overlap other header elements.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The popup header MUST show a settings control in the top-right area that is clearly identifiable and clickable.
- **FR-002**: Selecting the settings control MUST open the extension's settings/options page in a single step, even if that page is already open elsewhere.
- **FR-003**: The popup header MUST display the total saved word count centered in the header area, replacing the prior right-aligned count.
- **FR-004**: The displayed total MUST update whenever the saved word list changes (additions, deletions) so the count always matches the current list.
- **FR-005**: The header layout changes MUST NOT interfere with existing popup interactions (highlight toggle, search, list rendering, deletion); all existing flows continue to operate.
- **FR-006**: Opening and using the popup with the updated header MUST avoid runtime errors in user-facing contexts (e.g., no visible errors while opening settings, toggling highlight, searching, or deleting).

### Key Entities *(include if feature involves data)*

- **Saved Words**: The collection of stored words whose total is surfaced in the popup header.
- **Popup Header**: The top area of the popup that now contains both the settings control and the centered total count.
- **Settings Page**: The extension's options interface that users reach via the popup settings control.

## Assumptions

- The extension options/settings page is available locally to the user and can be opened without network connectivity.
- The total displayed in the popup reflects the full set of saved words managed by the extension at that moment.
- Users have permission to access the settings page from the popup context in their browser.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of clicks on the popup settings control present the extension settings page within one user action during testing.
- **SC-002**: The centered total word count reflects the actual saved list total within one second of any add or delete action during popup use.
- **SC-003**: Core popup flows (highlight toggle, search, list rendering, deletion) complete without functional regression in at least 10 consecutive smoke-test runs.
- **SC-004**: Popup interactions after build and reload exhibit zero user-visible console errors across the standard flows exercised in testing.
