# WebUI 工作流 OpenCode/OMO-Slim 新增特性 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 WebUI 工作流构建器支持所有后端已有但前端未暴露的节点配置（agents、effort、thinking、sandbox、loop/approval/script 节点类型等）和数据通路修复。

**Architecture:** 前端类型从 `api.generated.d.ts` 派生，常量前端硬编码（如 BUILTIN_AGENT_NAMES、TRIGGER_RULES 先例）。改动全部在 `@archon/web` 包内，不涉及后端。按层次推进：数据通路修复 → 新节点类型 → Agents UI → 高级选项 → 工作流级配置。

**Tech Stack:** React + TypeScript + React Flow + dagre + Zustand + shadcn/ui + Tailwind v4

---

## File Structure

### 修改文件
| 文件 | 责任 |
|------|------|
| `packages/web/src/components/workflows/DagNodeComponent.tsx` | DagNodeData 接口扩展 + 节点颜色/图标映射 |
| `packages/web/src/components/workflows/WorkflowCanvas.tsx` | `reactFlowToDagNodes()` 全字段透传 |
| `packages/web/src/lib/dag-layout.ts` | `dagNodesToReactFlow()` 全字段反序列化 + `resolveNodeDisplay()` 扩展 |
| `packages/web/src/components/workflows/NodeInspector.tsx` | 新增 Agents tab + General tab 扩展 + Advanced tab 折叠组 |
| `packages/web/src/components/workflows/NodePalette.tsx` | 新增 loop/approval/script 节点入口 |
| `packages/web/src/components/workflows/YamlCodeView.tsx` | `serializeDagNode()` 全字段序列化 |
| `packages/web/src/components/workflows/BuilderToolbar.tsx` | 新增 "更多选项" 按钮 |
| `packages/web/src/components/workflows/WorkflowBuilder.tsx` | buildDefinition 透传工作流级配置 |

### 新建文件
| 文件 | 责任 |
|------|------|
| `packages/web/src/lib/node-type-constants.ts` | 节点类型颜色/图标/内置 agent 列表常量 |
| `packages/web/src/components/workflows/AgentEditor.tsx` | Agent 配置编辑子组件（被 Agents tab 使用） |
| `packages/web/src/components/workflows/WorkflowSettingsDialog.tsx` | 工作流级别高级配置 dialog |

---

## Task 1: 数据通路修复 — DagNodeData 扩展 + 常量文件

**Files:**
- Create: `packages/web/src/lib/node-type-constants.ts`
- Modify: `packages/web/src/components/workflows/DagNodeComponent.tsx`

- [ ] **Step 1: 创建 node-type-constants.ts**

定义节点类型配置常量和内置 agent 列表。这个文件被多个组件引用。

```typescript
// packages/web/src/lib/node-type-constants.ts

/**
 * Frontend constants for workflow node types and agent presets.
 * Hard-coded here because @archon/web cannot import from @archon/workflows
 * (dependency constraint). Follows the same pattern as TRIGGER_RULES in NodeInspector.
 */

// --- Node type definitions ---

export type NodeCategory = 'command' | 'prompt' | 'bash' | 'loop' | 'approval' | 'script';

export interface NodeTypeConfig {
  badge: string;
  stripeColor: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
}

export const NODE_TYPE_CONFIG: Record<NodeCategory, NodeTypeConfig> = {
  command: {
    badge: 'CMD',
    stripeColor: 'bg-blue-500',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-500',
    icon: '▸',
  },
  prompt: {
    badge: 'PROMPT',
    stripeColor: 'bg-green-500',
    badgeBg: 'bg-green-500/20',
    badgeText: 'text-green-500',
    icon: '💬',
  },
  bash: {
    badge: 'BASH',
    stripeColor: 'bg-orange-500',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-500',
    icon: '⌨',
  },
  loop: {
    badge: 'LOOP',
    stripeColor: 'bg-purple-500',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-500',
    icon: '🔄',
  },
  approval: {
    badge: 'APPROVAL',
    stripeColor: 'bg-yellow-500',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-500',
    icon: '✋',
  },
  script: {
    badge: 'SCRIPT',
    stripeColor: 'bg-cyan-500',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-500',
    icon: '📜',
  },
} as const;

/** AI node types show Execution/Tools/Agents/Advanced tabs. */
export const AI_NODE_TYPES: readonly NodeCategory[] = ['command', 'prompt', 'loop'] as const;

/** Non-AI node types: no provider/model/tools/agents fields. */
export const NON_AI_NODE_TYPES: readonly NodeCategory[] = ['bash', 'script'] as const;

export function isAiNode(nodeType: NodeCategory): boolean {
  return (AI_NODE_TYPES as readonly string[]).includes(nodeType);
}

// --- Built-in oh-my-opencode-slim agents ---

export interface BuiltinAgentInfo {
  name: string;
  description: string;
}

export const BUILTIN_AGENTS: readonly BuiltinAgentInfo[] = [
  { name: 'explorer', description: '快速代码搜索与模式匹配' },
  { name: 'librarian', description: '外部文档与库 API 查询' },
  { name: 'oracle', description: '架构决策与代码审查' },
  { name: 'designer', description: 'UI/UX 设计与实现' },
  { name: 'fixer', description: '快速实现与代码修改' },
  { name: 'observer', description: '截图、PDF、图片分析' },
  { name: 'council', description: '多模型共识决策' },
  { name: 'councillor', description: '只读分析顾问' },
  { name: 'orchestrator', description: '主控编排器' },
] as const;

export const BUILTIN_AGENT_NAMES: ReadonlySet<string> = new Set(
  BUILTIN_AGENTS.map(a => a.name),
);

// --- Model format hints per provider ---

export const MODEL_PLACEHOLDERS: Record<string, string> = {
  claude: '例如: claude-sonnet-4-20250514',
  codex: '例如: gpt-5.3-codex',
  opencode: '例如: anthropic/claude-3-5-sonnet',
  pi: '例如: anthropic/claude-haiku-4-5',
};

export const DEFAULT_MODEL_PLACEHOLDER = '继承工作流默认';
```

- [ ] **Step 2: 扩展 DagNodeData 接口**

修改 `packages/web/src/components/workflows/DagNodeComponent.tsx`：

更新 `DagNodeData` 接口，扩展 `nodeType` 联合类型并添加新节点类型的特有字段：

```typescript
// 替换第 7-16 行的 DagNodeData 接口
export interface DagNodeData extends DagNode {
  /** For command nodes: the command name. For prompt nodes: display label ("Prompt"). For bash: display label ("Shell"). */
  label: string;
  nodeType: 'command' | 'prompt' | 'bash' | 'loop' | 'approval' | 'script';
  promptText?: string;
  bashScript?: string;
  bashTimeout?: number;
  // Loop node fields
  loopPromptText?: string;
  loopMaxIterations?: number;
  loopExitCondition?: string;
  loopFreshContext?: boolean;
  // Approval node fields
  approvalMessage?: string;
  approvalCaptureResponse?: boolean;
  // Script node fields
  scriptContent?: string;
  scriptRuntime?: 'bun' | 'uv';
  scriptDeps?: string;
  scriptTimeout?: number;
  /** Required by React Flow's Node<T> constraint — do not rely on this for typed access. */
  [key: string]: unknown;
}
```

