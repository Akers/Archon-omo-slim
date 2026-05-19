import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createLogger } from '@archon/paths';

import type { NamedAgentConfig } from './agent-config';
import { toKebabCase } from './agent-config';

let cachedLog: ReturnType<typeof createLogger> | undefined;
function getLog(): ReturnType<typeof createLogger> {
  if (!cachedLog) cachedLog = createLogger('provider.opencode');
  return cachedLog;
}

function buildAgentFileContent(agent: NamedAgentConfig): string {
  const agentConfig = agent.config;
  const lines: string[] = ['---'];

  lines.push('mode: subagent');

  if (agentConfig.description) {
    lines.push(`description: ${JSON.stringify(agentConfig.description)}`);
  }

  if (agentConfig.model) {
    lines.push(`model: ${JSON.stringify(agentConfig.model)}`);
  }

  if (typeof agentConfig.maxTurns === 'number') {
    lines.push(`steps: ${agentConfig.maxTurns}`);
  }

  if (agentConfig.skills && agentConfig.skills.length > 0) {
    lines.push('skills:');
    for (const skill of agentConfig.skills) {
      lines.push(`- ${JSON.stringify(skill)}`);
    }
  }

  const toolsMap: Record<string, boolean> = {};
  for (const tool of agentConfig.tools ?? []) {
    toolsMap[tool] = true;
  }
  for (const tool of agentConfig.disallowedTools ?? []) {
    toolsMap[tool] = false;
  }
  if (Object.keys(toolsMap).length > 0) {
    lines.push('tools:');
    for (const [tool, allowed] of Object.entries(toolsMap)) {
      lines.push(`  ${tool}: ${allowed}`);
    }
  }

  lines.push('---');

  if (agentConfig.prompt) {
    lines.push('');
    lines.push(agentConfig.prompt);
  }

  return lines.join('\n');
}

/**
 * Materialize non-builtin agent definitions as `.opencode/agents/archon-*.md` files.
 * Built-in oh-my-opencode-slim agents (e.g. `explorer`, `oracle`) are already
 * registered via the SDK plugin and do not need file materialization.
 */
export async function materializeAgents(cwd: string, agents: NamedAgentConfig[]): Promise<void> {
  // Filter out built-in agents that are already registered by oh-my-opencode-slim
  const customAgents = agents.filter(a => !a.builtin);

  if (customAgents.length === 0) {
    getLog().debug({ cwd, totalAgents: agents.length }, 'opencode.no_custom_agents_to_materialize');
    return;
  }

  const agentsDir = join(cwd, '.opencode', 'agents');
  await mkdir(agentsDir, { recursive: true });

  // Remove stale archon-owned agent files that aren't in the current request
  const currentArchonFiles = new Set(customAgents.map(a => `archon-${toKebabCase(a.key)}.md`));
  try {
    const existing = await readdir(agentsDir);
    await Promise.all(
      existing
        .filter(f => f.startsWith('archon-') && !currentArchonFiles.has(f))
        .map(f => rm(join(agentsDir, f), { force: true }))
    );
  } catch (error) {
    // mkdir above already ensures the directory exists; other errors (e.g. permission
    // denied) are non-fatal for stale-file cleanup but worth surfacing for diagnostics.
    getLog().debug({ err: error, agentsDir }, 'opencode.agent_fs_readdir_failed');
  }

  // Write all custom agent files for this request
  await Promise.all(
    customAgents.map(agent => {
      const filename = `archon-${toKebabCase(agent.key)}.md`;
      const content = buildAgentFileContent(agent);
      return writeFile(join(agentsDir, filename), content, 'utf8');
    })
  );
}
