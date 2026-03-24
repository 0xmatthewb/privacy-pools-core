# Privacy Pools Integration

## Purpose

Plan and implement an end-to-end Privacy Pools integration, covering deposit, withdrawal, ragequit, account management, and ASP interaction.

## Key Concepts

- **Relayed withdrawal is the standard path.** Use `https://fastrelay.xyz` on production chains and `https://testnet-relayer.privacypools.com` on published testnets via `Entrypoint.relay()`. Direct `PrivacyPool.withdraw()` is an advanced escape hatch, not a default UX.
- **Mnemonic-backed pool accounts.** Reconstruct pool accounts from on-chain events using a mnemonic seed. `AccountService.initializeWithEvents(...)` can also return `legacyAccount` for migration-aware restores. Never expose raw secrets in clipboard or copy/paste flows.
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
