# Privacy Pools Claude Code Guide

Privacy Pools is a smart-contract protocol for compliant private transactions on EVM chains. It uses zero-knowledge proofs and Association Set Providers (ASPs) to let users withdraw funds privately while proving their deposits are not associated with illicit activity.

Route all Privacy Pools tasks through the docs below.

## Key Docs

- Getting started: `docs/docs/build/start.md`
- Frontend integration guide: `docs/docs/build/integration.md`
- Technical reference: `docs/docs/reference/index.md`
- Agent workflows: `docs/docs/build/agents.md`
- Deployments lookup: `docs/docs/deployments.md`
- Skill library: `docs/docs/build/skills.md`

## Quick Start

- Getting started: https://docs.privacypools.com/build/start
- Frontend integration guide: https://docs.privacypools.com/build/integration
- Agent workflows: https://docs.privacypools.com/build/agents
- Skill library: https://docs.privacypools.com/build/skills
- Deployments lookup: https://docs.privacypools.com/deployments

## Recommended Read Order

1. Read `docs/docs/build/start.md` for prerequisites, shared terminology, and the default builder path.
2. Read `docs/docs/build/integration.md` for the canonical SDK integration recipe.
3. Read the relevant protocol flow: `docs/docs/protocol/deposit.md`, `withdrawal.md`, or `ragequit.md`.
4. Check `docs/docs/reference/` when you need exact SDK, API, contract, or error details.
5. Pull addresses and `startBlock` from `docs/docs/deployments.md` when wiring a specific chain.

## Quick Task Router

- If the task is first-time protocol integration, start with `docs/docs/build/start.md`, then `docs/docs/build/integration.md`.
- If the task needs API payloads or edge-case handling, check `docs/docs/reference/`.
- If the task needs chain addresses or `startBlock`, use `docs/docs/deployments.md`.
- If the task is about agent file behavior/discovery, use `docs/docs/build/agents.md`.

## Available Skills

- **privacy-pools-integration**: End-to-end Privacy Pools integration planning  
  Skill file: `.agents/skills/privacy-pools-integration/SKILL.md`
- **privacy-pools-deposit**: Deposit flow implementation for Privacy Pools  
  Skill file: `.agents/skills/privacy-pools-deposit/SKILL.md`
- **privacy-pools-withdraw**: Relayed withdrawal implementation for Privacy Pools  
  Skill file: `.agents/skills/privacy-pools-withdraw/SKILL.md`
- **privacy-pools-ragequit**: Ragequit (public exit) implementation for Privacy Pools  
  Skill file: `.agents/skills/privacy-pools-ragequit/SKILL.md`

## Workflow Rules

- Use relayed withdrawals as the only user-facing withdrawal path: `fastrelay.xyz` on production chains and `testnet-relayer.privacypools.com` on published testnets.
- Treat direct `PrivacyPool.withdraw()` as contract-level behavior, not frontend UX.
- Frontends should use mnemonic-backed pool accounts reconstructed from on-chain events. If `AccountService.initializeWithEvents(...)` returns `legacyAccount`, keep it during restores for migrated users. Never expose deposit secrets, nullifiers, or raw note material in clipboard or copy/paste flows.
- Only expose private withdrawal from approved non-zero pool accounts, and resolve plus validate the recipient before quote or proof generation.
- Request relayer quotes on the review step. If amount, recipient, relayer, or optional gas-token drop changes, or the quote expires, re-quote and require reconfirmation.
- Prefer wallet-signature seed derivation only when the wallet can reproduce the same EIP-712 signature for the same payload twice. Otherwise use manual mnemonic onboarding, require the recovery phrase to be saved before continuing, and sanitize recovery phrase input.
- Always verify ASP root parity before withdrawal proof submission.
- For `DataService` event scans, always use the deployment `startBlock` from `docs/docs/deployments.md`; do not scan from genesis.
- Always use decimal `X-Pool-Scope` header values.
- Never modify files under `audit/`.

## Build and Test

```bash
yarn
yarn workspace @0xbow/privacy-pools-core-sdk test
yarn workspace @privacy-pool-core/contracts test
yarn workspace @privacy-pool-core/circuits test
yarn workspace @privacy-pool-core/relayer test
cd docs && yarn build
```
