# Privacy Pools Claude Code Guide

Route all Privacy Pools tasks through the docs below.

## Key Docs

- Integrator-friendly onboarding + frontend patterns: `docs/docs/protocol/integrations.md`
- Primary operational quickstart: `docs/static/skills-core.md`
- Deep reference: `docs/static/skills.md`
- Deployments and start blocks: `docs/docs/deployments.md`
- Agent file map and usage: `docs/docs/agent-workflows.md`

## Recommended Read Order

1. Read `docs/docs/protocol/integrations.md` for fast orientation.
2. Read `docs/static/skills-core.md`.
3. Read only the relevant section(s) in `docs/static/skills.md`.
4. Pull addresses/startBlock from `docs/docs/deployments.md`.

## Quick Task Router

- If the task is first-time protocol integration, start with `docs/docs/protocol/integrations.md`.
- If the task needs exact SDK/API payloads or edge-case handling, use `docs/static/skills.md`.
- If the task needs chain addresses/start blocks, use `docs/docs/deployments.md`.
- If the task is about agent file behavior/discovery, use `docs/docs/agent-workflows.md`.

## Workflow Rules

- Use relayed withdrawals via `fastrelay.xyz` as the default frontend path because that is the privacy-preserving withdrawal path. Treat direct withdrawal as an advanced non-private option.
- Direct `PrivacyPool.withdraw()` requires `processooor == msg.sender`, so funds go to the signer. The relay path instead uses `Entrypoint.relay()` with `processooor = entrypointAddress` and recipient routing encoded in `withdrawal.data`.
- Frontends should use mnemonic-backed pool accounts reconstructed from on-chain events. This keeps secret-bearing notes out of copy/paste flows, clipboard surfaces, and other XSS-prone UI where raw secrets can be exposed.
- Only expose private withdrawal from approved non-zero pool accounts, and resolve plus validate the recipient before quote or proof generation.
- Request relayer quotes on the review step. If amount, recipient, relayer, or optional gas-token drop changes, or the quote expires, re-quote and require reconfirmation.
- Prefer wallet-signature seed derivation only when the wallet can reproduce the same EIP-712 signature for the same payload twice. Require a backup step, use the current derivation flow for new accounts, and only expose any older restore path for existing legacy accounts. Otherwise fall back to manual mnemonic create/load and sanitize recovery phrase input.
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
