# Privacy Pools Deposit

## Purpose

Implement the deposit flow for Privacy Pools, covering ETH and ERC20 assets.

## Key Steps

1. **Read scope from the pool contract.** Call `pool.SCOPE()` to get the pool's `uint256` scope. This value identifies the pool in API headers and proof inputs.
2. **Derive deposit secrets.** Call `accountService.createDepositSecrets(scope, BigInt(existingAccountsForScope.length))`. The index is the number of existing pool accounts for this scope (0 for the first deposit, 1 for the second, etc.). Returns `{ precommitment, nullifier, secret }`.
3. **Check minimum deposit.** Query `Entrypoint.assetConfig(assetAddress)` for `minimumDepositAmount`. Reject deposits below this threshold.
4. **Approve token (ERC20 only).** Call `token.approve(entrypointAddress, amount)` before depositing. ETH deposits skip this step.
5. **Submit deposit.** Call `Entrypoint.deposit(precommitment)` with `{ value: amount }` for ETH, or `Entrypoint.deposit(assetAddress, amount, precommitment)` for ERC20.
6. **Parse the Deposited event.** Extract `label` and `committedValue` from the confirmed receipt. The `committedValue` is the post-vetting-fee amount.
7. **Persist pool account state.** Store the label, committedValue, nullifier, and secret in memory or encrypted storage. Never log these values or include them in error messages. Increment the deposit index for this scope.

## What to Persist

- `label`: uniquely identifies the commitment on-chain and in the ASP tree.
- `committedValue`: the actual balance available for withdrawal after vetting fee deduction.
- `nullifier` and `secret`: required to generate withdrawal or ragequit proofs.
- `depositIndex`: tracks the next available index for the mnemonic derivation path. Increment after each confirmed deposit.

## Important Details

- The vetting fee (`vettingFeeBPS`) is deducted on deposit. Always use the post-fee `committedValue`, not the raw `amount`.
- `PrecommitmentAlreadyUsed` means this precommitment was already submitted. Increment `depositIndex` and retry.
- If a deposit transaction reverts or is never mined, the precommitment is not consumed. Retry with the same index.
- Private withdrawal is only available after the ASP approves the deposit. Communicate indexing delay to the user.

## Docs

- [Deposit flow](/protocol/deposit)
- [SDK reference](/reference/sdk)
- [Error reference](/reference/errors)
- [Deployments](/deployments)
