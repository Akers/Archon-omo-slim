# WebUI 工作流构建器：OpenCode & OMO-Slim 新增特性支持

**日期**：2026-05-19
**状态**：已确认，待实施
**分支**：sync/archon-oo

## 背景

Archon 的后端 workflow engine 已支持丰富的节点配置（agents、effort、thinking、sandbox 等）和多种节点类型（loop、approval、script），OpenCode provider 也已支持 omo-slim 内置 agent 引用。但 WebUI 工作流构建器仅暴露了 command/prompt/bash 三种节点类型和有限的配置选项，大量后端能力无法通过可视化界面使用。

此外，`reactFlowToDagNodes()` 序列化函数存在字段丢失问题（包括已有 UI 的 retry/idle_timeout），导致用户在可视化编辑器中的配置无法正确保存。

## 设计决策

| # | 问题 | 决策 |
|---|------|------|
| 1 | 改动范围 | A-F 全量覆盖 |
| 2 | 新节点类型 UI | 复用现有 tab 结构，条件渲染 |
| 3 | Agents UI | 独立 Agents tab（第5个） |
| 4 | 内置 Agent 引导 | 下拉预设 + 自定义输入 |
| 5 | Claude 高级选项 | Advanced tab 内折叠组 |
| 6 | 工作流级配置 | BuilderToolbar "更多选项"按钮 → dialog |
| 7 | 节点视觉区分 | 按类型使用不同颜色+图标 |
| 8 | 数据通路修复 | 全部一次性修完（含 retry/idle_timeout 已有 bug） |
| 9 | model 格式提示 | placeholder 根据 provider 动态变化 |
| 10 | YAML 视图 | 仅预览模式 |

## 涉及文件

### 核心改动（10 个文件）

| 文件 | 改动内容 |
|------|---------|
| `packages/web/src/components/workflows/NodeInspector.tsx` | 新增 Agents tab；General tab 增加 loop/approval/script 字段；Advanced tab 增加折叠组 |
| `packages/web/src/components/workflows/DagNodeComponent.tsx` | 按节点类型渲染不同颜色 + 图标 |
| `packages/web/src/components/workflows/WorkflowCanvas.tsx` | `reactFlowToDagNodes()` 修复全部字段透传 |
| `packages/web/src/lib/dag-layout.ts` | `dagNodesToReactFlow()` 修复全部字段反序列化 |
| `packages/web/src/components/workflows/NodePalette.tsx` | 增加 loop/approval/script 三种节点入口 |
| `packages/web/src/lib/types.ts` | DagNodeData 扩展新字段 |
| `packages/web/src/components/workflows/BuilderToolbar.tsx` | 增加"更多选项"按钮触发 WorkflowSettingsDialog |
| `packages/web/src/components/workflows/YamlCodeView.tsx` | 确认为仅预览模式 |
| `packages/web/src/stores/workflow-store.ts` | 扩展 DagNodeState 支持新节点类型状态 |
| `NodeInspector Execution tab` 区域 | model placeholder 根据 provider 动态变化 |

### 新建文件（2-3 个）

| 文件 | 用途 |
|------|------|
| `packages/web/src/components/workflows/WorkflowSettingsDialog.tsx` | 工作流级别高级配置 dialog |
| `packages/web/src/components/workflows/AgentEditor.tsx` | Agent 配置编辑子组件（被 Agents tab 使用） |
| `packages/web/src/lib/node-type-constants.ts`（可选） | 节点类型颜色/图标/内置 agent 列表的常量定义 |

## 模块详细设计

### F. 数据通路修复（基础层）

**优先级最高**，其他改动依赖此项。

#### reactFlowToDagNodes()

当前 `aiBase` 对象仅透传 provider/model/context/trigger_rule/output_format/skills/mcp/hooks/allowed_tools/denied_tools。需要新增透传：

```
agents, effort, thinking, sandbox, maxBudgetUsd, systemPrompt,
fallbackModel, betas, retry, idle_timeout
```

以及新节点类型的特有字段：

```
loop: { prompt, max_iterations, exit_condition, fresh_context }
approval: { message, capture_response }
script: { script, runtime, deps, timeout }
```

#### dagNodesToReactFlow()

反序列化时同样需要将上述字段从 DagNode 映射到 DagNodeData。

#### DagNodeData 接口扩展

在 `types.ts` 中扩展 DagNodeData 接口，新增所有遗漏字段的对应类型。类型定义应从 `api.generated.d.ts` 中已有的类型派生，不引入新的手写类型。

### E. 新增节点类型

#### NodePalette 扩展

当前仅支持 command/prompt/bash 三种拖拽节点。新增：

- **loop** — 图标 🔄，标签 "Loop"
- **approval** — 图标 ✋，标签 "Approval"
- **script** — 图标 📜，标签 "Script"

拖拽到画布时创建对应类型的默认节点。

#### General tab 条件渲染

根据 `nodeType` 字段，在 General tab 中动态渲染类型特有的配置字段：

**loop 节点**：
- Prompt 文本框（必填）
- Max Iterations 数字输入（默认 3）
- Exit Condition 文本框（可选，描述退出条件）
- Fresh Context 开关（默认 false）

**approval 节点**：
- Message 文本区（审批提示语，必填）
- Capture Response 开关（默认 false）

**script 节点**：
- Script 代码编辑区（必填）
- Runtime 下拉选择（bun / uv）
- Dependencies 文本框（逗号分隔）
- Timeout 数字输入（毫秒，可选）

非 AI 节点（bash、script）不显示 Execution/Tools/Agents tab。

