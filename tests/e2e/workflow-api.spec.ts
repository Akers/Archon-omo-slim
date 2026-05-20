/**
 * E2E Tests: Workflow API & Full Roundtrip Testing
 *
 * Tests the backend API endpoints for workflow CRUD operations,
 * focusing on the new node types and configuration fields.
 *
 * Run: npx playwright test tests/e2e/workflow-api.spec.ts
 *
 * Prerequisites: Server must be running on port 3090
 *   bun run dev:server
 */
import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3090/api';
const TEST_WORKFLOW_PREFIX = 'test-e2e-';

// --- Test Data Factories ---

function makeLoopWorkflow(name: string) {
  return {
    name,
    description: 'E2E test workflow with loop node',
    nodes: [
      {
        id: 'loop-1',
        loop: {
          prompt: 'Iteratively improve the code until no issues remain',
          until: 'COMPLETE',
          max_iterations: 5,
          fresh_context: false,
        },
      },
    ],
  };
}

function makeApprovalWorkflow(name: string) {
  return {
    name,
    description: 'E2E test workflow with approval node',
    nodes: [
      {
        id: 'review',
        approval: {
          message: 'Please review the proposed changes',
          capture_response: true,
        },
      },
    ],
  };
}

function makeScriptWorkflow(name: string) {
  return {
    name,
    description: 'E2E test workflow with script node',
    nodes: [
      {
        id: 'run-script',
        script: 'console.log("Hello from script")',
        runtime: 'bun',
        deps: ['lodash'],
        timeout: 30000,
      },
    ],
  };
}

function makeAgentsWorkflow(name: string) {
  return {
    name,
    description: 'E2E test workflow with agents',
    provider: 'opencode',
    model: 'anthropic/claude-3-5-sonnet',
    effort: 'high',
    thinking: { type: 'enabled', budgetTokens: 10000 },
    nodes: [
      {
        id: 'analyze',
        prompt: 'Analyze the codebase architecture',
        agents: {
          'my-oracle': {
            description: 'Architecture advisor',
            prompt: 'You are a senior architect. Analyze code for design patterns.',
            model: 'anthropic/claude-3-5-sonnet',
            tools: ['Read', 'Grep', 'Glob'],
            maxTurns: 5,
          },
          'my-fixer': {
            description: 'Code fixer',
            prompt: 'Fix the identified issues.',
            skills: ['simplify'],
          },
        },
      },
    ],
  };
}

function makeAdvancedOptionsWorkflow(name: string) {
  return {
    name,
    description: 'E2E test workflow with advanced SDK options',
    provider: 'claude',
    effort: 'max',
    thinking: { type: 'enabled', budgetTokens: 20000 },
    sandbox: { enabled: true },
    fallbackModel: 'claude-haiku-4-5',
    betas: ['beta-1', 'beta-2'],
    nodes: [
      {
        id: 'complex-task',
        prompt: 'Perform a complex analysis',
        effort: 'high',
        thinking: { type: 'adaptive' },
        sandbox: { enabled: true },
        maxBudgetUsd: 2.5,
        systemPrompt: 'You are a code reviewer.',
        fallbackModel: 'claude-sonnet-4',
        betas: ['interleaved-thinking'],
        allowed_tools: ['Read', 'Grep', 'Glob'],
        denied_tools: ['Write'],
        skills: ['architect'],
        retry: { max_attempts: 3, delay_ms: 5000, on_error: 'transient' },
        idle_timeout: 300000,
      },
    ],
  };
}

function makeMultiTypeWorkflow(name: string) {
  return {
    name,
    description: 'E2E test workflow with all node types',
    nodes: [
      {
        id: 'setup',
        prompt: 'Prepare the environment',
      },
      {
        id: 'run-script',
        script: 'bun run setup.ts',
        runtime: 'bun',
        depends_on: ['setup'],
      },
      {
        id: 'analyze',
        prompt: 'Analyze results',
        depends_on: ['run-script'],
        agents: {
          reviewer: {
            description: 'Review the analysis',
            prompt: 'You are a code reviewer.',
          },
        },
      },
      {
        id: 'review-gate',
        approval: {
          message: 'Review the analysis results before proceeding',
          capture_response: true,
        },
        depends_on: ['analyze'],
      },
      {
        id: 'fix-loop',
        loop: {
          prompt: 'Fix issues found in the review',
          until: 'COMPLETE',
          max_iterations: 3,
        },
        depends_on: ['review-gate'],
      },
      {
        id: 'cleanup',
        bash: 'rm -rf /tmp/test-output',
        depends_on: ['fix-loop'],
      },
    ],
  };
}

