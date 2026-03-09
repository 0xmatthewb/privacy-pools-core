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

- Use relayed withdrawals via `fastrelay.xyz` as the default frontend path because that is the privacy-preserving withdrawal path. Treat self-relay and direct withdrawal as advanced non-private options.
- Frontends should use mnemonic-backed pool accounts reconstructed from on-chain events rather than secret-bearing note copy/paste flows that expose secrets in clipboard or XSS-prone UI surfaces.
- Only expose private withdrawal from approved non-zero pool accounts, and resolve plus validate the recipient before quote or proof generation.
- Request relayer quotes on the review step. If amount, recipient, relayer, or optional gas-token drop changes, or the quote expires, re-quote and require reconfirmation.
- Prefer wallet-signature seed derivation only when the wallet can reproduce the same EIP-712 signature for the same payload; use `v2` for new accounts, keep `v1` for legacy restore only, and require a backup step before relying on it. Otherwise fall back to manual mnemonic create/load and sanitize recovery phrase input.
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
