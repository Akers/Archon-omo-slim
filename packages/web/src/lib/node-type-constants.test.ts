import { describe, test, expect } from 'bun:test';
import {
  NODE_TYPE_CONFIG,
  AI_NODE_TYPES,
  NON_AI_NODE_TYPES,
  isAiNode,
  BUILTIN_AGENTS,
  BUILTIN_AGENT_NAMES,
  MODEL_PLACEHOLDERS,
  DEFAULT_MODEL_PLACEHOLDER,
  type NodeCategory,
} from './node-type-constants';

describe('NODE_TYPE_CONFIG', () => {
  test('has all 6 node types', () => {
    const expectedTypes: NodeCategory[] = [
      'command',
      'prompt',
      'bash',
      'loop',
      'approval',
      'script',
    ];
    expect(Object.keys(NODE_TYPE_CONFIG)).toEqual(expectedTypes);
  });

  test('each config has badge, stripeColor, badgeBg, badgeText', () => {
    for (const nodeType of Object.keys(NODE_TYPE_CONFIG) as NodeCategory[]) {
      const config = NODE_TYPE_CONFIG[nodeType];
      expect(config).toHaveProperty('badge');
      expect(config).toHaveProperty('stripeColor');
      expect(config).toHaveProperty('badgeBg');
      expect(config).toHaveProperty('badgeText');
      expect(typeof config.badge).toBe('string');
      expect(typeof config.stripeColor).toBe('string');
      expect(typeof config.badgeBg).toBe('string');
      expect(typeof config.badgeText).toBe('string');
    }
  });

  test('command config has correct badge', () => {
    expect(NODE_TYPE_CONFIG.command.badge).toBe('CMD');
  });

  test('prompt config has correct badge', () => {
    expect(NODE_TYPE_CONFIG.prompt.badge).toBe('PROMPT');
  });

  test('bash config has correct badge', () => {
    expect(NODE_TYPE_CONFIG.bash.badge).toBe('BASH');
  });

  test('loop config has correct badge', () => {
    expect(NODE_TYPE_CONFIG.loop.badge).toBe('LOOP');
  });

  test('approval config has correct badge', () => {
    expect(NODE_TYPE_CONFIG.approval.badge).toBe('APPROVAL');
  });

  test('script config has correct badge', () => {
    expect(NODE_TYPE_CONFIG.script.badge).toBe('SCRIPT');
  });
});

describe('AI_NODE_TYPES', () => {
  test('AI_NODE_TYPES equals command, prompt, loop', () => {
    expect(AI_NODE_TYPES).toEqual(['command', 'prompt', 'loop']);
  });
});

describe('NON_AI_NODE_TYPES', () => {
  test('NON_AI_NODE_TYPES equals bash, script, approval', () => {
    expect(NON_AI_NODE_TYPES).toEqual(['bash', 'script', 'approval']);
  });
});

describe('isAiNode', () => {
  test('returns true for command', () => {
    expect(isAiNode('command')).toBe(true);
  });

  test('returns true for prompt', () => {
    expect(isAiNode('prompt')).toBe(true);
  });

  test('returns true for loop', () => {
    expect(isAiNode('loop')).toBe(true);
  });

  test('returns false for bash', () => {
    expect(isAiNode('bash')).toBe(false);
  });

  test('returns false for script', () => {
    expect(isAiNode('script')).toBe(false);
  });

  test('returns false for approval', () => {
    expect(isAiNode('approval')).toBe(false);
  });
});

describe('BUILTIN_AGENTS', () => {
  test('has 9 agents', () => {
    expect(BUILTIN_AGENTS).toHaveLength(9);
  });

  test('has correct agent names', () => {
    const names = BUILTIN_AGENTS.map(a => a.name);
    expect(names).toEqual([
      'explorer',
      'librarian',
      'oracle',
      'designer',
      'fixer',
      'observer',
      'council',
      'councillor',
      'orchestrator',
    ]);
  });

  test('each agent has name and description', () => {
    for (const agent of BUILTIN_AGENTS) {
      expect(typeof agent.name).toBe('string');
      expect(typeof agent.description).toBe('string');
    }
  });
});

describe('BUILTIN_AGENT_NAMES', () => {
  test('contains all agent names', () => {
    for (const agent of BUILTIN_AGENTS) {
      expect(BUILTIN_AGENT_NAMES.has(agent.name)).toBe(true);
    }
  });

  test('does not contain unknown names', () => {
    expect(BUILTIN_AGENT_NAMES.has('unknown-agent')).toBe(false);
    expect(BUILTIN_AGENT_NAMES.has('fake')).toBe(false);
    expect(BUILTIN_AGENT_NAMES.has('')).toBe(false);
  });

  test('has correct size', () => {
    expect(BUILTIN_AGENT_NAMES.size).toBe(9);
  });
});

describe('MODEL_PLACEHOLDERS', () => {
  test('has claude key', () => {
    expect(MODEL_PLACEHOLDERS).toHaveProperty('claude');
  });

  test('has codex key', () => {
    expect(MODEL_PLACEHOLDERS).toHaveProperty('codex');
  });

  test('has opencode key', () => {
    expect(MODEL_PLACEHOLDERS).toHaveProperty('opencode');
  });

  test('has pi key', () => {
    expect(MODEL_PLACEHOLDERS).toHaveProperty('pi');
  });

  test('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(MODEL_PLACEHOLDERS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('DEFAULT_MODEL_PLACEHOLDER', () => {
  test('is non-empty string', () => {
    expect(typeof DEFAULT_MODEL_PLACEHOLDER).toBe('string');
    expect(DEFAULT_MODEL_PLACEHOLDER.length).toBeGreaterThan(0);
  });

  test('has expected value', () => {
    expect(DEFAULT_MODEL_PLACEHOLDER).toBe('继承工作流默认');
  });
});
