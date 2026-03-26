---
sidebar_label: Agent Setup
sidebar_position: 4
title: Agent Setup
slug: /build/agents
description: Entry points, skill files, and setup for developers using AI coding agents to build with Privacy Pools.
keywords: [privacy pools, agent, LLM, skills, automation, CLAUDE.md]
---

Use this page to set up an AI coding agent for Privacy Pools work. If the task is first-time integration, read [Start Here](/build/start) once before you move into the agent-specific surfaces. The recommended order is:

1. Read [Start Here](/build/start) for the builder path.
2. Read `AGENTS.md` or `CLAUDE.md` at the repo root.
3. Load the relevant [Skill Library](/build/skills) entry for the task.
4. Use [Frontend Integration](/build/integration) for the canonical implementation path.
5. Use [Deployments](/deployments) and `/reference/*` pages for exact values and schemas.

## Reference Table

| Resource | URL | Purpose |
|---|---|---|
| [Start Here](/build/start) | `/build/start` | The fastest path to a first working integration |
| [Skill Library](/build/skills) | `/build/skills` | Task-specific skill files for integration, deposit, withdrawal, and ragequit |
| [Frontend Integration](/build/integration) | `/build/integration` | Production integration guide and safety checks |
| [Deployments](/deployments) | `/deployments` | Chain-specific contract addresses and `startBlock` values |
| [llms.txt](https://docs.privacypools.com/llms.txt) | Hosted | Lightweight site index for crawlers and retrieval systems |
| [llms-full.txt](https://docs.privacypools.com/llms-full.txt) | Hosted | Complete LLM corpus with all docs pages |
| `CLAUDE.md` | Repo root | Claude Code guide for repo-specific workflows |
| `AGENTS.md` | Repo root | Build commands, security constraints, and repo structure for coding agents |

## Skill File Locations

The repo-local skill files live under `.agents/skills/`:

```
.agents/
  skills/
    privacy-pools-integration/
      SKILL.md
    privacy-pools-deposit/
      SKILL.md
    privacy-pools-withdraw/
      SKILL.md
    privacy-pools-ragequit/
      SKILL.md
```

## Circuit Initialization

For Node.js runtimes, initialize with `new Circuits({ browser: false })`. For browser environments, serve circuit artifacts from your app's public directory and initialize with `new Circuits({ baseUrl: window.location.origin })`. See [Frontend Integration](/build/integration) for the artifact setup steps.

## Agent-Specific Workflows

### Claude Code

Claude Code auto-discovers `CLAUDE.md` at the repository root. It routes the agent to:

1. The [Skill Library](/build/skills) for task-specific workflows.
2. [Frontend Integration](/build/integration) for SDK patterns and implementation details.
3. [Deployments](/deployments) for chain addresses and `startBlock` values.
4. Reference pages under `/reference/` for SDK details, API schemas, or exact constraints.

### Codex

Codex reads `AGENTS.md` at the repository root for build commands, repo structure, and security constraints. For protocol integration work:

1. Load the relevant skill from `.agents/skills/<name>/SKILL.md`.
2. Use [Frontend Integration](/build/integration) for SDK patterns and implementation details.
3. Use [Deployments](/deployments) for authoritative addresses and start blocks.

For user-scoped installation, Codex discovers skills under `$CODEX_HOME/skills` (default: `~/.codex/skills`). Run from the repository root:

```bash
for skill in privacy-pools-integration privacy-pools-deposit privacy-pools-withdraw privacy-pools-ragequit; do
  mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills/$skill"
  cp ".agents/skills/$skill/SKILL.md" "${CODEX_HOME:-$HOME/.codex}/skills/$skill/SKILL.md"
done
```

### Other LLM Tools

For agents that work from a single document, two corpus files are available:

- [`llms.txt`](https://docs.privacypools.com/llms.txt): lightweight site index with page titles and URLs. Good for quick orientation or retrieval-augmented pipelines that fetch pages on demand.
- [`llms-full.txt`](https://docs.privacypools.com/llms-full.txt): complete corpus with all docs pages (~20-25k tokens).

Individual skill files are mirrored in the repo under `.agents/skills/` and in the hosted site bundle under `docs/static/agent-skills/`.

Individual skill files can also be fetched directly by URL (e.g., `https://docs.privacypools.com/agent-skills/privacy-pools-deposit/SKILL.md`) without loading the full corpus.

IDE-based agents such as Cursor, Copilot, and Windsurf can discover skill files from the `.agents/skills/` directory at the repository root.
