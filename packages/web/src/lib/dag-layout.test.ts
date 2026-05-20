import { describe, test, expect } from 'bun:test';
import type { DagNode } from '@/lib/api';
import {
  resolveNodeDisplay,
  dagNodesToReactFlow,
  hasCycle,
  computeTopologicalLayers,
  layoutWithDagre,
  NODE_WIDTH,
  NODE_HEIGHT,
} from './dag-layout';
import type { DagFlowNode } from '@/components/workflows/DagNodeComponent';

describe('resolveNodeDisplay', () => {
  test('bash node returns correct display', () => {
    const node: DagNode = {
      id: 'n1',
      bash: 'echo hello',
      timeout: 30000,
    };
    const result = resolveNodeDisplay(node);
    expect(result.label).toBe('Shell');
    expect(result.nodeType).toBe('bash');
    expect(result.bashScript).toBe('echo hello');
    expect(result.bashTimeout).toBe(30000);
  });

  test('script node returns correct display', () => {
    const node: DagNode = {
      id: 'n1',
      script: 'console.log("test")',
      runtime: 'bun',
      deps: ['lodash', 'express'],
      timeout: 60000,
    };
    const result = resolveNodeDisplay(node);
    expect(result.label).toBe('Script');
    expect(result.nodeType).toBe('script');
    expect(result.scriptContent).toBe('console.log("test")');
    expect(result.scriptRuntime).toBe('bun');
    expect(result.scriptDeps).toBe('lodash, express');
    expect(result.scriptTimeout).toBe(60000);
  });

  test('loop node returns correct display', () => {
    const node: DagNode = {
      id: 'n1',
      loop: {
        prompt: 'Continue processing?',
        until: 'output contains "done"',
        max_iterations: 10,
        fresh_context: true,
      },
    };
    const result = resolveNodeDisplay(node);
    expect(result.label).toBe('Loop');
    expect(result.nodeType).toBe('loop');
    expect(result.loopPromptText).toBe('Continue processing?');
    expect(result.loopMaxIterations).toBe(10);
    expect(result.loopExitCondition).toBe('output contains "done"');
    expect(result.loopFreshContext).toBe(true);
  });

  test('approval node returns correct display', () => {
    const node: DagNode = {
      id: 'n1',
      approval: {
        message: 'Please approve this step',
        capture_response: true,
      },
    };
    const result = resolveNodeDisplay(node);
    expect(result.label).toBe('Approval');
    expect(result.nodeType).toBe('approval');
    expect(result.approvalMessage).toBe('Please approve this step');
    expect(result.approvalCaptureResponse).toBe(true);
  });

  test('command node returns command name as label', () => {
    const node: DagNode = {
      id: 'n1',
      command: 'my-custom-command',
    };
    const result = resolveNodeDisplay(node);
    expect(result.label).toBe('my-custom-command');
    expect(result.nodeType).toBe('command');
  });

  test('prompt node returns correct display', () => {
    const node: DagNode = {
      id: 'n1',
      prompt: 'What is the meaning of life?',
    };
    const result = resolveNodeDisplay(node);
    expect(result.label).toBe('Prompt');
    expect(result.nodeType).toBe('prompt');
    expect(result.promptText).toBe('What is the meaning of life?');
  });

  test('fallback when no type field returns prompt type', () => {
    const node: DagNode = {
      id: 'n1',
      model: 'claude-sonnet-4',
    };
    const result = resolveNodeDisplay(node);
    expect(result.label).toBe('Prompt');
    expect(result.nodeType).toBe('prompt');
  });
});

