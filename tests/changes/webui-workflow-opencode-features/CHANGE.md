# WebUI 工作流 OpenCode/OMO-Slim 特性支持

## 变更概述

为 Archon WebUI 工作流构建器添加对 OpenCode Provider 和 oh-my-opencode-slim 特性的全面可视化配置支持。

## 变更范围

### 新建文件

1. `packages/web/src/lib/node-type-constants.ts` — 节点类型常量、内置 Agent 列表、Model 格式提示
2. `packages/web/src/components/workflows/AgentEditor.tsx` — Agent 编辑器子组件
3. `packages/web/src/components/workflows/WorkflowSettingsDialog.tsx` — 工作流级设置对话框

### 修改文件

4. `packages/web/src/components/workflows/DagNodeComponent.tsx` — DagNodeData 接口扩展
5. `packages/web/src/components/workflows/WorkflowCanvas.tsx` — 序列化全字段透传
6. `packages/web/src/lib/dag-layout.ts` — 反序列化 6 种节点类型
7. `packages/web/src/components/workflows/NodePalette.tsx` — 新增 loop/approval/script 节点
8. `packages/web/src/components/workflows/NodeInspector.tsx` — 新节点字段 + Agents Tab + Advanced 增强
9. `packages/web/src/components/workflows/BuilderToolbar.tsx` — ⚙️ 设置按钮
10. `packages/web/src/components/workflows/WorkflowBuilder.tsx` — 状态连接 + buildDefinition 集成
11. `packages/web/src/components/workflows/YamlCodeView.tsx` — 全字段 YAML 序列化

## 功能清单

### F1: 新节点类型支持

- Loop 节点：prompt/max_iterations/until/fresh_context/gate_message/until_bash/interactive
- Approval 节点：message/capture_response/on_reject
- Script 节点：content/runtime/deps/timeout

### F2: Agent 编辑器

- 内置 Agent 下拉添加（9 个 oh-my-opencode-slim agent）
- 自定义 Agent 添加（kebab-case 命名）
- Agent 配置编辑（description/prompt/model/tools/disallowedTools/skills/maxTurns）
- Agent 删除

### F3: SDK 高级选项

- Effort 选择（low/medium/high/max）
- Thinking 配置（adaptive/enabled/disabled + budgetTokens）
- Sandbox 配置（enabled）
- Betas 配置（逗号分隔字符串）
- Max Budget USD
- Fallback Model
- System Prompt Override

### F4: 工作流级配置

- WorkflowSettingsDialog（effort/thinking/sandbox/betas/fallbackModel）
- BuilderToolbar ⚙️ 按钮
- WorkflowBuilder 状态管理

### F5: 数据通路修复

- reactFlowToDagNodes 全字段透传
- dagNodesToReactFlow resolveNodeDisplay 6 种节点
- buildDefinition 合并 workflowSettings

### F6: YAML 全字段序列化

- loop/approval/script 节点序列化
- agents 序列化
- effort/thinking/sandbox/betas 等高级字段序列化
- 工作流级字段序列化

### F7: UI 增强

- 节点视觉区分（6 种颜色+图标）
- agents/effort 元数据 pill
- 动态 Model placeholder（基于 provider）
