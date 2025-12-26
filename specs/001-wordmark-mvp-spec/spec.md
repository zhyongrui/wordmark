# Feature Specification: WordMark MVP

**Feature Branch**: `001-wordmark-mvp-spec`  
**Created**: 2025-12-21  
**Status**: Draft  
**Input**: User description: "为 WordMark 定义 MVP：快捷键查词、释义/发音、已查词高亮、Popup 词表。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 快速查词并记录 (Priority: P1)

在网页阅读时，用户选中一个英文单词并用快捷键触发查询，在不离开页面的情况下看到释义与发音，并将该词的查询次数与最近查询时间记录下来。

**Why this priority**: 这是用户的核心需求，直接决定“阅读中查词”的价值。

**Independent Test**: 在任意英文网页选中一个单词并触发快捷键，能够看到释义、播放发音，且再次查询同一词时计数递增、最近查询时间更新。

**Acceptance Scenarios**:

1. **Given** 用户选中一个英文单词，**When** 触发快捷键查询，**Then** 页面内显示该词的基础释义并提供可播放的发音入口
2. **Given** 某单词已被查询过一次，**When** 再次查询该词，**Then** 该词查询次数增加且最近查询时间更新

---

### User Story 2 - 页面高亮与关闭 (Priority: P2)

用户在阅读页面中能看到已查询过的单词被低干扰高亮标识，并可一键关闭高亮以减少干扰。

**Why this priority**: 高亮帮助用户回忆已查词，同时必须尊重阅读体验。

**Independent Test**: 在已存在查询记录的情况下打开包含这些词的页面，看到高亮，并可通过一次操作关闭高亮。

**Acceptance Scenarios**:

1. **Given** 页面包含已查询过的单词且高亮默认开启，**When** 页面加载完成，**Then** 已查询单词以低干扰样式被高亮
2. **Given** 高亮已开启，**When** 用户执行关闭高亮操作，**Then** 当前页面所有高亮被清除且阅读不再被打扰

---

### User Story 3 - Popup 词表管理 (Priority: P3)

用户打开扩展的 popup 页面，可以查看所有已查询单词，默认按查询次数降序排序，并可搜索与删除。

**Why this priority**: 词表提供复习入口和数据管理能力，是 MVP 的第二核心界面。

**Independent Test**: 预置多个词条后打开 popup，确认排序正确，搜索能筛选，删除后列表更新。

**Acceptance Scenarios**:

1. **Given** 词表中存在多个查询记录，**When** 用户打开 popup，**Then** 列表按查询次数降序展示
2. **Given** popup 列表已展示，**When** 用户搜索或删除某个单词，**Then** 列表立即过滤或移除该条目

---

### Edge Cases

- 选中文本为空、包含多个单词或仅为标点符号
- 单词包含大小写/标点差异（如 "Apple," 与 "apple"）
- 释义或发音不可用时的反馈
- 页面内容很长或频繁动态更新
- 连续快速触发查询快捷键
- 高亮关闭后刷新或切换页面

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to trigger lookup via a keyboard shortcut on selected text
- **FR-002**: System MUST normalize the selected word (case and punctuation) before lookup and storage
- **FR-003**: System MUST store each word locally with query count and last queried time
- **FR-004**: System MUST display a basic definition in-page without leaving the current page
- **FR-005**: System MUST provide at least one pronunciation playback option when available
- **FR-006**: System MUST highlight occurrences of previously queried words on the page by default
- **FR-007**: Users MUST be able to disable or enable highlighting with a single action
- **FR-008**: Popup MUST list all queried words sorted by query count descending by default
- **FR-009**: Popup MUST support case-insensitive search by word and deletion of words
- **FR-010**: Deleting a word MUST remove it from the popup list and stop highlighting it on the
  current page within 2 seconds
- **FR-011**: System MUST operate with local-only data storage and no network usage by default
- **FR-012**: System MUST run correctly in Edge and Chromium browsers
- **FR-013**: When a lookup yields no definition or pronunciation, the system MUST show a clear
  "not available" state while still recording the lookup
- **FR-014**: If the selected text is empty or contains more than one word after normalization,
  the system MUST show a lightweight notice and MUST NOT create a word entry

### Non-Functional Requirements

- **NFR-001**: On typical article pages (about 10,000 words or less), lookup feedback MUST appear
  within 1 second for 95% of queries
- **NFR-002**: On typical pages, highlight toggling MUST complete within 2 seconds and the page
  MUST remain responsive to scroll and selection during updates

### Constitution Constraints *(mandatory)*

- **CC-001**: Feature MUST stay within reading-time vocabulary marking/memory scope
- **CC-002**: Privacy default: store word data only locally; no network or analytics unless opt-in
- **CC-003**: UX: hotkey lookup fast/non-blocking; definition/pronunciation UI non-obstructive;
  highlight low-interference with one-click disable
- **CC-004**: Performance: highlighting updates incrementally with controlled update frequency;
  avoid main-thread blocking and full-page scans; ignore editable fields and script/style content
  (code/pre content may be highlighted)
- **CC-005**: Security: do not inject untrusted HTML; keep extension scripts isolated from page
  scripts; least permissions
- **CC-006**: Engineering & tests: language choice and module boundaries follow the constitution;
  data is versioned with migrations; core word logic independently testable; UI/data decoupled

### Key Entities *(include if feature involves data)*

- **WordEntry**: 单词条目（normalizedWord、displayWord、queryCount、lastQueriedAt、definition、pronunciationAvailable）
- **HighlightPreference**: 高亮偏好（enabled）
- **WordList**: 词条集合（用于 popup 展示与搜索）

## Out of Scope (MVP)

- 云同步或跨设备同步
- 完整词典（多释义、词源、例句库）
- 学习计划、提醒、记忆曲线等功能

## Dependencies

- 用户已在 Edge 或 Chromium 浏览器中安装并启用扩展
- 页面内容为英文或包含英文单词，便于查词与高亮

## Assumptions

- MVP 聚焦英文词汇的基础释义与发音
- 用户主要通过键盘快捷键触发查词

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在典型文章页面（约 10,000 词以内）上，95% 的查询在 1 秒内显示释义
- **SC-002**: 连续查询同一单词 3 次，查询次数准确累积且最近查询时间更新
- **SC-003**: 在典型页面上，开启或关闭高亮操作可在 2 秒内完成并生效
- **SC-004**: 在断网状态下，查词、发音（如可用）、高亮与 popup 列表功能均可使用