describe('dagNodesToReactFlow', () => {
  test('converts 2 nodes + edge correctly', () => {
    const nodes: DagNode[] = [
      { id: 'a', prompt: 'First step' },
      { id: 'b', prompt: 'Second step', depends_on: ['a'] },
    ];
    const result = dagNodesToReactFlow(nodes);

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('a');
    expect(result.edges[0].target).toBe('b');
  });

  test('handles empty array', () => {
    const result = dagNodesToReactFlow([]);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  test('handles nodes with depends_on', () => {
    const nodes: DagNode[] = [
      { id: 'start', prompt: 'Start' },
      { id: 'middle', prompt: 'Middle', depends_on: ['start'] },
      { id: 'end', prompt: 'End', depends_on: ['start', 'middle'] },
    ];
    const result = dagNodesToReactFlow(nodes);

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(3); // start->middle, start->end, middle->end
    expect(result.edges.map(e => `${e.source}->${e.target}`)).toContain('start->middle');
    expect(result.edges.map(e => `${e.source}->${e.target}`)).toContain('middle->end');
  });

  test('node data includes resolved display info', () => {
    const nodes: DagNode[] = [{ id: 'a', bash: 'echo hello' }];
    const result = dagNodesToReactFlow(nodes);
    const node = result.nodes[0];
    expect(node.data.nodeType).toBe('bash');
    expect(node.data.bashScript).toBe('echo hello');
  });
});

describe('hasCycle', () => {
  test('detects cycle', () => {
    const nodeIds = new Set(['a', 'b', 'c']);
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'a' }, // cycle back to a
    ];
    expect(hasCycle(nodeIds, edges)).toBe(true);
  });

  test('no cycle returns false', () => {
    const nodeIds = new Set(['a', 'b', 'c']);
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ];
    expect(hasCycle(nodeIds, edges)).toBe(false);
  });

  test('empty graph has no cycle', () => {
    const nodeIds = new Set<string>();
    const edges: { source: string; target: string }[] = [];
    expect(hasCycle(nodeIds, edges)).toBe(false);
  });

  test('single node with self reference returns false (edge is ignored)', () => {
    const nodeIds = new Set(['a']);
    const edges = [{ source: 'a', target: 'a' }];
    // Implementation ignores self-referencing edges (source === target check)
    expect(hasCycle(nodeIds, edges)).toBe(false);
  });

  test('diamond graph has no cycle', () => {
    const nodeIds = new Set(['a', 'b', 'c', 'd']);
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'b', target: 'd' },
      { source: 'c', target: 'd' },
    ];
    expect(hasCycle(nodeIds, edges)).toBe(false);
  });
});

describe('computeTopologicalLayers', () => {
  test('correct layer assignment for linear chain', () => {
    const nodes: DagFlowNode[] = [
      { id: 'a', type: 'dagNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'dagNode', position: { x: 0, y: 0 }, data: {}, draggable: true },
      { id: 'c', type: 'dagNode', position: { x: 0, y: 0 }, data: {}, draggable: true },
    ];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];

    const layers = computeTopologicalLayers(nodes, edges);

    expect(layers.get('a')).toBe(0);
    expect(layers.get('b')).toBe(1);
    expect(layers.get('c')).toBe(2);
  });

  test('diamond graph assigns correct layers', () => {
    const nodes: DagFlowNode[] = [
      { id: 'a', type: 'dagNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'dagNode', position: { x: 0, y: 0 }, data: {}, draggable: true },
      { id: 'c', type: 'dagNode', position: { x: 0, y: 0 }, data: {}, draggable: true },
      { id: 'd', type: 'dagNode', position: { x: 0, y: 0 }, data: {}, draggable: true },
    ];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'a', target: 'c' },
      { id: 'e3', source: 'b', target: 'd' },
      { id: 'e4', source: 'c', target: 'd' },
    ];

    const layers = computeTopologicalLayers(nodes, edges);

    expect(layers.get('a')).toBe(0);
    expect(layers.get('b')).toBe(1);
    expect(layers.get('c')).toBe(1);
    expect(layers.get('d')).toBe(2);
  });

  test('parallel nodes at layer 0', () => {
    const nodes: DagFlowNode[] = [
      { id: 'a', type: 'dagNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'dagNode', position: { x: 0, y: 0 }, data: {}, draggable: true },
    ];
    const edges: { id: string; source: string; target: string }[] = [];

    const layers = computeTopologicalLayers(nodes, edges);

    expect(layers.get('a')).toBe(0);
    expect(layers.get('b')).toBe(0);
  });

  test('empty nodes returns empty map', () => {
    const layers = computeTopologicalLayers([], []);
    expect(layers.size).toBe(0);
  });
});

describe('layoutWithDagre', () => {
  test('NODE_WIDTH and NODE_HEIGHT are defined', () => {
    expect(NODE_WIDTH).toBe(180);
    expect(NODE_HEIGHT).toBe(80);
  });

  test('positions nodes with valid coordinates', () => {
    const nodes: DagFlowNode[] = [
      { id: 'a', type: 'dagNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'dagNode', position: { x: 0, y: 0 }, data: {}, draggable: true },
    ];
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];

    const result = layoutWithDagre(nodes, edges);

    expect(result.nodes[0].position.x).toBeDefined();
    expect(result.nodes[0].position.y).toBeDefined();
    expect(result.nodes[1].position.x).toBeDefined();
    expect(result.nodes[1].position.y).toBeDefined();
  });
});
