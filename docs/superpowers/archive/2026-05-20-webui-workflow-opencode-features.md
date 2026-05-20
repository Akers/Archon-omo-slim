# WebUI 工作流 OpenCode/OMO-Slim 特性支持 — 归档

> **日期**: 2026-05-20
> **分支**: `sync/archon-oo`
> **Commits**: 11 (bc8e71e0..78204c4f)
> **状态**: ✅ 全部完成


---

## 概述

为 Archon WebUI 工作流构建器添加 OpenCode Provider 和 oh-my-opencode-slim 的完整可视化配置支持。包括新节点类型、Agent 编辑器、SDK 高级选项、数据通路修复和全字段序列化。

## 前置工作

### Git 合并

Fast-forward 合并 `cropse/Archon` 的 `feature/opencode` 分支（14 commits, 26 files, +3373/-107 lines），新增 OpenCode community provider（`packages/providers/src/community/opencode/`）。

### Builtin Agent 支持

让 OpenCode provider 能识别 oh-my-opencode-slim 的 9 个内置 agent（explorer, librarian, oracle, designer, fixer, observer, council, councillor, orchestrator），跳过文件物化直接引用。

- `agent-config.ts`: 新增 `builtin: boolean` + `BUILTIN_AGENT_NAMES`
- `agent-fs.ts`: 过滤 builtin agent 不物化
- `provider.ts`: 全 builtin 时跳过物化流程

## 设计阶段

### 设计决策（10 项）

 1. 范围：A-F 全量覆盖（OpenCode Provider、内置 Agent、自定义 Agent、Claude 高级选项、缺失节点类型、数据通路修复）
 2. 新节点类型：复用现有 tab 结构，条件渲染
 3. Agents UI：新增第 5 个 "Agents" tab
 4. 内置 Agent 引导：下拉预设 + 自定义输入
 5. Claude 高级选项：Advanced tab 内折叠组
 6. 工作流级配置：BuilderToolbar ⚙️ 按钮 → dialog
 7. 节点视觉区分：按类型不同颜色+图标
 8. 数据通路修复：全部一次性修完
 9. model 格式提示：placeholder 根据 provider 动态变化
10. YAML 视图：仅预览模式

### 文档

- 设计文档: `docs/superpowers/specs/2026-05-19-webui-workflow-opencode-features-design.md`
- 实施计划: `docs/superpowers/plans/2026-05-19-webui-workflow-opencode-features.md`

## 实施阶段（10 个任务）

|任务 |内容 |Commit |
|---|---|---|
|1 |node-type-constants.ts + DagNodeData 扩展 |71acf443 |
|2 |数据通路修复（序列化/反序列化全字段） |573fb979 |
|3 |NodePalette 新增 loop/approval/script 节点 |c9ee8739 |
|4 |NodeInspector General tab 新节点类型字段 |152c1ab4 |
|5 |AgentEditor 子组件 |09208071 |
|6 |Agents Tab + SDK Options + Model placeholder |78af2430 |
|7 |WorkflowSettingsDialog 工作流级配置 |1934b3e3 |
|8 |YamlCodeView 全字段序列化 |97bb106b |
|9 |验证（type-check + lint + 158 tests） |— |
|10 |Build 验证（3.45s 成功） |— |

## 测试阶段（11 个任务）

### 单元测试（92 个）

- `packages/web/src/lib/node-type-constants.test.ts` — 29 个测试
- `packages/web/src/lib/dag-layout.test.ts` — 22 个测试
- `packages/web/src/components/workflows/YamlCodeView.test.ts` — 41 个测试

### E2E 测试（50 个）

- `tests/e2e/workflow-api.spec.ts` — 29 个测试（API 验证/roundtrip/边界条件）
- `tests/e2e/workflow-builder.spec.ts` — 21 个测试（UI 序列化/错误处理/数据通路）

### 基础设施

