---
sidebar_label: Agent Setup
sidebar_position: 4
title: Agent Setup
slug: /build/agents
description: Entry points, skill files, and setup for AI coding agents integrating with Privacy Pools.
keywords: [privacy pools, agent, LLM, skills, automation, CLAUDE.md]
---

This page helps AI coding agents and LLM-powered tools get set up for Privacy Pools integration work. It covers skill file discovery, circuit initialization, and tool-specific configuration for Claude Code, Codex, and other IDEs.

## Reference Table

| Resource | URL | Purpose |
|---|---|---|
| [Skill Library](/build/skills) | `/build/skills` | Task-specific skill files for integration, deposit, withdrawal, and ragequit |
| [Frontend Integration](/build/integration) | `/build/integration` | Production integration guide and safety checks |
| [Deployments](/deployments) | `/deployments` | Chain-specific contract addresses and `startBlock` values |
| [llms.txt](https://docs.privacypools.com/llms.txt) | Hosted | Lightweight site index for crawlers and retrieval systems |
| [llms-full.txt](https://docs.privacypools.com/llms-full.txt) | Hosted | Complete LLM corpus with all docs pages |
| `CLAUDE.md` | Repo root | Claude Code guide for repo-specific workflows |
| `AGENTS.md` | Repo root | Build commands, security constraints, and repo structure for coding agents |

## Skill Library

The [Skill Library](/build/skills) provides four task-specific skill files that agents can load for focused work:

| Skill | Purpose | Hosted URL |
|---|---|---|
| `privacy-pools-integration` | End-to-end integration planning and architecture | [`SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-integration/SKILL.md) |
| `privacy-pools-deposit` | Deposit flow implementation | [`SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-deposit/SKILL.md) |
| `privacy-pools-withdraw` | Relayed withdrawal implementation | [`SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-withdraw/SKILL.md) |
| `privacy-pools-ragequit` | Ragequit (public exit) implementation | [`SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-ragequit/SKILL.md) |

Each skill is a markdown file with task-specific instructions and references.

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

The skill files exist in two places with identical content. `.agents/skills/` is for IDE agents that scan the repo locally. `docs/static/agent-skills/` is the source for the hosted URLs above.

## Circuit Initialization

For Node.js runtimes, initialize with `new Circuits({ browser: false })`. For browser environments, serve circuit artifacts from your app's public directory and initialize with `new Circuits({ baseUrl: window.location.origin })`. See [Frontend Integration](/build/integration) for the artifact setup steps.

## Agent-Specific Workflows

### Claude Code

Claude Code auto-discovers `CLAUDE.md` at the repository root. It routes the agent to:

1. The [Skill Library](/build/skills) for task-specific workflows.
2. [Frontend Integration](/build/integration) for SDK patterns and implementation details.
3. [Deployments](/deployments) for chain addresses and `startBlock` values.
4. Reference pages under `/reference/` for SDK details, API schemas, or edge cases.

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

For agents that ingest a single document, two corpus files are available:

- [`llms.txt`](https://docs.privacypools.com/llms.txt): lightweight site index with page titles and URLs. Good for quick orientation or retrieval-augmented pipelines that fetch pages on demand.
- [`llms-full.txt`](https://docs.privacypools.com/llms-full.txt): complete corpus with all docs pages inlined (~16k words / ~20-25k tokens). Best when the agent can consume the full context in one pass. If your agent has a smaller context window, use `llms.txt` and fetch individual pages on demand.

Individual skill files can also be fetched directly by URL (e.g., `https://docs.privacypools.com/agent-skills/privacy-pools-deposit/SKILL.md`) without loading the full corpus.

IDE-based agents such as Cursor, Copilot, and Windsurf can discover skill files from the `.agents/skills/` directory at the repository root.