### A/B/C. Agents Tab

#### Tab 结构

新增第 5 个 tab "Agents"，与 General/Execution/Tools/Advanced 并列。仅对 AI 节点类型（command、prompt、loop）显示。

#### 添加 Agent 交互

顶部"添加 Agent"按钮，点击展示下拉菜单：

**内置 Agent 分组**（9 个，按 omo-slim 内置名称）：
| 名称 | 一行描述 |
|------|---------|
| explorer | 快速代码搜索与模式匹配 |
| librarian | 外部文档与库 API 查询 |
| oracle | 架构决策与代码审查 |
| designer | UI/UX 设计与实现 |
| fixer | 快速实现与代码修改 |
| observer | 截图、PDF、图片分析 |
| council | 多模型共识决策 |
| councillor | 只读分析顾问 |
| orchestrator | 主控编排器 |

**自定义 Agent 入口**：菜单底部"自定义 Agent..."选项。

选择内置 Agent 后：
- key 自动填入（如 `oracle`）
- description/prompt 字段标记为可选（灰色提示"内置 agent 无需配置"）
- 可选覆盖 model、tools 等字段

选择自定义 Agent 后：
- 进入完整配置表单

#### Agent 列表编辑

每个已添加的 agent 显示为一行卡片：

```
┌─────────────────────────────────────────┐
│ 🔵 oracle    架构分析专家         [×]   │
│   展开后: description, prompt, model,   │
│   tools, disallowedTools, skills,       │
│   maxTurns                               │
└─────────────────────────────────────────┘
```

- 卡片标题：key + description（截断）
- 右侧删除按钮
- 点击卡片展开/折叠编辑区
- 内置 agent 的 description/prompt 为可选，自定义 agent 必填

#### 内置 Agent 常量定义

前端硬编码 `BUILTIN_AGENT_NAMES` 及其描述（遵循已有先例：TRIGGER_RULES 在前端硬编码）。位置：`node-type-constants.ts` 或 `types.ts`。

### D. Claude SDK 高级选项

#### Advanced tab 折叠组

在现有 output_format/skills/mcp/hooks 下方，新增两个折叠组：

**SDK Options**（折叠，默认收起）：
- **Effort**：下拉选择（low / medium / high / max）+ "继承工作流默认"选项
- **Thinking**：模式选择（adaptive / enabled / disabled）+ Budget Tokens 数字输入（仅 enabled 模式显示）
- **Sandbox**：开关组（enabled、autoAllowBashIfSandboxed、allowUnsandboxedCommands）+ network 文本输入
- **Betas**：标签式输入（逗号分隔，每项显示为 tag）

**Budget & Fallback**（折叠，默认收起）：
- **Max Budget (USD)**：数字输入
- **Fallback Model**：文本输入
- **System Prompt**：多行文本区

所有字段可选。空值表示继承工作流默认或不设置。

### 工作流级别配置

#### WorkflowSettingsDialog

BuilderToolbar 右侧增加 ⚙️ 按钮，点击弹出 dialog。

Dialog 包含：
- **Effort**（下拉）
- **Thinking**（模式 + budget）
- **Sandbox**（开关组）
- **Fallback Model**（文本）
- **Betas**（标签输入）

这些值作为工作流级默认值，节点级未设置时继承。

表单组件复用节点 Advanced tab 的子组件。

### 节点视觉区分

#### DagNodeComponent 颜色映射

| 节点类型 | Header 背景 | 图标 |
|----------|------------|------|
| command | `bg-blue-500` | ▸ |
| prompt | `bg-green-500` | 💬 |
| bash | `bg-orange-500` | ⌨ |
| loop | `bg-purple-500` | 🔄 |
| approval | `bg-yellow-500` | ✋ |
| script | `bg-cyan-500` | 📜 |

在 DagNodeComponent.tsx 中根据 `data.nodeType` 条件渲染 header 样式。

### Model 格式提示

#### Execution tab provider 联动

当 provider 下拉值变化时，model 输入框的 placeholder 动态变化：

- `claude` → `例如: claude-sonnet-4-20250514`
- `codex` → `例如: gpt-5.3-codex`
- `opencode` → `例如: anthropic/claude-3-5-sonnet`
- 空/继承 → `继承工作流默认`

不自动清空已有值，仅改变 placeholder。

### YAML 视图

YAML 视图保持仅预览模式。用户通过可视化编辑器编辑所有配置，YAML 视图用于预览最终生成的 YAML 内容。

数据通路修复后，YAML 预览将自动包含所有新增字段。

## 约束与风险

1. **类型来源**：`@archon/web` 不能导入 `@archon/workflows` 或 `@archon/providers`。所有类型从 `api.generated.d.ts` 派生。内置 agent 列表等常量在前端硬编码（已有 TRIGGER_RULES 先例）。
2. **NodeInspector 复杂度**：当前 793 行，新增内容可能使文件膨胀。AgentEditor 作为独立子组件抽取，减轻主文件负担。
3. **向后兼容**：改动不影响现有工作流的加载和编辑。旧工作流缺少新字段时使用默认值。
4. **测试覆盖**：dag-layout.ts 的序列化/反序列化修复需要对应更新 `workflow-utils.test.ts` 和 `workflow-metadata.test.ts`。

## 不包含的内容

- 不修改后端 schema 或 API（全部已支持）
- 不修改 OpenCode provider 或 omo-slim 插件代码
- 不新增 API 端点
- 不实现 YAML 视图的双向编辑
- 不处理 agents 在非 AI 节点中的使用（后端已有警告逻辑）