- `playwright.config.ts` — Playwright 配置
- `tests/README.md` — 测试文档
- `tests/changes/webui-workflow-opencode-features/CHANGE.md` — 变更说明
- `tests/run-all-tests.sh` — 自动化测试脚本
- `eslint.config.mjs` — 添加 playwright/tests 到 ignores

### 测试 Commit

`78204c4f` — 10 files, +2800 lines, 259 tests 全部通过

## 文件变更清单

### 新建文件（6 个）

|文件 |行数 |说明 |
|---|---|---|
|`packages/web/src/lib/node-type-constants.ts` |97 |节点类型配置、内置 Agent 列表、model placeholder |
|`packages/web/src/components/workflows/AgentEditor.tsx` |324 |Agent 编辑器（内置下拉+自定义输入+折叠卡片） |
|`packages/web/src/components/workflows/WorkflowSettingsDialog.tsx` |156 |工作流级设置对话框 |
|`packages/web/src/lib/node-type-constants.test.ts` |~120 |单元测试 |
|`packages/web/src/lib/dag-layout.test.ts` |~100 |单元测试 |
|`packages/web/src/components/workflows/YamlCodeView.test.ts` |~200 |单元测试 |

### 修改文件（5 个）

|文件 |变更 |说明 |
|---|---|---|
|`DagNodeComponent.tsx` |+56/-12 |DagNodeData 扩展 + NODE_TYPE_CONFIG + 元数据 pill |
|`WorkflowCanvas.tsx` |+70/-25 |reactFlowToDagNodes 全字段透传 |
|`dag-layout.ts` |+40/-10 |resolveNodeDisplay 6 种节点 |
|`NodePalette.tsx` |+38/-3 |3 种新节点 |
|`NodeInspector.tsx` |+478/-0 |新节点字段 + Agents tab + Advanced 增强 |
|`BuilderToolbar.tsx` |+12/-0 |⚙️ 按钮 |
|`WorkflowBuilder.tsx` |+26/-4 |状态连接 + buildDefinition 集成 |
|`YamlCodeView.tsx` |+186/-0 |全字段序列化 |

## 验证结果

- ✅ @archon/web type-check: 零错误
- ✅ ESLint: 零错误（新代码）
- ✅ 单元测试: 92 pass
- ✅ E2E 测试: 50 pass
- ✅ 已有测试: 158 pass（未回归）
- ✅ Build: 3.45s 成功
- ⚠️ 预存错误: 3 个 @archon/providers 类型错误（非本次改动）

## 关键数据类型映射

|React Flow (DagNodeData) |DagNode (API) |说明 |
|---|---|---|
|nodeType |command/prompt/bash/loop/approval/script |节点类型 |
|promptText |prompt |AI 提示 |
|bashScript / bashTimeout |bash / timeout |Shell 脚本 |
|loopPromptText |loop.prompt |循环提示 |
|loopMaxIterations |loop.max_iterations |最大迭代 |
|loopExitCondition |loop.until |退出条件 |
|loopFreshContext |loop.fresh_context |新鲜上下文 |
|approvalMessage |approval.message |审批消息 |
|approvalCaptureResponse |approval.capture_response |捕获响应 |
|scriptContent |script.content |脚本内容 |
|scriptRuntime |script.runtime |运行时 (bun/uv) |
|scriptDeps |script.deps |依赖 |
|agents |agents |内联子代理定义 |
|effort |effort |SDK effort 级别 |
|thinking |thinking |SDK thinking 配置 |
|sandbox |sandbox |SDK sandbox 配置 |
|maxBudgetUsd |maxBudgetUsd |最大预算 |
|systemPrompt |systemPrompt |系统 prompt |
|fallbackModel |fallbackModel |回退模型 |
|betas |betas |Beta 特性 |

## 架构约束

- `@archon/web` 不能导入 `@archon/workflows` 或 `@archon/providers`（依赖约束）
- 所有类型从 `api.generated.d.ts`（OpenAPI 生成）派生
- 常量（如 BUILTIN_AGENTS、TRIGGER_RULES）在前端硬编码
- DagNodeData 使用 `[key: string]: unknown` 索引签名扩展 DagNode


