---
sidebar_label: Agent & Backend Integration
sidebar_position: 3
title: Agent & Backend Integration
slug: /build/agents
description: Discovery and usage guide for autonomous agents and backend services integrating with Privacy Pools.
keywords: [privacy pools, agent, backend, LLM, skills, automation, CLAUDE.md]
---

# Agent & Backend Integration

Privacy Pools provides structured entry points for autonomous agents and backend services. This page explains how to discover and use them.

## Reference Table

| Resource | URL | Purpose |
|---|---|---|
| [Skill Library](/build/skills) | `/build/skills` | Task-specific skill files for integration, deposit, withdrawal, and ragequit |
| [Frontend Integration](/build/integration) | `/build/integration` | Production integration happy path and safety checks |
| [Deployments](/deployments) | `/deployments` | Chain-specific contract addresses and `startBlock` values |
| [llms.txt](https://docs.privacypools.com/llms.txt) | Hosted | Lightweight site index for crawlers and retrieval systems |
| [llms-full.txt](https://docs.privacypools.com/llms-full.txt) | Hosted | Complete LLM corpus with all docs pages; highest-value content loads first |
| `CLAUDE.md` | Repo root | Claude Code config; auto-loaded locally, routes to canonical docs |
| `AGENTS.md` | Repo root | Build commands, security constraints, and repo structure for coding agents |

## Skill Library

The [Skill Library](/build/skills) provides four task-specific skill files that agents can load for focused work:

| Skill | Hosted URL | Purpose |
|---|---|---|
| `privacy-pools-integration` | [`/agent-skills/privacy-pools-integration/SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-integration/SKILL.md) | End-to-end integration planning |
| `privacy-pools-deposit` | [`/agent-skills/privacy-pools-deposit/SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-deposit/SKILL.md) | Deposit flow implementation |
| `privacy-pools-withdraw` | [`/agent-skills/privacy-pools-withdraw/SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-withdraw/SKILL.md) | Relayed withdrawal implementation |
| `privacy-pools-ragequit` | [`/agent-skills/privacy-pools-ragequit/SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-ragequit/SKILL.md) | Ragequit (public exit) implementation |

Each skill is a self-contained markdown document with structured sections (purpose, instructions, references) that agents can parse without special tooling.

## Skill Discovery Convention

The `.agents/skills/` directory at the repository root follows the emerging convention for agent-discoverable skill files:

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

The same skill files are hosted at `https://docs.privacypools.com/agent-skills/<name>/SKILL.md`.

## Agent-Specific Workflows

### Claude Code

Claude Code auto-discovers `CLAUDE.md` at the repository root. It routes the agent to:

1. [Frontend Integration](/build/integration) for the integration happy path.
2. The [Skill Library](/build/skills) for task-specific workflows.
3. [Deployments](/deployments) for chain addresses and `startBlock` values.
4. Reference pages under `/reference/` for SDK details, API schemas, or edge cases.

### Codex

Codex reads `AGENTS.md` at the repository root for build commands, repo structure, and security constraints. For protocol integration work:

1. Start with [Frontend Integration](/build/integration) for the integration happy path.
2. Load the relevant skill from `.agents/skills/<name>/SKILL.md`.
3. Use [Deployments](/deployments) for authoritative addresses and start blocks.

For user-scoped installation, Codex discovers skills under `$CODEX_HOME/skills` (default: `~/.codex/skills`):

```bash
for skill in privacy-pools-integration privacy-pools-deposit privacy-pools-withdraw privacy-pools-ragequit; do
  mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills/$skill"
  cp ".agents/skills/$skill/SKILL.md" "${CODEX_HOME:-$HOME/.codex}/skills/$skill/SKILL.md"
done
```

### Other LLM Tools

For systems that ingest a single document, use [`llms-full.txt`](https://docs.privacypools.com/llms-full.txt). It includes all docs pages with the highest-value content first.
