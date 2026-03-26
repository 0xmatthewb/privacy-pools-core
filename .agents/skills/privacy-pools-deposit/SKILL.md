> Deposit flow implementation for Privacy Pools

## Read Order

1. https://docs.privacypools.com/protocol/deposit (local: `docs/docs/protocol/deposit.md`)
1. https://docs.privacypools.com/reference/sdk (local: `docs/docs/reference/sdk.md`)
1. https://docs.privacypools.com/deployments (local: `docs/docs/deployments.md`)

## Guardrails

- Check minimum deposit amount before submitting
- Persist label and committedValue from Deposited event
- Use post-fee committedValue, not raw deposit amount
- Use deployment startBlock for event scans

# Privacy Pools Deposit

## Purpose

Implement the deposit flow for Privacy Pools, covering ETH and ERC20 assets.

## Key Steps

1. **Set up account.** Create or load a mnemonic-backed pool account. Derive deposit secrets from mnemonic, scope, and depositIndex. If account recovery returns `legacyAccount`, keep it during restores for migrated users.
2. **Compute precommitment.** Hash the nullifier and secret to produce the precommitment value.
3. **Check minimum deposit.** Query `getAssetConfig` for `minimumDepositAmount`. Reject deposits below this threshold.
4. **Approve token (ERC20 only).** Call `token.approve(entrypointAddress, amount)` before depositing ERC20 assets.
5. **Submit deposit.** Call `depositETH` (with value) or `depositERC20` via the Entrypoint contract.
6. **Parse the Deposited event.** Extract `label` and `committedValue` from the event. The `committedValue` is the post-vetting-fee amount.
7. **Persist pool account state.** Store the label, committedValue, nullifier, and secret locally. Reconstruct the commitment from these values.

## What to Persist

- `label`: uniquely identifies the commitment on-chain and in the ASP tree.
- `committedValue`: the actual balance available for withdrawal after vetting fee deduction.
- `nullifier` and `secret`: required to generate withdrawal or ragequit proofs.
- `depositIndex`: tracks the next available index for the mnemonic derivation path.

## Important Details

- The vetting fee (`vettingFeeBPS`) is deducted on deposit. Always use the post-fee `committedValue`, not the raw `amount`.
- `PrecommitmentAlreadyUsed` means this precommitment was already submitted. Increment `depositIndex` and retry.
- Private withdrawal is only available after the ASP approves the deposit. Communicate indexing delay to the user.

## Docs

- [Deposit flow](/protocol/deposit)
- [SDK reference](/reference/sdk)
- [Error reference](/reference/errors)
- [Deployments](/deployments)
