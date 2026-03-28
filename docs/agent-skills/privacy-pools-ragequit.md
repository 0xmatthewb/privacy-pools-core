# Privacy Pools Ragequit

## Purpose

Implement the ragequit (public exit) flow for Privacy Pools. Ragequit allows a depositor to reclaim funds without ASP approval. It returns the full committed value (post-fee) to the original deposit address.

## When to Use

- The ASP has not approved the deposit (or has removed the label).
- The user wants a public exit back to the original depositor address.
- The user explicitly prefers a public, non-private exit.

## Key Steps

1. **Generate commitment proof.** Call `sdk.proveCommitment(value, label, nullifier, secret)` with the commitment's fields. This produces a Groth16 proof and 4 public signals (`commitmentHash`, `nullifierHash`, `value`, `label`). No ASP data or Merkle proofs are needed.
2. **Submit ragequit on-chain.** Call `PrivacyPool.ragequit(proof)` directly on the pool contract (not the Entrypoint). The connected wallet must be the original depositor. If using the raw contract ABI, swap the `pi_b` coordinates (`[0][1]/[0][0]` and `[1][1]/[1][0]`) before submission. The SDK's `contracts.ragequit(commitmentProof, privacyPoolAddress)` handles this internally.
3. **Wait for confirmation and update state.** Parse the `Ragequit` event from the receipt. Mark the commitment as spent in local account state via `addRagequitToAccount`.

## Restrictions

- **Original depositor only.** The contract enforces `depositors[_label] == msg.sender`. Only the address that made the original deposit can ragequit that commitment. Other addresses revert with `OnlyOriginalDepositor`.
- **Mutual exclusivity.** A commitment that has been ragequit cannot later be privately withdrawn, and vice versa. Both operations spend the nullifier (`NullifierAlreadySpent`).
- **Public exit.** Ragequit is fully on-chain. The deposit and exit are linked publicly. Warn the user.
- **No ASP prerequisite.** Ragequit does not check the ASP tree. It is unconditionally available to the original depositor.
- **Gas.** The user pays gas directly since there is no relayer. Account for this in UX.

## UX Guidance

- Clearly label ragequit as a public exit distinct from private withdrawal.
- Warn the user that privacy is forfeited when using ragequit.
- Only show ragequit for commitments that belong to the connected wallet address.
- If the user has a `legacyAccount` from `initializeWithEvents`, use it for ragequit of legacy deposits.

## Docs

- [Ragequit flow](/protocol/ragequit)
- [SDK reference](/reference/sdk)
- [Error reference](/reference/errors)
- [Deployments](/deployments)
