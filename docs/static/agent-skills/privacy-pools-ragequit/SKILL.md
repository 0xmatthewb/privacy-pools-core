> Ragequit (public exit) implementation for Privacy Pools

## Read Order

1. https://docs.privacypools.com/protocol/ragequit
1. https://docs.privacypools.com/reference/sdk
1. https://docs.privacypools.com/deployments

## Guardrails

- Ragequit is unconditionally available — no ASP prerequisite
- Only the original depositor can ragequit a commitment
- A ragequit commitment cannot later be privately withdrawn
- Ragequit is a public on-chain exit — no privacy

# Privacy Pools Ragequit

## Purpose

Implement the ragequit (public exit) flow for Privacy Pools. Ragequit allows a depositor to reclaim funds without ASP approval.

## When to Use

- The ASP has not approved the deposit (or has removed the label).
- The user needs an emergency exit from the pool.
- The user explicitly prefers a public, non-private exit.

## Key Steps

1. **Generate commitment proof.** Use `sdk.proveCommitment()` with the commitment data for the target pool account.
2. **Call ragequit.** Submit `contracts.ragequit(commitmentProof, privacyPoolAddress)`.
3. **Handle the on-chain event.** Confirm the transaction settled and update local state to reflect the spent nullifier.

## Restrictions

- **Original depositor only.** The contract enforces `depositors[_label] == msg.sender`. Only the address that made the original deposit can ragequit that commitment.
- **Mutual exclusivity.** A commitment that has been ragequit cannot later be privately withdrawn, and vice versa. The nullifier is spent in both cases (`NullifierAlreadySpent`).
- **Public exit.** Ragequit is fully on-chain and non-private. Warn the user that this links their deposit and withdrawal addresses publicly.
- **No ASP prerequisite.** Ragequit does not require ASP approval. It is unconditionally available to the original depositor.

## UX Guidance

- Clearly label ragequit as a public exit distinct from private withdrawal.
- Warn the user that privacy is forfeited when using ragequit.
- Only show ragequit for commitments that belong to the connected wallet address.

## Docs

- [Ragequit flow](/protocol/ragequit)
- [SDK reference](/reference/sdk)
- [Error reference](/reference/errors)
- [Deployments](/deployments)
