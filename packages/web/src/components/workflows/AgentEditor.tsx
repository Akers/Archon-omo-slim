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
        onClick={(): void => {
          setExpanded(!expanded);
        }}
      >
        <span
          className={cn(
            'text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0',
            isBuiltin ? 'bg-accent/20 text-accent' : 'bg-surface-elevated text-text-secondary'
          )}
        >
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
              onChange={(e): void => {
                onConfigUpdate({ ...config, description: e.target.value });
              }}
              placeholder={isBuiltin ? '可选：覆盖内置 agent 描述' : 'Agent 描述（必填）'}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Prompt</label>
            <textarea
              value={config.prompt}
              onChange={(e): void => {
                onConfigUpdate({ ...config, prompt: e.target.value });
              }}
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
              onChange={(e): void => {
                onConfigUpdate({ ...config, model: e.target.value || undefined });
              }}
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
                  tools: val
                    ? val
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean)
                    : undefined,
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
        prompt: '',
      },
    });
    setShowAddMenu(false);
  };

  const handleAddCustom = (): void => {
    const key = customKeyInput
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
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
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete updated[key];
    onUpdate(Object.keys(updated).length > 0 ? updated : undefined);
  };

  const handleUpdateAgent = (key: string, config: AgentConfig): void => {
    const existing = agents ?? {};
    onUpdate({ ...existing, [key]: config });
  };

  const availableBuiltins = BUILTIN_AGENTS.filter(a => !agents?.[a.name]);

  return (
    <div className="flex flex-col gap-2">
      {/* Add agent button + dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={(): void => {
            setShowAddMenu(!showAddMenu);
          }}
          className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
        >
          + Add Agent
        </button>

        {showAddMenu && (
          <div className="absolute z-10 left-0 right-0 mt-1 rounded-md border border-border bg-surface-elevated shadow-lg max-h-64 overflow-auto">
            {availableBuiltins.length > 0 && (
              <>
                <div className="px-2 py-1 text-[9px] text-text-tertiary uppercase tracking-wide border-b border-border">
                  Built-in Agents (oh-my-opencode-slim)
                </div>
                {availableBuiltins.map(agent => (
                  <button
                    key={agent.name}
                    type="button"
                    onClick={(): void => {
                      handleAddBuiltin(agent);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-surface flex items-center gap-2"
                  >
                    <span className="font-mono text-accent shrink-0">{agent.name}</span>
                    <span className="text-text-tertiary truncate">{agent.description}</span>
                  </button>
                ))}
              </>
            )}

            <div className="border-t border-border">
              {addingCustom ? (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <input
                    type="text"
                    value={customKeyInput}
                    onChange={(e): void => {
                      setCustomKeyInput(e.target.value);
                    }}
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
                  onClick={(): void => {
                    setAddingCustom(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface"
                >
                  Custom Agent...
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {agentEntries.map(([key, config]) => (
        <AgentCard
          key={key}
          agentKey={key}
          config={config}
          isBuiltin={BUILTIN_AGENT_NAMES.has(key)}
          onConfigUpdate={(updated): void => {
            handleUpdateAgent(key, updated);
          }}
          onRemove={(): void => {
            handleRemoveAgent(key);
          }}
        />
      ))}

      {agentEntries.length === 0 && (
        <p className="text-[10px] text-text-tertiary text-center py-2">
          No agents configured. Click &quot;+ Add Agent&quot; to add one.
        </p>
      )}
    </div>
  );
}
