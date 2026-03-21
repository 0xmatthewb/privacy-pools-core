# Privacy Pools — Standard Workflows

> Focused workflow reference for AI agents building Privacy Pools integrations.
> For full operational detail, see: https://docs.privacypools.com/skills.md
> For quickstart, see: https://docs.privacypools.com/skills-core.md

## Standard Relayed Withdrawal (Default Frontend Path)

This is the privacy-preserving withdrawal path. All frontend flows should use relayed withdrawals via `fastrelay.xyz`, not direct `PrivacyPool.withdraw()`.

### Steps

1. **Resolve recipient** — Validate the withdrawal recipient address before any proof generation.
2. **Check ASP root parity** — Verify the latest ASP root matches the on-chain value before generating proofs.
3. **Request relayer quote** — Call `POST https://fastrelay.xyz/relayer/quote` with withdrawal details. Re-quote if amount, recipient, relayer, or gas-token changes, or if the quote expires.
4. **Generate withdrawal proof** — Build `withdrawal.data` from the quote's `feeCommitment.withdrawalData`, then use `sdk.proveWithdrawal()` with the pool account's commitment data.
5. **User confirms** — Display the quote (fee, net amount, recipient) for user confirmation.
6. **Submit via Entrypoint.relay()** — The relayer calls `Entrypoint.relay()` with `processooor = entrypointAddress` and recipient routing encoded in `withdrawal.data`.
7. **Verify on-chain** — Confirm the withdrawal transaction settled.

### Key Rules

- `processooor` must be set to the Entrypoint contract address for relayed withdrawals.
- Recipient routing is encoded in `withdrawal.data`, not passed directly.
- Never expose the raw withdrawal note or secret in UI copy/paste flows.
- Always use `X-Pool-Scope` header with decimal values when calling pool APIs.

## Deposit Flow

1. **Generate secrets** — Create nullifier and secret using `sdk` crypto utilities.
2. **Compute precommitment** — Hash(nullifier, secret) to get the precommitment value.
3. **Approve (ERC20 only)** — Call `token.approve(entrypointAddress, amount)`.
4. **Call deposit** — `Entrypoint.deposit(token, amount, precommitment)` for ERC20 or `Entrypoint.deposit{value: amount}(ETH_ADDRESS, amount, precommitment)` for ETH.
5. **Track commitment** — Watch for `NewCommitment` event. Use `committedValue` (post-fee) from the event, not the deposit `amount`.

## Pool Account Recovery

- Use mnemonic-backed pool accounts reconstructed from on-chain events.
- Scan from the deployment `startBlock` (see https://docs.privacypools.com/deployments), not from genesis.
- Use `DataService` for event scanning — it requires no private key.
- `ContractInteractionsService` requires a private key for write operations.

## Ragequit (Emergency Exit)

- Only the original depositor (`depositors[_label] == msg.sender`) can ragequit.
- Ragequit is a public, non-private exit available at any time. Primarily used when the ASP has not approved a deposit.
- Requires a commitment proof via `sdk.proveCommitment()`.

## Deployments

See https://docs.privacypools.com/deployments for chain addresses and `startBlock` values.
