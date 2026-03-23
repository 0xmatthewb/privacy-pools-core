> End-to-end Privacy Pools integration planning

## Read Order

1. https://docs.privacypools.com/build/integration (local: `docs/docs/build/integration.md`)
1. https://docs.privacypools.com/protocol/deposit (local: `docs/docs/protocol/deposit.md`)
1. https://docs.privacypools.com/protocol/withdrawal (local: `docs/docs/protocol/withdrawal.md`)
1. https://docs.privacypools.com/protocol/ragequit (local: `docs/docs/protocol/ragequit.md`)
1. https://docs.privacypools.com/deployments (local: `docs/docs/deployments.md`)

## Guardrails

- Use relayed withdrawals via fastrelay.xyz as the standard withdrawal path
- Never expose raw secrets in copy/paste flows
- Verify ASP root parity before proof submission
- Use deployment startBlock for event scans, not genesis

# Privacy Pools Integration

## Purpose

Plan and implement an end-to-end Privacy Pools integration, covering deposit, withdrawal, ragequit, account management, and ASP interaction.

## Key Concepts

- **Relayed withdrawal is the standard path.** All frontend withdrawal flows should use the relayer at `fastrelay.xyz` via `Entrypoint.relay()`. Direct `PrivacyPool.withdraw()` is an advanced escape hatch, not a default UX.
- **Mnemonic-backed pool accounts.** Reconstruct pool accounts from on-chain events using a mnemonic seed. Never expose raw secrets in clipboard or copy/paste flows.
- **ASP root parity.** Before generating a withdrawal proof, verify that the ASP root matches the on-chain value from `Entrypoint.latestRoot()`.
- **Post-fee accounting.** The `committedValue` from the `Deposited` event reflects the post-vetting-fee amount. Always use this value, not the raw deposit `amount`.

## Skill Scope

This skill covers high-level integration planning. For step-by-step implementation details, defer to the flow-specific skills:

- **Deposit flow** -- see `privacy-pools-deposit`
- **Withdrawal flow** -- see `privacy-pools-withdraw`
- **Ragequit flow** -- see `privacy-pools-ragequit`

## Safety Defaults

- Use deployment `startBlock` from `/deployments` for all event scans. Never scan from genesis.
- Use decimal `X-Pool-Scope` header values (`scope.toString()`), not hex.
- Validate recipient address before requesting a relayer quote or generating a proof.
- Only offer private withdrawal from pool accounts with `balance > 0` whose `label` is present in the current ASP leaves.

## Docs

- [Integration guide](/build/integration)
- [Deposit flow](/protocol/deposit)
- [Withdrawal flow](/protocol/withdrawal)
- [Ragequit flow](/protocol/ragequit)
- [Deployments](/deployments)