更新 `TYPE_CONFIG` 使用常量文件（替换第 20-39 行）：

```typescript
import { NODE_TYPE_CONFIG, type NodeCategory } from '@/lib/node-type-constants';
```

删除旧的 `TYPE_CONFIG` 常量（第 20-39 行），后续代码改用 `NODE_TYPE_CONFIG`。

- [ ] **Step 3: 更新 DagNodeRender 组件使用新的 NODE_TYPE_CONFIG**

替换第 60-121 行 `DagNodeRender` 中的类型配置引用。将 `TYPE_CONFIG` 替换为 `NODE_TYPE_CONFIG`：

```typescript
function DagNodeRender({ data, selected }: NodeProps<DagFlowNode>): React.ReactElement {
  const config = NODE_TYPE_CONFIG[data.nodeType as NodeCategory] ?? NODE_TYPE_CONFIG.prompt;
  const preview = getContentPreview(data);
  const hasPills =
    data.model ||
    data.output_format ||
    data.when ||
    (data.trigger_rule && data.trigger_rule !== 'all_success') ||
    (data.skills && data.skills.length > 0) ||
    data.mcp ||
    data.agents && Object.keys(data.agents).length > 0 ||
    data.effort;

  return (
    <div
      className={cn(
        'w-[180px] bg-surface border border-border rounded-lg overflow-hidden cursor-pointer transition-all flex',
        selected && 'border-primary ring-1 ring-primary'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Left color stripe */}
      <div className={cn('w-[3px] shrink-0', config.stripeColor)} />

      {/* Content area */}
      <div className="flex-1 min-w-0 px-2.5 py-2">
        {/* Header: badge + label */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className={cn(
              'text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0',
              config.badgeBg,
              config.badgeText
            )}
          >
            {config.badge}
          </span>
          <span className="text-xs font-medium text-text-primary truncate">{data.label}</span>
        </div>

        {/* Content preview */}
        {preview && (
          <div className="text-[10px] font-mono text-text-tertiary truncate mb-1">{preview}</div>
        )}

        {/* Metadata pills */}
        {hasPills && (
          <div className="flex flex-wrap gap-1">
            {data.model && <MetadataPill>{data.model}</MetadataPill>}
            {data.output_format && <MetadataPill>{'{}'} JSON</MetadataPill>}
            {data.when && <MetadataPill>when</MetadataPill>}
            {data.trigger_rule && data.trigger_rule !== 'all_success' && (
              <MetadataPill>{data.trigger_rule}</MetadataPill>
            )}
            {data.skills && data.skills.length > 0 && <MetadataPill>skills</MetadataPill>}
            {data.mcp && <MetadataPill>mcp</MetadataPill>}
            {data.agents && Object.keys(data.agents).length > 0 && (
              <MetadataPill>{Object.keys(data.agents).length} agent{Object.keys(data.agents).length > 1 ? 's' : ''}</MetadataPill>
            )}
            {data.effort && <MetadataPill>{data.effort}</MetadataPill>}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}
```

更新 `getContentPreview` 函数支持新节点类型：

```typescript
function getContentPreview(data: DagNodeData): string {
  switch (data.nodeType) {
    case 'command':
      return data.label;
    case 'prompt':
      return data.promptText?.split('\n')[0] ?? '';
    case 'bash':
      return data.bashScript?.split('\n')[0] ?? '';
    case 'loop':
      return data.loopPromptText?.split('\n')[0] ?? 'Loop';
    case 'approval':
      return data.approvalMessage?.split('\n')[0] ?? 'Approval gate';
    case 'script':
      return data.scriptContent?.split('\n')[0] ?? 'Script';
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/node-type-constants.ts packages/web/src/components/workflows/DagNodeComponent.tsx
git commit -m "feat(web): add node-type-constants and extend DagNodeData interface for new node types"
```

---

## Task 2: 数据通路修复 — reactFlowToDagNodes + dagNodesToReactFlow

**Files:**
- Modify: `packages/web/src/components/workflows/WorkflowCanvas.tsx:31-75`
- Modify: `packages/web/src/lib/dag-layout.ts:46-99`

- [ ] **Step 1: 修复 reactFlowToDagNodes() 全字段透传**

替换 `packages/web/src/components/workflows/WorkflowCanvas.tsx` 第 25-75 行：

```typescript
function resolveNodeLabel(nodeType: 'command' | 'prompt' | 'bash' | 'loop' | 'approval' | 'script', commandName: string): string {
  if (nodeType === 'command') return commandName;
  if (nodeType === 'bash') return 'Shell';
  if (nodeType === 'loop') return 'Loop';
  if (nodeType === 'approval') return 'Approval';
  if (nodeType === 'script') return 'Script';
  return 'Prompt';
}

export function reactFlowToDagNodes(rfNodes: DagFlowNode[], rfEdges: Edge[]): DagNode[] {
  return rfNodes.map(node => {
    const deps = rfEdges.filter(e => e.target === node.id).map(e => e.source);

    const dagBase = {
      id: node.id,
      depends_on: deps.length > 0 ? deps : undefined,
      when: node.data.when || undefined,
      trigger_rule: node.data.trigger_rule || undefined,
    };

    if (node.data.nodeType === 'bash') {
      return {
        ...dagBase,
        bash: node.data.bashScript ?? '',
        ...(node.data.bashTimeout ? { timeout: node.data.bashTimeout } : {}),
      } as DagNode;
    }

    if (node.data.nodeType === 'script') {
      return {
        ...dagBase,
        script: node.data.scriptContent ?? '',
        runtime: node.data.scriptRuntime ?? 'bun',
        ...(node.data.scriptDeps ? { deps: node.data.scriptDeps.split(',').map(s => s.trim()).filter(Boolean) } : {}),
        ...(node.data.scriptTimeout ? { timeout: node.data.scriptTimeout } : {}),
      } as DagNode;
    }

    if (node.data.nodeType === 'loop') {
      return {
        ...dagBase,
        loop: {
          prompt: node.data.loopPromptText ?? '',
          max_iterations: node.data.loopMaxIterations ?? 3,
          ...(node.data.loopExitCondition ? { exit_condition: node.data.loopExitCondition } : {}),
          ...(node.data.loopFreshContext !== undefined ? { fresh_context: node.data.loopFreshContext } : {}),
        },
      } as DagNode;
    }

    if (node.data.nodeType === 'approval') {
      return {
        ...dagBase,
        approval: {
          message: node.data.approvalMessage ?? '',
          ...(node.data.approvalCaptureResponse !== undefined ? { capture_response: node.data.approvalCaptureResponse } : {}),
        },
      } as DagNode;
    }

    // AI node fields (command, prompt)
    const aiBase = {
      ...dagBase,
      model: node.data.model || undefined,
      provider: node.data.provider || undefined,
      context: node.data.context || undefined,
      output_format: node.data.output_format ?? undefined,
      allowed_tools: node.data.allowed_tools ?? undefined,
      denied_tools: node.data.denied_tools ?? undefined,
      hooks: node.data.hooks ?? undefined,
      mcp: node.data.mcp ?? undefined,
      skills: node.data.skills ?? undefined,
      // Previously missing fields
      agents: node.data.agents ?? undefined,
      effort: node.data.effort ?? undefined,
      thinking: node.data.thinking ?? undefined,
      sandbox: node.data.sandbox ?? undefined,
      maxBudgetUsd: node.data.maxBudgetUsd ?? undefined,
      systemPrompt: node.data.systemPrompt ?? undefined,
      fallbackModel: node.data.fallbackModel ?? undefined,
      betas: node.data.betas ?? undefined,
      retry: node.data.retry ?? undefined,
      idle_timeout: node.data.idle_timeout ?? undefined,
    };

    if (node.data.nodeType === 'command') {
      return { ...aiBase, command: node.data.label } as DagNode;
    }
    const promptText = node.data.promptText;
    return {
      ...aiBase,
      prompt: typeof promptText === 'string' ? promptText : '',
    } as DagNode;
  });
}
```