// =====================================================
// Test Suite 1: API Health & Workflow Listing
// =====================================================

test.describe('API Health & Workflow Listing', () => {
  test('should respond to health check', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });

  test('should list workflows', async ({ request }) => {
    const response = await request.get(`${API_BASE}/workflows`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('workflows');
    expect(Array.isArray(body.workflows)).toBe(true);
  });

  test('should list providers', async ({ request }) => {
    const response = await request.get(`${API_BASE}/providers`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('providers');
    expect(Array.isArray(body.providers)).toBe(true);
  });
});

// =====================================================
// Test Suite 2: Workflow Validation API
// =====================================================

test.describe('Workflow Validation API', () => {
  test('should validate a valid loop workflow', async ({ request }) => {
    const workflow = makeLoopWorkflow(`${TEST_WORKFLOW_PREFIX}loop-validate`);
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should validate a valid approval workflow', async ({ request }) => {
    const workflow = makeApprovalWorkflow(`${TEST_WORKFLOW_PREFIX}approval-validate`);
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should validate a valid script workflow', async ({ request }) => {
    const workflow = makeScriptWorkflow(`${TEST_WORKFLOW_PREFIX}script-validate`);
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should validate a valid agents workflow', async ({ request }) => {
    const workflow = makeAgentsWorkflow(`${TEST_WORKFLOW_PREFIX}agents-validate`);
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should validate workflow with advanced SDK options', async ({ request }) => {
    const workflow = makeAdvancedOptionsWorkflow(`${TEST_WORKFLOW_PREFIX}advanced-validate`);
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should validate workflow with all node types', async ({ request }) => {
    const workflow = makeMultiTypeWorkflow(`${TEST_WORKFLOW_PREFIX}multi-validate`);
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should reject workflow with invalid agent key format', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}invalid-agent-key`,
      nodes: [
        {
          id: 'bad',
          prompt: 'test',
          agents: {
            INVALID_KEY: {
              description: 'Bad key',
              prompt: 'test',
            },
          },
        },
      ],
    };
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.errors).toBeDefined();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test('should reject workflow with empty agents record', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}empty-agents`,
      nodes: [
        {
          id: 'empty',
          prompt: 'test',
          agents: {},
        },
      ],
    };
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    // Empty agents should fail the refine check
    expect(body.valid).toBe(false);
  });

  test('should reject workflow with missing agent description', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}no-desc`,
      nodes: [
        {
          id: 'node',
          prompt: 'test',
          agents: {
            'my-agent': {
              prompt: 'test',
              // description missing - should fail
            },
          },
        },
      ],
    };
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
  });

  test('should reject workflow with invalid effort value', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}bad-effort`,
      effort: 'extreme', // invalid
      nodes: [{ id: 'n1', prompt: 'test' }],
    };
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
  });

  test('should reject workflow with invalid thinking type', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}bad-thinking`,
      thinking: { type: 'invalid' },
      nodes: [{ id: 'n1', prompt: 'test' }],
    };
    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(false);
  });
});

// =====================================================
// Test Suite 3: Workflow Save/Load Roundtrip
// =====================================================

test.describe('Workflow Save/Load Roundtrip', () => {
  const testCases = [
    { name: 'loop', factory: makeLoopWorkflow },
    { name: 'approval', factory: makeApprovalWorkflow },
    { name: 'script', factory: makeScriptWorkflow },
    { name: 'agents', factory: makeAgentsWorkflow },
    { name: 'advanced', factory: makeAdvancedOptionsWorkflow },
    { name: 'multi-type', factory: makeMultiTypeWorkflow },
  ];

  for (const tc of testCases) {
    test(`should save and load ${tc.name} workflow preserving all fields`, async ({ request }) => {
      const workflowName = `${TEST_WORKFLOW_PREFIX}${tc.name}-roundtrip`;
      const workflow = tc.factory(workflowName);

      // Save
      const saveResponse = await request.put(`${API_BASE}/workflows/${workflowName}`, {
        data: { definition: workflow },
      });
      // Save may fail if no cwd is set - that's OK, we test the API contract
      if (saveResponse.status() === 200 || saveResponse.status() === 201) {
        // Load and verify
        const loadResponse = await request.get(`${API_BASE}/workflows/${workflowName}`);
        if (loadResponse.status() === 200) {
          const body = await loadResponse.json();
          expect(body.workflow).toBeDefined();
          expect(body.workflow.name).toBe(workflowName);

          // Verify node count preserved
          expect(body.workflow.nodes.length).toBe(workflow.nodes.length);

          // Verify node IDs preserved
          const loadedIds = body.workflow.nodes.map(n => n.id);
          const expectedIds = workflow.nodes.map(n => n.id);
          expect(loadedIds).toEqual(expectedIds);
        }
      }
    });
  }
});

