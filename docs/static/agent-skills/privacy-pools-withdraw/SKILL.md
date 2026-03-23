> Relayed withdrawal implementation for Privacy Pools

## Read Order

1. https://docs.privacypools.com/protocol/withdrawal (local: `docs/docs/protocol/withdrawal.md`)
1. https://docs.privacypools.com/reference/relayer-api (local: `docs/docs/reference/relayer-api.md`)
1. https://docs.privacypools.com/reference/asp-api (local: `docs/docs/reference/asp-api.md`)
1. https://docs.privacypools.com/reference/sdk (local: `docs/docs/reference/sdk.md`)
1. https://docs.privacypools.com/deployments (local: `docs/docs/deployments.md`)

## Guardrails

- Use Entrypoint.relay() with processooor = entrypointAddress
- Request relayer quote before proof generation
- Use the relayer quote's withdrawalData for withdrawal.data and proof context
- Re-quote if amount, recipient, relayer, or gas-token changes
- Verify ASP root parity before submission
- Refresh change commitment state after partial withdrawal

# Privacy Pools Withdrawal

## Purpose

Implement the relayed withdrawal flow for Privacy Pools. This is the privacy-preserving default path for all frontends.

## Key Steps

1. **Select pool account.** Choose a spendable account with `balance > 0` and `reviewStatus === APPROVED`.
2. **Resolve recipient.** Validate the withdrawal recipient to a final address. Block unresolved ENS or invalid input.
3. **Fetch ASP data.** Retrieve ASP roots (`GET /{chainId}/public/mt-roots`) and leaves (`GET /{chainId}/public/mt-leaves`).
4. **Verify ASP root parity.** Confirm `BigInt(onchainMtRoot) === Entrypoint.latestRoot()` before proceeding.
5. **Request relayer quote.** Call `POST /relayer/quote` on the review step. The quote returns a signed `feeCommitment` valid for approximately 60 seconds, along with `withdrawalData`.
6. **Generate withdrawal proof.** Build the withdrawal object with `processooor = entrypointAddress` and set `withdrawal.data` to the relayer quote's `withdrawalData`. The proof `context` is derived from this same `withdrawalData`. Generate the ZK proof.
7. **Submit via relayer.** Call `POST /relayer/request` before the quote expires. The relayer submits via `Entrypoint.relay()`.
8. **Verify and update state.** Confirm the transaction settled. Insert the change commitment back into the pool account tree.

## Quote Lifecycle

- Request quotes as late as possible (review step).
- The `feeCommitment` expires in approximately 60 seconds.
- Re-quote if any of these change: amount, recipient, relayer, or gas-token selection.
- If the quote expires before submission, re-quote and require user reconfirmation.

## State Root vs ASP Root

- **State root:** Read from `contracts.getStateRoot(poolAddress)` which calls `currentRoot()` on the pool contract. Used in the state Merkle proof.
- **ASP root:** Read from `Entrypoint.latestRoot()`. Must match `onchainMtRoot` from the ASP API. Used in the ASP Merkle proof.
- These are different roots from different trees. Do not mix them.

## After Partial Withdrawal

- A partial withdrawal creates a new change commitment on-chain.
- Refresh tree data before generating the next proof.
- Verify the remaining balance is zero or at least `minWithdrawAmount`.

## Docs

- [Withdrawal flow](/protocol/withdrawal)
- [Relayer API](/reference/relayer-api)
- [ASP API](/reference/asp-api)
- [SDK reference](/reference/sdk)
- [Error reference](/reference/errors)
- [Deployments](/deployments)
