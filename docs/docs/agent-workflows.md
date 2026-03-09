---
title: Agent Workflows
description: How Privacy Pools documentation is structured for autonomous agents and human+agent workflows.
keywords:
  - ai agents
  - autonomous agents
  - codex
  - claude code
  - llms
  - skills
---

# Agent Workflows

Privacy Pools documents agent integrations through `skills-core.md`, `skills.md`, and tool-specific entry files.

## File Map

| File | Purpose | Audience | Notes |
|---|---|---|---|
| [skills-core.md](https://docs.privacypools.com/skills-core.md) | Operational quickstart | Agents, human+agent sessions | Start here; covers all flows with minimal context |
| [skills.md](https://docs.privacypools.com/skills.md) | Deep reference | Agents + engineers | Primary docs reference for SDK, API schemas, types, and error handling |
| [integrations.md](/protocol/integrations) | Human-facing production integration path | Engineers, human+agent sessions | Concise onboarding + safety checks + deep-reference links |
| [deployments.md](/deployments) | Contract addresses and start blocks | All | Authoritative chain-specific deployment data |
| [CLAUDE.md](https://github.com/0xbow-io/privacy-pools-core/blob/main/CLAUDE.md) | Claude Code config | Claude Code | Auto-loaded at repo root; routes to canonical docs |
| [AGENTS.md](https://github.com/0xbow-io/privacy-pools-core/blob/main/AGENTS.md) | Repo-level guidance | Codex and similar coding agents | Build/test commands, security constraints, repo structure |
| [SKILL.md](https://github.com/0xbow-io/privacy-pools-core/blob/main/skills/privacy-pools/SKILL.md) | Installable Codex skill | Codex skill users | Source file: `skills/privacy-pools/SKILL.md`; repo mirror: `.agents/skills/privacy-pools/SKILL.md` |
| [llms.txt](https://docs.privacypools.com/llms.txt) | Lightweight site index | Crawlers, retrieval systems | Auto-generated at build; discovery and routing |
| [llms-full.txt](https://docs.privacypools.com/llms-full.txt) | Complete LLM corpus | Retrieval systems | Prepends `skills-core.md` + `skills.md`; fully self-contained |

## How To Use

Hosted links are in the [File Map](#file-map) above. The paths below are local repo paths used in editor and agent workflows.

### Claude Code

Claude Code auto-discovers `CLAUDE.md` at the repository root — no setup needed. It routes the agent to:

1. `docs/static/skills-core.md` — read first for operational flows and safety rules.
2. `docs/static/skills.md` — read relevant sections for SDK details, API schemas, or edge cases.
3. `docs/docs/deployments.md` — pull chain addresses and `startBlock` values.

### Codex

Codex reads `AGENTS.md` at the repository root for build commands, repo structure, and security constraints. For protocol integration work:

1. Start with `docs/static/skills-core.md` for the operational path.
2. Refer to `docs/static/skills.md` for advanced implementation details.
3. Use `docs/docs/deployments.md` for authoritative addresses and start blocks.

In this repository, Codex can also read `.agents/skills/privacy-pools/SKILL.md`.

For user-scoped installation, Codex discovers skills under `$CODEX_HOME/skills` (default: `~/.codex/skills`):

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills/privacy-pools"
cp skills/privacy-pools/SKILL.md "${CODEX_HOME:-$HOME/.codex}/skills/privacy-pools/SKILL.md"
```

### Other LLM Tools

For systems that ingest a single document, use `llms-full.txt`. It includes `skills-core.md` and `skills.md` at the top, followed by all docs pages, so the highest-value content loads first.

## Hosted References

| Resource | URL |
|---|---|
| Agent quickstart | https://docs.privacypools.com/skills-core.md |
| Deep reference | https://docs.privacypools.com/skills.md |
| Integration guide | https://docs.privacypools.com/protocol/integrations |
| Deployments | https://docs.privacypools.com/deployments |
| Full LLM corpus | https://docs.privacypools.com/llms-full.txt |
| Site index | https://docs.privacypools.com/llms.txt |
