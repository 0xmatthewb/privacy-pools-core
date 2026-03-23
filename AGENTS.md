# Privacy Pools -- Agent Entry Point

> This file helps AI agents discover the Privacy Pools documentation and skill library.
> Works with any agent: Cursor, Copilot, Codex, Claude Code, or custom tooling.

## Repo Structure

This is a monorepo with the following packages:

| Package | Path | Description |
|---------|------|-------------|
| circuits | `packages/circuits/` | ZK circuits (Circom) |
| contracts | `packages/contracts/` | Solidity smart contracts |
| sdk | `packages/sdk/` | TypeScript SDK (`@0xbow/privacy-pools-core-sdk`) |
| relayer | `packages/relayer/` | Relayer service |
| docs | `docs/` | Docusaurus documentation site |

## Quick Start

- Getting started: https://docs.privacypools.com/build/start (local: `docs/docs/build/start.md`)
- Agent workflows: https://docs.privacypools.com/build/agents (local: `docs/docs/build/agents.md`)
- Skill library: https://docs.privacypools.com/build/skills (local: `docs/docs/build/skills.md`)
- Deployments: https://docs.privacypools.com/deployments (local: `docs/docs/deployments.md`)
- Integration guide: https://docs.privacypools.com/build/integration (local: `docs/docs/build/integration.md`)

## How to Use Skills

Each skill is a self-contained markdown file with a read order, guardrails, and step-by-step instructions for a specific flow. To use a skill:

1. Pick the skill that matches your task from the list below.
2. Open its `SKILL.md` file.
3. Follow the read order to load prerequisite context.
4. Implement following the steps and guardrails in the file.

Skills live in two mirrored locations:
- `.agents/skills/<name>/SKILL.md` -- for IDE agents (Cursor, Copilot, etc.)
- `docs/static/agent-skills/<name>/SKILL.md` -- served on the docs site

## Available Skills

- **privacy-pools-integration** -- End-to-end Privacy Pools integration planning  
  Skill file: `.agents/skills/privacy-pools-integration/SKILL.md`
- **privacy-pools-deposit** -- Deposit flow implementation for Privacy Pools  
  Skill file: `.agents/skills/privacy-pools-deposit/SKILL.md`
- **privacy-pools-withdraw** -- Relayed withdrawal implementation for Privacy Pools  
  Skill file: `.agents/skills/privacy-pools-withdraw/SKILL.md`
- **privacy-pools-ragequit** -- Ragequit (public exit) implementation for Privacy Pools  
  Skill file: `.agents/skills/privacy-pools-ragequit/SKILL.md`

## Key Build Commands

```bash
yarn                                                  # install all deps
yarn workspace @0xbow/privacy-pools-core-sdk test      # SDK tests
yarn workspace @privacy-pool-core/contracts test       # contract tests
yarn workspace @privacy-pool-core/circuits test        # circuit tests
yarn workspace @privacy-pool-core/relayer test         # relayer tests
cd docs && yarn build                                  # build docs site
```

## Key Docs (local paths)

- Frontend integration: `docs/docs/build/integration.md`
- Protocol flows: `docs/docs/protocol/deposit.md`, `withdrawal.md`, `ragequit.md`
- API references: `docs/docs/reference/relayer-api.md`, `asp-api.md`, `sdk.md`
- Contract addresses: `docs/docs/deployments.md`
- Error codes: `docs/docs/reference/errors.md`

