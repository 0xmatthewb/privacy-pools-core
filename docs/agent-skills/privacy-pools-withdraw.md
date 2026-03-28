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
- Build withdrawal.data by ABI-encoding `(recipient, feeReceiverAddress, relayFeeBPS)` client-side. Do not use any pre-encoded blob from the quote response.
- Re-quote if amount, recipient, relayer, or gas-token changes
- Verify ASP root parity before submission
- Pad Merkle proof siblings to length 32 before passing to proveWithdrawal
- Refresh change commitment state after partial withdrawal
- Verify the proof locally with `sdk.verifyWithdrawal()` before submitting to the relayer

# Privacy Pools Withdrawal

## Purpose

Implement the relayed withdrawal flow for Privacy Pools. This is the privacy-preserving default path for all frontends.

## Key Steps

1. **Select pool account.** Choose a spendable account with `balance > 0` whose `label` is present in the current ASP leaves.
2. **Resolve recipient.** Validate the withdrawal recipient to a final address. Block unresolved ENS or invalid input.
3. **Fetch ASP data.** Retrieve ASP roots (`GET /{chainId}/public/mt-roots`) and leaves (`GET /{chainId}/public/mt-leaves`). Use the leaves as returned by the API for Merkle proof generation.
4. **Verify ASP root parity.** Confirm `BigInt(onchainMtRoot) === Entrypoint.latestRoot()` before proceeding.
5. **Request relayer quote.** Call `POST /relayer/quote` on the review step. The quote returns a signed `feeCommitment` valid for approximately 60 seconds. Also fetch the relayer's `feeReceiverAddress` from `GET /relayer/details`.
6. **Build withdrawal struct.** Set `processooor = entrypointAddress`. Build `withdrawal.data` by ABI-encoding `(recipient, relayerDetails.feeReceiverAddress, BigInt(quote.feeBPS))` using viem's `encodeAbiParameters`. Do not use any pre-encoded blob from the quote response. The proof `context` is derived from this finalized struct.
7. **Generate withdrawal proof.** Pad Merkle proof siblings to length 32 (circuit expects fixed depth). Pass the padded proofs, roots, context, withdrawal amount, and new secrets from `createWithdrawalSecrets(commitment)` to `sdk.proveWithdrawal()`.
8. **Verify proof locally.** Call `sdk.verifyWithdrawal(proof)` before submitting. This catches bad proofs before they hit the relayer.
9. **Submit via relayer.** Call `POST /relayer/request` before the quote expires. Use `https://fastrelay.xyz` on production chains and `https://testnet-relayer.privacypools.com` on published testnets.
10. **Update state.** Insert the change commitment back into the pool account tree. Re-fetch leaves before generating the next proof.

## Quote Lifecycle

- Request quotes as late as possible (review step).
- The `feeCommitment` expires in approximately 60 seconds.
- Re-quote if any of these change: amount, recipient, relayer, or gas-token selection.
- If the quote expires before submission, re-quote and require user reconfirmation.

## State Root vs ASP Root

- **State root:** Read directly from the pool contract's `currentRoot()`. Used in the state Merkle proof.
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