- [ ] **Step 2: 修复 dagNodesToReactFlow() 全字段反序列化**

替换 `packages/web/src/lib/dag-layout.ts` 第 46-99 行：

```typescript
export function resolveNodeDisplay(dn: DagNode): {
  label: string;
  nodeType: 'command' | 'prompt' | 'bash' | 'loop' | 'approval' | 'script';
  promptText?: string;
  bashScript?: string;
  bashTimeout?: number;
  loopPromptText?: string;
  loopMaxIterations?: number;
  loopExitCondition?: string;
  loopFreshContext?: boolean;
  approvalMessage?: string;
  approvalCaptureResponse?: boolean;
  scriptContent?: string;
  scriptRuntime?: 'bun' | 'uv';
  scriptDeps?: string;
  scriptTimeout?: number;
} {
  if ('bash' in dn && dn.bash) {
    return {
      label: 'Shell',
      nodeType: 'bash',
      bashScript: dn.bash,
      bashTimeout: dn.timeout,
    };
  }
  if ('script' in dn && dn.script) {
    return {
      label: 'Script',
      nodeType: 'script',
      scriptContent: dn.script,
      scriptRuntime: dn.runtime,
      scriptDeps: dn.deps?.join(', '),
      scriptTimeout: dn.timeout,
    };
  }
  if ('loop' in dn && dn.loop) {
    return {
      label: 'Loop',
      nodeType: 'loop',
      loopPromptText: dn.loop.prompt,
      loopMaxIterations: dn.loop.max_iterations,
      loopExitCondition: dn.loop.exit_condition,
      loopFreshContext: dn.loop.fresh_context,
    };
  }
  if ('approval' in dn && dn.approval) {
    return {
      label: 'Approval',
      nodeType: 'approval',
      approvalMessage: dn.approval.message,
      approvalCaptureResponse: dn.approval.capture_response,
    };
  }
  if ('command' in dn && dn.command) {
    return { label: dn.command, nodeType: 'command' };
  }
  return {
    label: 'Prompt',
    nodeType: 'prompt',
    promptText: dn.prompt,
  };
}

export function dagNodesToReactFlow(dagNodes: readonly DagNode[]): {
  nodes: DagFlowNode[];
  edges: Edge[];
} {
  const nodes: DagFlowNode[] = dagNodes.map((dn, i) => ({
    id: dn.id,
    type: 'dagNode',
    position: { x: 0, y: i * 100 },
    data: {
      ...dn,
      ...resolveNodeDisplay(dn),
    },
  }));

  const edges: Edge[] = [];
  for (const dn of dagNodes) {
    for (const dep of dn.depends_on ?? []) {
      edges.push({
        id: `${dep}->${dn.id}`,
        source: dep,
        target: dn.id,
        type: 'smoothstep',
      });
    }
  }

  const { nodes: layouted, edges: layoutedEdges } = layoutWithDagre(nodes, edges);
  return { nodes: layouted, edges: layoutedEdges };
}
```

- [ ] **Step 3: 更新 WorkflowCanvas 中 create node 的类型签名**

在 `WorkflowCanvas.tsx` 的 `onDrop` 和 `handleQuickAddNode` 函数中，将 `nodeType` 类型和 `resolveNodeLabel` 调用更新为支持新类型：

```typescript
const nodeType = type as 'command' | 'prompt' | 'bash' | 'loop' | 'approval' | 'script';
```

同样更新 `handleQuickAddNode` 的 `type` 参数类型。

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/workflows/WorkflowCanvas.tsx packages/web/src/lib/dag-layout.ts
git commit -m "fix(web): repair data pipeline — full field roundtrip in reactFlowToDagNodes and dagNodesToReactFlow"
```

---

## Task 3: NodePalette 扩展 — 新增 loop/approval/script 节点

**Files:**
- Modify: `packages/web/src/components/workflows/NodePalette.tsx`
- Modify: `packages/web/src/components/workflows/WorkflowCanvas.tsx` (QuickAddPicker 类型更新)

- [ ] **Step 1: 在 NodePalette.tsx 中添加新节点类型**

在现有 bash 节点（第 53-63 行之后）和 commands 列表之前，添加三种新节点类型：

```tsx
{/* Loop node */}
<div
  draggable
  onDragStart={(e): void => {
    onDragStart(e, 'loop', 'Loop');
  }}
  className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-dashed border-border hover:border-purple-500 hover:bg-purple-500/5 cursor-grab text-xs text-text-primary mb-1"
>
  <span className="text-[10px] text-purple-500 font-medium">LOOP</span>
  <span>Iterative AI loop</span>
</div>

{/* Approval node */}
<div
  draggable
  onDragStart={(e): void => {
    onDragStart(e, 'approval', 'Approval');
  }}
  className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-dashed border-border hover:border-yellow-500 hover:bg-yellow-500/5 cursor-grab text-xs text-text-primary mb-1"
>
  <span className="text-[10px] text-yellow-500 font-medium">APPROVAL</span>
  <span>Human approval gate</span>
</div>

{/* Script node */}
<div
  draggable
  onDragStart={(e): void => {
    onDragStart(e, 'script', 'Script');
  }}
  className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-dashed border-border hover:border-cyan-500 hover:bg-cyan-500/5 cursor-grab text-xs text-text-primary mb-2"
>
  <span className="text-[10px] text-cyan-500 font-medium">SCRIPT</span>
  <span>TypeScript / Python script</span>
</div>
```

- [ ] **Step 2: 更新 onDragStart 类型签名**

将 NodePalette 中 `onDragStart` 的 `type` 参数从 `'command' | 'prompt' | 'bash'` 扩展为 `'command' | 'prompt' | 'bash' | 'loop' | 'approval' | 'script'`。

- [ ] **Step 3: 更新 WorkflowCanvas 中 QuickAddPicker 的类型**

在 `WorkflowCanvas.tsx` 中，确保 `handleQuickAddNode` 的 `type` 参数接受新类型。

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/workflows/NodePalette.tsx packages/web/src/components/workflows/WorkflowCanvas.tsx
git commit -m "feat(web): add loop, approval, script nodes to NodePalette"
```

---

## Task 4: NodeInspector — General tab 扩展新节点类型字段

**Files:**
- Modify: `packages/web/src/components/workflows/NodeInspector.tsx:187-335`

- [ ] **Step 1: 更新 GeneralTab 的类型选择器和条件渲染**

在 `GeneralTab` 函数中（第 187 行开始），替换 Type selector `<select>` 的 `<option>` 列表（第 242-246 行）：