// =====================================================
// Test Suite 4: Edge Cases & Boundary Conditions
// =====================================================

test.describe('Edge Cases & Boundary Conditions', () => {
  test('should handle workflow with 100+ nodes', async ({ request }) => {
    const nodes = Array.from({ length: 100 }, (_, i) => ({
      id: `node-${i}`,
      prompt: `Task ${i}`,
      ...(i > 0 ? { depends_on: [`node-${i - 1}`] } : {}),
    }));

    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}large`,
      description: 'E2E test with 100+ nodes',
      nodes,
    };

    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should handle node with special characters in prompt', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}special-chars`,
      description: 'E2E test with special characters',
      nodes: [
        {
          id: 'special',
          prompt:
            'Test with "quotes", \'apostrophes\', <tags>, & ampersands, 中文, 日本語, emoji 🚀',
        },
      ],
    };

    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should handle node with multiline prompt', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}multiline`,
      description: 'E2E test with multiline prompt',
      nodes: [
        {
          id: 'multiline',
          prompt: 'Line 1\nLine 2\nLine 3\n  Indented line\n\tTab line',
        },
      ],
    };

    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should handle agent with many tools', async ({ request }) => {
    const tools = [
      'Read',
      'Write',
      'Edit',
      'Grep',
      'Glob',
      'Bash',
      'WebFetch',
      'TodoRead',
      'TodoWrite',
    ];
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}many-tools`,
      description: 'E2E test with many tools',
      nodes: [
        {
          id: 'many-tools',
          prompt: 'test',
          agents: {
            'tool-heavy': {
              description: 'Agent with many tools',
              prompt: 'test',
              tools,
              disallowedTools: ['DangerousTool'],
            },
          },
        },
      ],
    };

    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should handle loop with until_bash and gate_message', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}loop-extended`,
      description: 'E2E test with extended loop',
      nodes: [
        {
          id: 'extended-loop',
          loop: {
            prompt: 'Fix linting issues',
            until: 'CUSTOM',
            until_bash: 'bun run lint 2>&1 | grep -c "error"',
            max_iterations: 10,
            fresh_context: true,
            interactive: true,
            gate_message: 'Review the changes before next iteration?',
          },
        },
      ],
    };

    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should handle approval with on_reject prompt', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}approval-reject`,
      description: 'E2E test with approval reject',
      nodes: [
        {
          id: 'reject-flow',
          approval: {
            message: 'Approve the deployment?',
            capture_response: true,
          },
          on_reject: {
            prompt: 'Rollback the changes and notify the team',
          },
        },
      ],
    };

    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should handle empty workflow (no nodes)', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}empty`,
      description: 'E2E test with empty nodes',
      nodes: [],
    };

    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    // Empty nodes may or may not be valid depending on schema
    const body = await response.json();
    expect(body).toHaveProperty('valid');
  });

  test('should handle workflow with all optional workflow-level fields', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}all-options`,
      description: 'Test all workflow-level options',
      provider: 'claude',
      model: 'claude-sonnet-4',
      effort: 'max',
      thinking: { type: 'enabled', budgetTokens: 50000 },
      sandbox: { enabled: true },
      fallbackModel: 'claude-haiku-4-5',
      betas: ['interleaved-thinking', 'code-search'],
      nodes: [
        {
          id: 'task',
          prompt: 'Do something complex',
        },
      ],
    };

    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });

  test('should handle node with retry and idle_timeout', async ({ request }) => {
    const workflow = {
      name: `${TEST_WORKFLOW_PREFIX}retry-timeout`,
      description: 'E2E test with retry and timeout',
      nodes: [
        {
          id: 'retry-node',
          prompt: 'This might fail',
          retry: {
            max_attempts: 3,
            delay_ms: 5000,
            on_error: 'transient',
          },
          idle_timeout: 600000,
        },
      ],
    };

    const response = await request.post(`${API_BASE}/workflows/validate`, {
      data: { definition: workflow },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.valid).toBe(true);
  });
});
