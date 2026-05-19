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
}

export const NODE_TYPE_CONFIG: Record<NodeCategory, NodeTypeConfig> = {
  command: {
    badge: 'CMD',
    stripeColor: 'bg-node-command',
    badgeBg: 'bg-node-command/20',
    badgeText: 'text-node-command',
  },
  prompt: {
    badge: 'PROMPT',
    stripeColor: 'bg-node-prompt',
    badgeBg: 'bg-node-prompt/20',
    badgeText: 'text-node-prompt',
  },
  bash: {
    badge: 'BASH',
    stripeColor: 'bg-node-bash',
    badgeBg: 'bg-node-bash/20',
    badgeText: 'text-node-bash',
  },
  loop: {
    badge: 'LOOP',
    stripeColor: 'bg-purple-500',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-500',
  },
  approval: {
    badge: 'APPROVAL',
    stripeColor: 'bg-yellow-500',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-500',
  },
  script: {
    badge: 'SCRIPT',
    stripeColor: 'bg-cyan-500',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-500',
  },
} as const;

/** AI node types show Execution/Tools/Agents/Advanced tabs. */
export const AI_NODE_TYPES: readonly NodeCategory[] = ['command', 'prompt', 'loop'] as const;

/** Non-AI node types: no provider/model/tools/agents fields. */
export const NON_AI_NODE_TYPES: readonly NodeCategory[] = ['bash', 'script', 'approval'] as const;

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

export const BUILTIN_AGENT_NAMES: ReadonlySet<string> = new Set(BUILTIN_AGENTS.map(a => a.name));

// --- Model format hints per provider ---

export const MODEL_PLACEHOLDERS: Record<string, string> = {
  claude: '例如: claude-sonnet-4-20250514',
  codex: '例如: gpt-5.3-codex',
  opencode: '例如: anthropic/claude-3-5-sonnet',
  pi: '例如: anthropic/claude-haiku-4-5',
};

export const DEFAULT_MODEL_PLACEHOLDER = '继承工作流默认';