```tsx
<select
  value={node.nodeType}
  onChange={(e): void => {
    const newType = e.target.value as DagNodeData['nodeType'];
    const updates: Partial<DagNodeData> = { nodeType: newType };
    // Reset all type-specific fields
    updates.promptText = undefined;
    updates.bashScript = undefined;
    updates.bashTimeout = undefined;
    updates.loopPromptText = undefined;
    updates.loopMaxIterations = undefined;
    updates.loopExitCondition = undefined;
    updates.loopFreshContext = undefined;
    updates.approvalMessage = undefined;
    updates.approvalCaptureResponse = undefined;
    updates.scriptContent = undefined;
    updates.scriptRuntime = undefined;
    updates.scriptDeps = undefined;
    updates.scriptTimeout = undefined;
    updates.agents = undefined;
    updates.effort = undefined;
    updates.thinking = undefined;
    updates.sandbox = undefined;
    updates.maxBudgetUsd = undefined;
    updates.systemPrompt = undefined;
    updates.fallbackModel = undefined;
    updates.betas = undefined;
    updates.allowed_tools = undefined;
    updates.denied_tools = undefined;
    updates.output_format = undefined;
    updates.hooks = undefined;
    updates.mcp = undefined;
    updates.skills = undefined;

    if (newType === 'command') {
      updates.label = '';
    } else if (newType === 'prompt') {
      updates.label = 'Prompt';
    } else if (newType === 'bash') {
      updates.label = 'Shell';
    } else if (newType === 'loop') {
      updates.label = 'Loop';
    } else if (newType === 'approval') {
      updates.label = 'Approval';
    } else if (newType === 'script') {
      updates.label = 'Script';
    }
    onUpdate(updates);
  }}
  className={selectClass}
>
  <option value="command">Command</option>
  <option value="prompt">Prompt</option>
  <option value="bash">Bash</option>
  <option value="loop">Loop</option>
  <option value="approval">Approval</option>
  <option value="script">Script</option>
</select>
```

- [ ] **Step 2: 在 GeneralTab 的类型特有内容区域（第 249-309 行之后）添加新节点类型的字段**

在现有 bash 节点字段之后，dependencies 字段之前添加：

```tsx
{node.nodeType === 'loop' && (
  <>
    <Field label="Loop Prompt">
      <textarea
        value={node.loopPromptText ?? ''}
        onChange={(e): void => {
          onUpdate({ loopPromptText: e.target.value });
        }}
        rows={4}
        placeholder="Enter the prompt to iterate on..."
        className={cn(textareaClass, 'min-h-[100px]')}
      />
    </Field>
    <Field label="Max Iterations">
      <input
        type="number"
        min={1}
        max={50}
        value={node.loopMaxIterations ?? 3}
        onChange={(e): void => {
          onUpdate({ loopMaxIterations: Number(e.target.value) || 3 });
        }}
        placeholder="3"
        className={inputClass}
      />
    </Field>
    <Field label="Exit Condition">
      <input
        type="text"
        value={node.loopExitCondition ?? ''}
        onChange={(e): void => {
          onUpdate({ loopExitCondition: e.target.value || undefined });
        }}
        placeholder="Optional: describe when to stop iterating"
        className={inputClass}
      />
    </Field>
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={`fresh-context-${node.id}`}
        checked={node.loopFreshContext ?? false}
        onChange={(e): void => {
          onUpdate({ loopFreshContext: e.target.checked });
        }}
        className="rounded border-border"
      />
      <label htmlFor={`fresh-context-${node.id}`} className="text-xs text-text-primary">
        Fresh Context (reset each iteration)
      </label>
    </div>
  </>
)}

{node.nodeType === 'approval' && (
  <>
    <Field label="Approval Message">
      <textarea
        value={node.approvalMessage ?? ''}
        onChange={(e): void => {
          onUpdate({ approvalMessage: e.target.value });
        }}
        rows={3}
        placeholder="Describe what needs approval..."
        className={cn(textareaClass, 'min-h-[80px]')}
      />
    </Field>
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={`capture-response-${node.id}`}
        checked={node.approvalCaptureResponse ?? false}
        onChange={(e): void => {
          onUpdate({ approvalCaptureResponse: e.target.checked });
        }}
        className="rounded border-border"
      />
      <label htmlFor={`capture-response-${node.id}`} className="text-xs text-text-primary">
        Capture Response (store approver's comment)
      </label>
    </div>
  </>
)}

{node.nodeType === 'script' && (
  <>
    <Field label="Script Content">
      <textarea
        value={node.scriptContent ?? ''}
        onChange={(e): void => {
          onUpdate({ scriptContent: e.target.value });
        }}
        rows={5}
        placeholder="console.log('hello world')"
        className={cn(textareaClass, 'min-h-[120px]')}
      />
    </Field>
    <Field label="Runtime">
      <select
        value={node.scriptRuntime ?? 'bun'}
        onChange={(e): void => {
          onUpdate({ scriptRuntime: e.target.value as 'bun' | 'uv' });
        }}
        className={selectClass}
      >
        <option value="bun">Bun (TypeScript)</option>
        <option value="uv">uv (Python)</option>
      </select>
    </Field>
    <Field label="Dependencies (comma-separated)">
      <input
        type="text"
        value={node.scriptDeps ?? ''}
        onChange={(e): void => {
          onUpdate({ scriptDeps: e.target.value || undefined });
        }}
        placeholder="lodash, axios"
        className={inputClass}
      />
    </Field>
    <Field label="Timeout (ms)">
      <input
        type="number"
        value={node.scriptTimeout ?? ''}
        onChange={(e): void => {
          const v = e.target.value;
          onUpdate({ scriptTimeout: v ? Number(v) : undefined });
        }}
        placeholder="30000"
        className={inputClass}
      />
    </Field>
  </>
)}
```

- [ ] **Step 3: 更新 DagInspector 中 tab 可见性逻辑**

在第 708 行的 `DagInspector` 函数中，更新 `isBash` 为使用 `isAiNode` 工具函数：

```typescript
import { isAiNode, type NodeCategory } from '@/lib/node-type-constants';

// 在 DagInspector 中替换：
const isBash = node.nodeType === 'bash';
// 为：
const isAi = isAiNode(node.nodeType as NodeCategory);
```

然后更新所有 `{!isBash && (` 条件为 `{isAi && (`。

- [ ] **Step 4: 更新 ExecutionTab 的 isBash 逻辑**

在 `ExecutionTab` 函数（第 337 行）中，将 `const isBash = node.nodeType === 'bash';` 替换为：

```typescript
const isAi = isAiNode(node.nodeType as NodeCategory);
```

更新所有 `{!isBash && (` 条件为 `{isAi && (`。

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/workflows/NodeInspector.tsx
git commit -m "feat(web): extend NodeInspector GeneralTab with loop/approval/script fields"
```

---

## Task 5: AgentEditor 子组件

**Files:**
- Create: `packages/web/src/components/workflows/AgentEditor.tsx`

- [ ] **Step 1: 创建 AgentEditor 组件**

```tsx
// packages/web/src/components/workflows/AgentEditor.tsx
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BUILTIN_AGENTS,
  BUILTIN_AGENT_NAMES,
  type BuiltinAgentInfo,
} from '@/lib/node-type-constants';

