<!--
Sync Impact Report
- Version change: Unversioned → 1.0.0
- Modified principles: Initial adoption (no prior titles)
- Added sections: Core Principles defined (7); 补充约束; 工作流与质量门禁; Governance rules
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ⚠ .specify/templates/commands/*.md (directory not found)
- Follow-up TODOs: None
-->
# WordMark Constitution

## Core Principles

### I. 核心定位
- WordMark 必须是“阅读中的词汇标记与记忆工具”，不是完整词典或翻译应用。
- 任何功能必须直接服务于阅读中的标记、回忆或快速查询，否则不纳入范围。

理由：保持产品聚焦与轻量，避免破坏阅读流程。

### II. 隐私原则（默认本地）
- 所有单词、查询次数、最近查询时间只能存于 `chrome.storage.local`。
- 默认不联网、不上传、不做任何埋点或分析。
- 未来同步能力只有在用户明确开启后才允许启用。

理由：建立用户信任并降低隐私与合规风险。

### III. 核心体验约束
- 快捷键触发查询必须快速响应，且不得阻塞页面；重操作必须异步化。
- 释义与发音展示不得遮挡主要阅读内容，并需易于关闭或收起。
- 页面高亮默认低干扰，并提供一键全局关闭。

理由：保障阅读流畅性并减少干扰。

### IV. 性能约束
- 页面高亮必须采用增量处理策略（MutationObserver + 节流）。
- 不得阻塞主线程；不对超大页面做全量扫描。
- 不处理 input、textarea、script、style 等非正文节点。

理由：避免性能回退并确保大型页面可用。

### V. 安全约束
- Content Script 不得注入不可信 HTML，只能使用安全模板或文本节点。
- 必须与页面 JavaScript 运行环境保持隔离，不建立破坏隔离的桥接。
- 遵循最小权限原则，仅申请必要的扩展权限。

理由：降低 XSS 与权限滥用风险。

### VI. 工程规范
- 代码必须使用 TypeScript。
- 模块必须清晰划分为 background / content / popup / options。
- 数据结构必须版本化，并提供可迁移的演进策略。

理由：提升可维护性并满足 Manifest V3 约束。

### VII. 可维护性与测试
- 单词归一化、计数累积、排序、导入导出逻辑必须可独立测试。
- UI 与数据逻辑必须解耦，避免业务逻辑分散在视图层。

理由：保障核心数据行为稳定可验证。

## 补充约束
- 目标平台为 Edge / Chromium Manifest V3，后台运行形态为 service worker。
- 默认离线、无外部依赖；如需联网，必须在规格中说明并满足隐私原则。
- 数据 schema 变更必须记录版本、迁移策略与回滚方案。

## 工作流与质量门禁
- specification、plan 与 implementation 必须显式对照本宪章并记录检查结果。
- 偏离原则必须提供书面理由、影响评估与替代方案，并经维护者批准。
- 发布前必须验证隐私默认关闭联网、性能不阻塞主线程与安全不注入不可信 HTML。

## Governance
- 本宪章高于所有 specification、plan 与 implementation；如冲突，以宪章为准。
- 修订流程：提出变更 → 说明原因与影响 → 给出迁移方案 → 更新模板 → 维护者批准 → 更新版本与日期。
- 版本策略：语义化版本。MAJOR 用于破坏性变更或原则重定义/移除；MINOR 用于新增原则或
  显著扩展指导；PATCH 用于澄清与文字调整。
- 合规审查：每次规格、计划与评审必须验证宪章一致性，偏离项需记录并获批准。

**Version**: 1.0.0 | **Ratified**: 2025-12-21 | **Last Amended**: 2025-12-21
