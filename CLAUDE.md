# Privacy Pools Claude Code Guide

Privacy Pools is a smart-contract protocol for compliant private transactions on Ethereum. It uses zero-knowledge proofs and Association Set Providers (ASPs) to let users withdraw funds privately while proving their deposits are not associated with illicit activity.

Route all Privacy Pools tasks through the docs below.

## Key Docs

- Frontend integration guide: `docs/docs/build/integration.md`
- Agent and backend integration: `docs/docs/build/agents.md`
- Deployments and start blocks: `docs/docs/deployments.md`
- Skill library: `docs/docs/build/skills.md`

## Quick Start

- Getting started: https://docs.privacypools.com/build/start
- Agent workflows: https://docs.privacypools.com/build/agents
- Skill library: https://docs.privacypools.com/build/skills
- Deployments: https://docs.privacypools.com/deployments

## Recommended Read Order

1. Read `docs/docs/build/integration.md` for fast orientation.
2. Read the relevant protocol flow: `docs/docs/protocol/deposit.md`, `withdrawal.md`, or `ragequit.md`.
3. Pull addresses/startBlock from `docs/docs/deployments.md`.
4. Check API references in `docs/docs/reference/` as needed.

## Quick Task Router

- If the task is first-time protocol integration, start with `docs/docs/build/integration.md`.
- If the task needs API payloads or edge-case handling, check `docs/docs/reference/`.
- If the task needs chain addresses/start blocks, use `docs/docs/deployments.md`.
- If the task is about agent file behavior/discovery, use `docs/docs/build/agents.md`.

## Available Skills

- **privacy-pools-integration** -- End-to-end Privacy Pools integration planning  
  Skill file: `docs/static/agent-skills/privacy-pools-integration/SKILL.md`
- **privacy-pools-deposit** -- Deposit flow implementation for Privacy Pools  
  Skill file: `docs/static/agent-skills/privacy-pools-deposit/SKILL.md`
- **privacy-pools-withdraw** -- Relayed withdrawal implementation for Privacy Pools  
  Skill file: `docs/static/agent-skills/privacy-pools-withdraw/SKILL.md`
- **privacy-pools-ragequit** -- Ragequit (public exit) implementation for Privacy Pools  
  Skill file: `docs/static/agent-skills/privacy-pools-ragequit/SKILL.md`

## Workflow Rules

- Use relayed withdrawals as the standard app withdrawal path: `fastrelay.xyz` on production chains and `testnet-relayer.privacypools.com` on published testnets. Do not design normal frontend flows around direct withdrawal.
- If a task explicitly implements the advanced direct path, `PrivacyPool.withdraw()` requires `processooor == msg.sender`, so funds go to the signer. The relay path instead uses `Entrypoint.relay()` with `processooor = entrypointAddress` and recipient routing encoded in `withdrawal.data`.
- Frontends should use mnemonic-backed pool accounts reconstructed from on-chain events. This keeps secret-bearing notes out of copy/paste flows, clipboard surfaces, and other XSS-prone UI where raw secrets can be exposed.
- Only expose private withdrawal from approved non-zero pool accounts, and resolve plus validate the recipient before quote or proof generation.
- Request relayer quotes on the review step. If amount, recipient, relayer, or optional gas-token drop changes, or the quote expires, re-quote and require reconfirmation.
- Prefer wallet-signature seed derivation only when the wallet can reproduce the same EIP-712 signature for the same payload twice. Require a backup step. Otherwise fall back to manual mnemonic create/load and sanitize recovery phrase input.
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
