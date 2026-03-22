---
sidebar_label: Agent & Backend Integration
sidebar_position: 3
title: Agent & Backend Integration
slug: /build/agents
---

# Agent & Backend Integration

Privacy Pools documents agent integrations through `skills-core.md`, `skills.md`, and tool-specific entry files. This page explains how autonomous agents and backend services can discover, read, and use these resources.

## Entry Points

| Resource | URL | Purpose |
|---|---|---|
| [skills-core.md](https://docs.privacypools.com/skills-core.md) | Hosted | Operational quickstart for agents and human+agent sessions |
| [skills.md](https://docs.privacypools.com/skills.md) | Hosted | Deep reference covering SDK, API schemas, types, and error handling |
| [llms.txt](https://docs.privacypools.com/llms.txt) | Hosted | Lightweight site index for crawlers and retrieval systems |
| [llms-full.txt](https://docs.privacypools.com/llms-full.txt) | Hosted | Complete LLM corpus; prepends `skills-core.md` + `skills.md`, fully self-contained |
| [Deployments](/deployments) | Hosted | Chain-specific contract addresses and `startBlock` values |
| [Frontend Integration](/build/integration) | Hosted | Production integration happy path and safety checks |

For systems that ingest a single document, use `llms-full.txt`. It includes `skills-core.md` and `skills.md` at the top, followed by all docs pages, so the highest-value content loads first.

## File Map

| File | Purpose | Audience |
|---|---|---|
| `skills-core.md` | Minimal operational rules; pair with the integration guide for the happy path | Agents, human+agent sessions |
| `skills.md` | Primary docs reference for SDK, API schemas, types, and error handling | Agents, engineers |
| [Frontend Integration](/build/integration) | Concise onboarding, frontend happy path, safety checks, and deep-reference links | Engineers, human+agent sessions |
| [Deployments](/deployments) | Authoritative chain-specific deployment data | All |
| `CLAUDE.md` | Claude Code config at the repo root; auto-loaded locally and routes to canonical docs | Claude Code |
| `AGENTS.md` | Repo-level guidance covering build commands, security constraints, and repo structure | Codex and similar coding agents |
| `.agents/skills/privacy-pools/SKILL.md` | Installable Codex skill | Codex skill users |

## Skill Library

The [Skill Library](/build/skills) provides task-specific skill files that agents can load for focused integration tasks: end-to-end planning, deposit implementation, relayed withdrawal, and ragequit.

## Agent-Specific Workflows

### Claude Code

Claude Code auto-discovers `CLAUDE.md` at the repository root. It routes the agent to:

1. [Frontend Integration](/build/integration) for the integration happy path.
2. `skills-core.md` for operational flows and safety rules.
3. `skills.md` for SDK details, API schemas, or edge cases.
4. [Deployments](/deployments) for chain addresses and `startBlock` values.

### Codex

Codex reads `AGENTS.md` at the repository root for build commands, repo structure, and security constraints. For protocol integration work:

1. Start with [Frontend Integration](/build/integration) for the integration happy path.
2. Refer to `skills-core.md` for the operational path.
3. Refer to `skills.md` for advanced implementation details.
4. Use [Deployments](/deployments) for authoritative addresses and start blocks.

In the repository, Codex can also read `.agents/skills/privacy-pools/SKILL.md`.

For user-scoped installation, Codex discovers skills under `$CODEX_HOME/skills` (default: `~/.codex/skills`):

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills/privacy-pools"
cp skills/privacy-pools/SKILL.md "${CODEX_HOME:-$HOME/.codex}/skills/privacy-pools/SKILL.md"
```

### Other LLM Tools

For systems that ingest a single document, use `llms-full.txt`. It includes `skills-core.md` and `skills.md` at the top, followed by all docs pages, so the highest-value content loads first.

## Skill Discovery Convention

The `.agents/skills/` directory at the repository root follows the emerging convention for agent-discoverable skill files. Each subdirectory contains a `SKILL.md` that an agent platform can read to understand what capabilities the project exposes.

```
.agents/
  skills/
    privacy-pools/
      SKILL.md        # end-to-end integration skill
```

Skill files are plain markdown with structured sections (purpose, instructions, references) that agents can parse without special tooling.

## Hosted References

| Resource | URL |
|---|---|
| Agent quickstart | https://docs.privacypools.com/skills-core.md |
| Deep reference | https://docs.privacypools.com/skills.md |
| Integration guide | https://docs.privacypools.com/build/integration |
| Deployments | https://docs.privacypools.com/deployments |
| Full LLM corpus | https://docs.privacypools.com/llms-full.txt |
| Site index | https://docs.privacypools.com/llms.txt |