interface AgentConfig {
  description: string;
  prompt: string;
  model?: string;
  tools?: string[];
  disallowedTools?: string[];
  skills?: string[];
  maxTurns?: number;
}

export interface AgentEntry {
  key: string;
  config: AgentConfig;
}

interface AgentEditorProps {
  agents: Record<string, AgentConfig> | undefined;
  onUpdate: (agents: Record<string, AgentConfig> | undefined) => void;
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent';

const selectClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent';

const labelClass = 'text-[10px] text-text-tertiary uppercase tracking-wide';

const textareaClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent resize-y';

function AgentCard({
  agentKey,
  config,
  isBuiltin,
  onConfigUpdate,
  onRemove,
}: {
  agentKey: string;
  config: AgentConfig;
  isBuiltin: boolean;
  onConfigUpdate: (updated: AgentConfig) => void;
  onRemove: () => void;
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-inset cursor-pointer hover:bg-surface-elevated"
        onClick={(): void => setExpanded(!expanded)}
      >
        <span className={cn(
          'text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0',
          isBuiltin ? 'bg-accent/20 text-accent' : 'bg-surface-elevated text-text-secondary',
        )}>
          {isBuiltin ? 'BUILTIN' : 'CUSTOM'}
        </span>
        <span className="text-xs font-medium text-text-primary font-mono">{agentKey}</span>
        <span className="flex-1 text-[10px] text-text-tertiary truncate">
          {config.description || (isBuiltin ? '内置 agent' : '未配置描述')}
        </span>
        <button
          type="button"
          onClick={(e): void => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 text-text-tertiary hover:text-error text-xs px-1"
          aria-label={`Remove agent ${agentKey}`}
        >
          ×
        </button>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="flex flex-col gap-2 p-2.5 border-t border-border">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Description</label>
            <input
              type="text"
              value={config.description}
              onChange={(e): void => onConfigUpdate({ ...config, description: e.target.value })}
              placeholder={isBuiltin ? '可选：覆盖内置 agent 描述' : 'Agent 描述（必填）'}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Prompt</label>
            <textarea
              value={config.prompt}
              onChange={(e): void => onConfigUpdate({ ...config, prompt: e.target.value })}
              rows={3}
              placeholder={isBuiltin ? '可选：覆盖内置 agent 提示词' : 'Agent 系统提示词（必填）'}
              className={cn(textareaClass, 'min-h-[60px]')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Model (optional)</label>
            <input
              type="text"
              value={config.model ?? ''}
              onChange={(e): void => onConfigUpdate({ ...config, model: e.target.value || undefined })}
              placeholder="例如: anthropic/claude-3-5-sonnet"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Tools (comma-separated)</label>
            <input
              type="text"
              value={config.tools?.join(', ') ?? ''}
              onChange={(e): void => {
                const val = e.target.value.trim();
                onConfigUpdate({
                  ...config,
                  tools: val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                });
              }}
              placeholder="tool1, tool2..."
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Max Turns (optional)</label>
            <input
              type="number"
              min={1}
              value={config.maxTurns ?? ''}
              onChange={(e): void => {
                const v = e.target.value;
                onConfigUpdate({ ...config, maxTurns: v ? Number(v) : undefined });
              }}
              placeholder="Inherit"
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AgentEditor({ agents, onUpdate }: AgentEditorProps): React.ReactElement {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);

  const agentEntries = Object.entries(agents ?? {});

  const handleAddBuiltin = (agent: BuiltinAgentInfo): void => {
    const existing = agents ?? {};
    onUpdate({
      ...existing,
      [agent.name]: {
        description: agent.description,
        prompt: '', // builtin agents don't need prompt
      },
    });
    setShowAddMenu(false);
  };

  const handleAddCustom = (): void => {
    const key = customKeyInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!key || agents?.[key]) return;
    const existing = agents ?? {};
    onUpdate({
      ...existing,
      [key]: { description: '', prompt: '' },
    });
    setCustomKeyInput('');
    setAddingCustom(false);
    setShowAddMenu(false);
  };

  const handleRemoveAgent = (key: string): void => {
    const existing = agents ?? {};
    const updated = { ...existing };
    delete updated[key];
    onUpdate(Object.keys(updated).length > 0 ? updated : undefined);
  };

  const handleUpdateAgent = (key: string, config: AgentConfig): void => {
    const existing = agents ?? {};
    onUpdate({ ...existing, [key]: config });
  };

  // Filter out already-added builtins
  const availableBuiltins = BUILTIN_AGENTS.filter(a => !agents?.[a.name]);

  return (
    <div className="flex flex-col gap-2">
      {/* Add agent button + dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={(): void => setShowAddMenu(!showAddMenu)}
          className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
        >
          + Add Agent
        </button>

        {showAddMenu && (
          <div className="absolute z-10 left-0 right-0 mt-1 rounded-md border border-border bg-surface-elevated shadow-lg max-h-64 overflow-auto">
            {/* Builtin agents */}
            {availableBuiltins.length > 0 && (
              <>
                <div className="px-2 py-1 text-[9px] text-text-tertiary uppercase tracking-wide border-b border-border">
                  Built-in Agents (oh-my-opencode-slim)
                </div>
                {availableBuiltins.map(agent => (
                  <button
                    key={agent.name}
                    type="button"
                    onClick={(): void => handleAddBuiltin(agent)}
                    className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-surface flex items-center gap-2"
                  >
                    <span className="font-mono text-accent shrink-0">{agent.name}</span>
                    <span className="text-text-tertiary truncate">{agent.description}</span>
                  </button>
                ))}
              </>
            )}

            {/* Custom agent entry */}
            <div className="border-t border-border">
              {addingCustom ? (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <input
                    type="text"
                    value={customKeyInput}
                    onChange={(e): void => setCustomKeyInput(e.target.value)}
                    onKeyDown={(e): void => {
                      if (e.key === 'Enter') handleAddCustom();
                      if (e.key === 'Escape') {
                        setAddingCustom(false);
                        setCustomKeyInput('');
                      }
                    }}
                    placeholder="agent-key (kebab-case)"
                    className="flex-1 rounded border border-border bg-surface px-1.5 py-0.5 text-xs font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="text-xs text-accent hover:text-accent-foreground"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(): void => setAddingCustom(true)}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface"
                >
                  Custom Agent...
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Agent cards */}
      {agentEntries.map(([key, config]) => (
        <AgentCard
          key={key}
          agentKey={key}
          config={config}
          isBuiltin={BUILTIN_AGENT_NAMES.has(key)}
          onConfigUpdate={(updated): void => handleUpdateAgent(key, updated)}
          onRemove={(): void => handleRemoveAgent(key)}
        />
      ))}

      {agentEntries.length === 0 && (
        <p className="text-[10px] text-text-tertiary text-center py-2">
          No agents configured. Click "+ Add Agent" to add one.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/workflows/AgentEditor.tsx
git commit -m "feat(web): create AgentEditor component for agents tab"
```

---

## Task 6: NodeInspector — Agents Tab + Advanced tab 折叠组 + Model placeholder

**Files:**
- Modify: `packages/web/src/components/workflows/NodeInspector.tsx`

- [ ] **Step 1: 添加 AgentsTab 组件**

在 `NodeInspector.tsx` 中，在 `AdvancedTab` 函数之后（第 699 行后），添加：

```tsx
import { AgentEditor } from './AgentEditor';
import { isAiNode, MODEL_PLACEHOLDERS, DEFAULT_MODEL_PLACEHOLDER, type NodeCategory } from '@/lib/node-type-constants';

function AgentsTab({
  node,
  onUpdate,
}: {
  node: DagNodeData;
  onUpdate: (updates: Partial<DagNodeData>) => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-[10px] text-text-tertiary">
        定义此节点可调用的子代理。内置 agent 直接引用 oh-my-opencode-slim 已注册的 agent。
      </p>
      <AgentEditor
        agents={node.agents}
        onUpdate={(agents): void => {
          onUpdate({ agents });
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: 在 AdvancedTab 中添加 Claude 高级选项折叠组**

在 `AdvancedTab` 函数的 return 块中，在 hooks JsonTextareaField 之后（第 696 行），添加两个折叠组：

```tsx
{/* Claude SDK Options */}
<div className="border-t border-border pt-3 mt-1">
  <details className="group">
    <summary className="text-[10px] text-text-tertiary uppercase tracking-wide cursor-pointer list-none flex items-center gap-1">
      <span className="transition-transform group-open:rotate-90">▸</span>
      SDK Options
    </summary>
    <div className="flex flex-col gap-2 mt-2">
      <Field label="Effort">
        <select
          value={node.effort ?? ''}
          onChange={(e): void => {
            onUpdate({ effort: (e.target.value || undefined) as 'low' | 'medium' | 'high' | 'max' | undefined });
          }}
          className={selectClass}
        >
          <option value="">Inherit</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="max">max</option>
        </select>
      </Field>

      <Field label="Thinking">
        <select
          value={
            node.thinking && typeof node.thinking === 'object' && 'type' in node.thinking
              ? (node.thinking as { type: string }).type
              : ''
          }
          onChange={(e): void => {
            const val = e.target.value;
            if (!val) {
              onUpdate({ thinking: undefined });
            } else if (val === 'adaptive') {
              onUpdate({ thinking: { type: 'adaptive' } });
            } else if (val === 'enabled') {
              onUpdate({ thinking: { type: 'enabled', budgetTokens: 10000 } });
            } else {
              onUpdate({ thinking: { type: 'disabled' } });
            }
          }}
          className={selectClass}
        >
          <option value="">Inherit</option>
          <option value="adaptive">adaptive</option>
          <option value="enabled">enabled</option>
          <option value="disabled">disabled</option>
        </select>
      </Field>

      {node.thinking && typeof node.thinking === 'object' && 'type' in node.thinking &&
        (node.thinking as { type: string }).type === 'enabled' && (
          <Field label="Budget Tokens">
            <input
              type="number"
              value={(node.thinking as { budgetTokens?: number }).budgetTokens ?? ''}
              onChange={(e): void => {
                const v = e.target.value;
                onUpdate({
                  thinking: { type: 'enabled', budgetTokens: v ? Number(v) : undefined },
                });
              }}
              placeholder="10000"
              className={inputClass}
            />
          </Field>
        )}

      <Field label="Sandbox Enabled">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={
              node.sandbox && typeof node.sandbox === 'object' && 'enabled' in node.sandbox
                ? (node.sandbox as { enabled?: boolean }).enabled ?? false
                : false
            }
            onChange={(e): void => {
              const existing = (node.sandbox as Record<string, unknown>) ?? {};
              onUpdate({
                sandbox: { ...existing, enabled: e.target.checked },
              });
            }}
            className="rounded border-border"
          />
          <span className="text-xs text-text-primary">Enable sandbox</span>
        </div>
      </Field>

      <Field label="Betas">
        <input
          type="text"
          value={node.betas?.join(', ') ?? ''}
          onChange={(e): void => {
            const val = e.target.value.trim();
            onUpdate({
              betas: val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined,
            });
          }}
          placeholder="beta-feature-1, beta-feature-2"
          className={inputClass}
        />
      </Field>
    </div>
  </details>
</div>

{/* Budget & Fallback */}
<div className="border-t border-border pt-3 mt-1">
  <details className="group">
    <summary className="text-[10px] text-text-tertiary uppercase tracking-wide cursor-pointer list-none flex items-center gap-1">
      <span className="transition-transform group-open:rotate-90">▸</span>
      Budget & Fallback
    </summary>
    <div className="flex flex-col gap-2 mt-2">
      <Field label="Max Budget (USD)">
        <input
          type="number"
          step="0.01"
          value={node.maxBudgetUsd ?? ''}
          onChange={(e): void => {
            const v = e.target.value;
            onUpdate({ maxBudgetUsd: v ? Number(v) : undefined });
          }}
          placeholder="Inherit"
          className={inputClass}
        />
      </Field>

      <Field label="Fallback Model">
        <input
          type="text"
          value={node.fallbackModel ?? ''}
          onChange={(e): void => {
            onUpdate({ fallbackModel: e.target.value || undefined });
          }}
          placeholder="Fallback model if primary fails"
          className={inputClass}
        />
      </Field>

      <Field label="System Prompt">
        <textarea
          value={node.systemPrompt ?? ''}
          onChange={(e): void => {
            onUpdate({ systemPrompt: e.target.value || undefined });
          }}
          rows={3}
          placeholder="Override system prompt for this node"
          className={cn(textareaClass, 'min-h-[60px]')}
        />
      </Field>
    </div>
  </details>
</div>
```

- [ ] **Step 3: 更新 ExecutionTab 的 model placeholder**

在 `ExecutionTab` 中（第 352-362 行），替换 Model input 的 placeholder 为动态值：

```tsx
<Field label="Model">
  <input
    type="text"
    value={node.model ?? ''}
    onChange={(e): void => {
      onUpdate({ model: e.target.value || undefined });
    }}
    placeholder={
      node.provider
        ? MODEL_PLACEHOLDERS[node.provider] ?? DEFAULT_MODEL_PLACEHOLDER
        : DEFAULT_MODEL_PLACEHOLDER
    }
    className={inputClass}
  />
</Field>
```

- [ ] **Step 4: 在 DagInspector 的 tabs 中添加 Agents tab**

在 `DagInspector` 函数中（约第 737 行），在 `{isAi && (` Advanced tab trigger 之后，添加 Agents tab trigger 和 content：

```tsx
{isAi && (
  <TabsTrigger value="agents" className="text-xs">
    Agents
  </TabsTrigger>
)}
```

在对应位置添加 TabsContent：

```tsx
{isAi && (
  <TabsContent value="agents">
    <AgentsTab node={node} onUpdate={onUpdate} />
  </TabsContent>
)}
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/workflows/NodeInspector.tsx
git commit -m "feat(web): add Agents tab, Claude SDK options, and dynamic model placeholder to NodeInspector"
```

---

## Task 7: WorkflowSettingsDialog — 工作流级配置

**Files:**
- Create: `packages/web/src/components/workflows/WorkflowSettingsDialog.tsx`
- Modify: `packages/web/src/components/workflows/BuilderToolbar.tsx`
- Modify: `packages/web/src/components/workflows/WorkflowBuilder.tsx`

- [ ] **Step 1: 创建 WorkflowSettingsDialog 组件**

```tsx
// packages/web/src/components/workflows/WorkflowSettingsDialog.tsx
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent';

const selectClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent';

const labelClass = 'text-[10px] text-text-tertiary uppercase tracking-wide';

interface WorkflowSettings {
  effort?: 'low' | 'medium' | 'high' | 'max';
  thinking?: { type: 'adaptive' } | { type: 'enabled'; budgetTokens?: number } | { type: 'disabled' };
  sandbox?: Record<string, unknown>;
  fallbackModel?: string;
  betas?: string[];
}

interface WorkflowSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: WorkflowSettings;
  onSettingsChange: (settings: WorkflowSettings) => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export function WorkflowSettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
}: WorkflowSettingsDialogProps): React.ReactElement {
  const [local, setLocal] = useState<WorkflowSettings>(settings);

  useEffect(() => {
    setLocal(settings);
  }, [settings, open]);

  if (!open) return <></>;

  const update = (partial: Partial<WorkflowSettings>): void => {
    const next = { ...local, ...partial };
    setLocal(next);
    onSettingsChange(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-[400px] max-h-[80vh] overflow-auto rounded-lg border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Workflow Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary text-sm"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 p-4">
          <Field label="Effort">
            <select
              value={local.effort ?? ''}
              onChange={(e): void => {
                update({ effort: (e.target.value || undefined) as WorkflowSettings['effort'] });
              }}
              className={selectClass}
            >
              <option value="">Default (SDK default)</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="max">max</option>
            </select>
          </Field>

          <Field label="Thinking">
            <select
              value={
                local.thinking && typeof local.thinking === 'object' && 'type' in local.thinking
                  ? (local.thinking as { type: string }).type
                  : ''
              }
              onChange={(e): void => {
                const val = e.target.value;
                if (!val) {
                  update({ thinking: undefined });
                } else if (val === 'adaptive') {
                  update({ thinking: { type: 'adaptive' } });
                } else if (val === 'enabled') {
                  update({ thinking: { type: 'enabled', budgetTokens: 10000 } });
                } else {
                  update({ thinking: { type: 'disabled' } });
                }
              }}
              className={selectClass}
            >
              <option value="">Default</option>
              <option value="adaptive">adaptive</option>
              <option value="enabled">enabled</option>
              <option value="disabled">disabled</option>
            </select>
          </Field>

          {local.thinking && typeof local.thinking === 'object' && 'type' in local.thinking &&
            (local.thinking as { type: string }).type === 'enabled' && (
              <Field label="Budget Tokens">
                <input
                  type="number"
                  value={(local.thinking as { budgetTokens?: number }).budgetTokens ?? ''}
                  onChange={(e): void => {
                    const v = e.target.value;
                    update({ thinking: { type: 'enabled', budgetTokens: v ? Number(v) : undefined } });
                  }}
                  placeholder="10000"
                  className={inputClass}
                />
              </Field>
            )}

          <Field label="Fallback Model">
            <input
              type="text"
              value={local.fallbackModel ?? ''}
              onChange={(e): void => {
                update({ fallbackModel: e.target.value || undefined });
              }}
              placeholder="Model to use if primary fails"
              className={inputClass}
            />
          </Field>

          <Field label="Betas">
            <input
              type="text"
              value={local.betas?.join(', ') ?? ''}
              onChange={(e): void => {
                const val = e.target.value.trim();
                update({ betas: val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined });
              }}
              placeholder="beta-feature-1, beta-feature-2"
              className={inputClass}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 在 BuilderToolbar 中添加"更多选项"按钮**

修改 `BuilderToolbar.tsx`，在现有按钮区域添加设置按钮。需要：
1. 添加 `onSettingsClick` prop
2. 添加 ⚙️ 按钮

读取 BuilderToolbar.tsx 以确认其 props 接口和按钮位置，然后添加：

```tsx
// 在 BuilderToolbar 的 props 接口中添加：
onSettingsClick?: () => void;

// 在按钮区域添加设置按钮（在 Save/Validate 按钮附近）：
<button
  type="button"
  onClick={props.onSettingsClick}
  className="rounded-md px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
  title="Workflow settings"
>
  ⚙️
</button>
```

- [ ] **Step 3: 在 WorkflowBuilder 中连接 WorkflowSettingsDialog**

修改 `WorkflowBuilder.tsx`：

1. 添加状态：
```typescript
const [settingsOpen, setSettingsOpen] = useState(false);
const [workflowEffort, setWorkflowEffort] = useState<string | undefined>(undefined);
const [workflowThinking, setWorkflowThinking] = useState<unknown>(undefined);
const [workflowFallbackModel, setWorkflowFallbackModel] = useState<string | undefined>(undefined);
const [workflowBetas, setWorkflowBetas] = useState<string[] | undefined>(undefined);
```

2. 更新 `buildDefinition` 包含工作流级配置：
```typescript
const buildDefinition = useCallback((): WorkflowDefinition => {
  const name = workflowName.trim() || 'untitled';
  const description = workflowDescription;
  const dagNodes = reactFlowToDagNodes(nodes, edges);
  return {
    name,
    description,
    provider,
    model,
    nodes: dagNodes,
    effort: workflowEffort as 'low' | 'medium' | 'high' | 'max' | undefined,
    thinking: workflowThinking as WorkflowDefinition['thinking'],
    fallbackModel: workflowFallbackModel,
    betas: workflowBetas,
  };
}, [workflowName, workflowDescription, provider, model, nodes, edges, workflowEffort, workflowThinking, workflowFallbackModel, workflowBetas]);
```

3. 在 `loadWorkflow` 中加载工作流级配置：
```typescript
setWorkflowEffort(workflow.effort);
setWorkflowThinking(workflow.thinking);
setWorkflowFallbackModel(workflow.fallbackModel);
setWorkflowBetas(workflow.betas);
```

4. 在 `BuilderToolbar` 上传递 `onSettingsClick` prop 并渲染 `WorkflowSettingsDialog`：
```tsx
<BuilderToolbar
  // ... existing props ...
  onSettingsClick={(): void => { setSettingsOpen(true); }}
/>

{settingsOpen && (
  <WorkflowSettingsDialog
    open={settingsOpen}
    onClose={(): void => { setSettingsOpen(false); }}
    settings={{
      effort: workflowEffort as 'low' | 'medium' | 'high' | 'max' | undefined,
      thinking: workflowThinking as WorkflowSettingsDialog['settings']['thinking'],
      fallbackModel: workflowFallbackModel,
      betas: workflowBetas,
    }}
    onSettingsChange={(s): void => {
      setWorkflowEffort(s.effort);
      setWorkflowThinking(s.thinking);
      setWorkflowFallbackModel(s.fallbackModel);
      setWorkflowBetas(s.betas);
      markDirty();
    }}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/workflows/WorkflowSettingsDialog.tsx packages/web/src/components/workflows/BuilderToolbar.tsx packages/web/src/components/workflows/WorkflowBuilder.tsx
git commit -m "feat(web): add WorkflowSettingsDialog for workflow-level configuration"
```

---

## Task 8: YamlCodeView 全字段序列化

**Files:**
- Modify: `packages/web/src/components/workflows/YamlCodeView.tsx`

- [ ] **Step 1: 更新 serializeDagNode 函数**

在 `YamlCodeView.tsx` 的 `serializeDagNode` 函数（第 67-145 行）中，在现有字段之后添加所有缺失字段的序列化：

在 `retry` 块（第 133-142 行）之后，添加：

```typescript
  // New node types
  if ('loop' in node && node.loop) {
    lines.push(`${pad}  loop:`);
    lines.push(`${pad}    prompt: ${serializeValue(node.loop.prompt, baseIndent + 6)}`);
    lines.push(`${pad}    max_iterations: ${node.loop.max_iterations}`);
    if (node.loop.exit_condition) {
      lines.push(`${pad}    exit_condition: ${serializeValue(node.loop.exit_condition, baseIndent + 6)}`);
    }
    if (node.loop.fresh_context !== undefined) {
      lines.push(`${pad}    fresh_context: ${node.loop.fresh_context}`);
    }
  }
  if ('approval' in node && node.approval) {
    lines.push(`${pad}  approval:`);
    lines.push(`${pad}    message: ${serializeValue(node.approval.message, baseIndent + 6)}`);
    if (node.approval.capture_response !== undefined) {
      lines.push(`${pad}    capture_response: ${node.approval.capture_response}`);
    }
  }
  if ('script' in node && node.script) {
    lines.push(`${pad}  script: ${serializeValue(node.script, baseIndent + 4)}`);
    if (node.runtime) lines.push(`${pad}  runtime: ${node.runtime}`);
    if (node.deps && node.deps.length > 0) {
      lines.push(`${pad}  deps:`);
      for (const dep of node.deps) {
        lines.push(`${pad}    - ${dep}`);
      }
    }
  }

  // Previously missing AI fields
  if (node.agents && Object.keys(node.agents).length > 0) {
    lines.push(`${pad}  agents:`);
    for (const [key, agent] of Object.entries(node.agents)) {
      lines.push(`${pad}    ${key}:`);
      lines.push(`${pad}      description: ${serializeValue(agent.description, baseIndent + 8)}`);
      if (agent.prompt) {
        lines.push(`${pad}      prompt: ${serializeValue(agent.prompt, baseIndent + 8)}`);
      }
      if (agent.model) {
        lines.push(`${pad}      model: ${agent.model}`);
      }
      if (agent.tools && agent.tools.length > 0) {
        lines.push(`${pad}      tools:`);
        for (const tool of agent.tools) {
          lines.push(`${pad}        - ${tool}`);
        }
      }
      if (agent.maxTurns !== undefined) {
        lines.push(`${pad}      maxTurns: ${agent.maxTurns}`);
      }
    }
  }
  if (node.effort) {
    lines.push(`${pad}  effort: ${node.effort}`);
  }
  if (node.thinking) {
    lines.push(`${pad}  thinking: ${serializeValue(node.thinking, baseIndent + 4)}`);
  }
  if (node.sandbox) {
    lines.push(`${pad}  sandbox: ${serializeValue(node.sandbox, baseIndent + 4)}`);
  }
  if (node.maxBudgetUsd !== undefined) {
    lines.push(`${pad}  maxBudgetUsd: ${node.maxBudgetUsd}`);
  }
  if (node.systemPrompt) {
    lines.push(`${pad}  systemPrompt: ${serializeValue(node.systemPrompt, baseIndent + 4)}`);
  }
  if (node.fallbackModel) {
    lines.push(`${pad}  fallbackModel: ${node.fallbackModel}`);
  }
  if (node.betas && node.betas.length > 0) {
    lines.push(`${pad}  betas:`);
    for (const beta of node.betas) {
      lines.push(`${pad}    - ${beta}`);
    }
  }
```

- [ ] **Step 2: 更新 serializeToYaml 函数添加工作流级字段**

在 `serializeToYaml` 函数中（第 148-177 行），在 `webSearchMode` 之后添加：

```typescript
  if (def.effort) {
    lines.push(`effort: ${def.effort}`);
  }
  if (def.thinking) {
    lines.push(`thinking: ${serializeValue(def.thinking, 0)}`);
  }
  if (def.fallbackModel) {
    lines.push(`fallbackModel: ${def.fallbackModel}`);
  }
  if (def.betas && def.betas.length > 0) {
    lines.push(`betas:`);
    for (const beta of def.betas) {
      lines.push(`  - ${beta}`);
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/workflows/YamlCodeView.tsx
git commit -m "feat(web): serialize all node and workflow fields in YAML preview"
```

---

## Task 9: 验证 — Type Check + Lint

**Files:**
- 无新增/修改，仅验证

- [ ] **Step 1: 运行 type-check**

```bash
cd /home/akers/projects/Archon-omo-slim && bun run type-check
```

预期：零新增错误。仅可能有预存的 bun-types 相关已知错误。

- [ ] **Step 2: 运行 lint**

```bash
cd /home/akers/projects/Archon-omo-slim && bun run lint
```

预期：零错误。

- [ ] **Step 3: 修复任何错误（如有）**

如果 type-check 或 lint 报告新增错误，逐一修复。

- [ ] **Step 4: 运行前端测试**

```bash
cd /home/akers/projects/Archon-omo-slim && bun test packages/web/
```

预期：所有现有测试通过。

- [ ] **Step 5: Commit fixes if any**

```bash
git add -A && git commit -m "fix(web): address type-check and lint issues from new features"
```

---

## Task 10: 测试 — 手动验证工作流构建器

**Files:**
- 无文件修改

- [ ] **Step 1: 启动 dev server**

```bash
cd /home/akers/projects/Archon-omo-slim && bun run dev
```

- [ ] **Step 2: 验证基础功能**

在浏览器中访问 http://localhost:5173，进入工作流构建器页面：

1. 打开现有工作流 → 验证节点正确加载（包括新字段保留）
2. 保存工作流 → 验证 YAML 预览包含所有字段
3. 重新加载 → 验证字段不丢失

- [ ] **Step 3: 验证新节点类型**

1. 从调色板拖入 loop 节点 → 验证紫色显示 + 正确的 General tab 字段
2. 拖入 approval 节点 → 验证黄色显示 + 正确字段
3. 拖入 script 节点 → 验证青色显示 + 正确字段
4. 验证这些节点不显示 Tools/Agents tab

- [ ] **Step 4: 验证 Agents tab**

1. 选中 prompt 节点 → 点击 Agents tab
2. 点击 "+ Add Agent" → 查看内置 agent 下拉列表
3. 添加 oracle agent → 验证卡片显示
4. 展开 oracle 卡片 → 修改 model → 保存
5. 添加自定义 agent → 验证表单
6. 保存工作流 → 验证 YAML 预览包含 agents

- [ ] **Step 5: 验证高级选项**

1. 选中 prompt 节点 → Advanced tab → 展开 "SDK Options"
2. 设置 effort=high → 保存 → 验证 YAML 包含 effort
3. 设置 thinking=enabled + budgetTokens=5000 → 保存 → 验证
4. 验证 model placeholder 随 provider 变化

- [ ] **Step 6: 验证工作流设置 dialog**

1. 点击 BuilderToolbar ⚙️ 按钮
2. 设置 workflow-level effort/thinking → 保存
3. 验证 YAML 预览包含工作流级字段
