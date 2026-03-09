---
title: Integrations
description: "Production integration guide for Privacy Pools with recommended account, deposit, withdrawal, and fallback patterns."
keywords:
  - privacy pools
  - integrations
  - sdk integration
  - relayer
  - asp api
  - production guide
  - fastrelay
  - developer workflow
---

This page covers the production integration path for Privacy Pools. It is the shortest route from first integration to a working frontend.

## Key References

1. [Deployments](/deployments): chain-specific addresses and `startBlock`
2. [SDK Utilities](/reference/sdk): SDK types and functions
3. [Deposit](/protocol/deposit), [Withdrawal](/protocol/withdrawal), [Ragequit](/protocol/ragequit): protocol behavior
4. [skills.md](https://docs.privacypools.com/skills.md): single-document reference covering all endpoints, schemas, and edge cases

## Happy Path

1. Bootstrap a mnemonic-backed account before the user can deposit or withdraw.
2. If wallet onboarding is supported, derive the recovery seed from deterministic EIP-712 signatures only when the wallet can reproduce the same payload signature twice, and require a backup step. Only expose any older restore path when restoring an existing legacy account. If the wallet path cannot guarantee deterministic signing, fall back to manual mnemonic create/load.
3. Derive deposit secrets from the recovery account, validate `minimumDepositAmount`, submit the deposit, and persist the confirmed `Deposited` `label` plus post-fee `value` into pool-account state.
4. Reconstruct balances as pool accounts and refresh review state across all loaded chain/scope pairs. Treat deposits as pending until both the review status and current ASP leaves agree.
5. Build withdrawal proofs with two roots: `contracts.getStateRoot(poolAddress)` for the pool state root and ASP `onchainMtRoot` for the ASP root. Require exact parity between `onchainMtRoot` and `Entrypoint.latestRoot()`.
6. Default the UI to relayed withdrawals using `https://fastrelay.xyz` on production chains and `https://testnet-relayer.privacypools.com` on testnets. This is the private withdrawal path.
7. Only enable private withdrawal when a relayer is available and the selected pool account has positive balance plus ASP approval.
8. Resolve the final recipient before review, fetch relayer details plus `minWithdrawAmount`, and request the relayer quote on the review step. Discard the quote whenever amount, recipient, relayer, or optional gas-token-drop settings change.
9. Treat self-relay and direct withdrawal as advanced non-private options rather than the default private-withdraw button.
10. Keep ragequit separate and clearly public.

## Frontend Defaults

- Track each deposit and each post-withdrawal change commitment inside the same pool-account tree.
- Refresh deposit review state across every loaded chain/scope combination after account load. If a deposit reports `APPROVED` but its label is not yet present in the current ASP leaves, continue treating it as pending until the leaf arrives.
- Disable withdraw CTAs unless wallet is connected, account state is loaded, at least one relayer is available, and there is at least one approved non-zero pool account.
- Filter withdraw selectors to approved non-zero accounts for the active chain/scope and pick a sensible default account automatically.
- Parse confirmed receipts and persist them in pool-account state. Pool-account state keeps secret-bearing notes out of copy/paste flows, clipboard surfaces, and other XSS-prone UI where raw secrets can be exposed.
- Gate wallet-signature derivation by wallet capability; many smart/contract wallets should use manual mnemonic onboarding instead.
- After a successful private withdrawal, insert the new change commitment back into local account state before allowing another spend.
- Do not log recovery phrases, signatures, nullifiers, secrets, or raw note material to analytics or error tracking.
- Handle wallet rejections and user cancellations gracefully without retry loops or error telemetry.

## Recommended UX Details

### Account and Recovery

- Prefer wallet-signature seed derivation only when the wallet can reproduce the same EIP-712 signature for the same payload. Feature-detect this at runtime based on wallet capability.
- Use the current derivation flow for new accounts, compare two signatures of the same payload before deriving, and require recovery-phrase backup before continuing. Only expose any older restore path when restoring an existing legacy account.
- If you support manual recovery input, normalize whitespace, commas, and newlines before checksum validation.

### Deposit UX

- If you expose `Use max`, reserve gas for native-asset deposits and account for vetting-fee math before populating the amount field.
- If the wallet supports batching, collapsing approval + deposit into one action is a good upgrade. The same pattern can extend to stake-then-deposit flows for alternative input tokens as long as the final deposited asset and expected amount are explicit in the review UI.
- Parse the confirmed `Deposited` event immediately and store the resulting pool account locally rather than waiting for a later rescan.
- Tell the user that confirmed deposits may take time to appear in activity views or become ASP-approved.

### Private Withdrawal UX

- Resolve ENS names to a final address before the review step, using mainnet (`chainId = 1`) resolution. Displaying reverse ENS alongside the resolved address is helpful. Unresolved input must block submit.
- Fetch `GET /relayer/details` early enough to validate `minWithdrawAmount`. If a partial withdrawal would leave a non-zero remainder below that minimum, warn clearly and offer: withdraw less, withdraw max, or leave the remainder for a later public exit.
- `GET /{chainId}/public/deposits-larger-than` is useful for showing an anonymity-set estimate while the user edits the amount.
- `POST /relayer/quote` without `recipient` is useful earlier in the form for fee estimation only. Request the signed `feeCommitment` only after the final recipient is known on review.
- Request the relayer quote only when the review screen opens, keep a visible countdown, and if the quote refreshes because inputs changed or time elapsed, require the user to confirm again.
- Treat `extraGas` as an optional gas-token drop for supported non-native assets. Quote invalidation and fee display must include it.
- If proof generation takes noticeable time, surface progress phases such as `loading_circuits`, `generating_proof`, and `verifying_proof`.

### Ragequit UX

- Keep ragequit on its own action path with a clear warning that it is a public exit.
- Ragequit returns the full balance to the original depositor address. It does not send funds to a separate recipient.

## API Hosts

| Service | Network scope | Base URL |
|---|---|---|
| ASP API | Production EVM chains | `https://api.0xbow.io` |
| ASP API | Published testnets | `https://dw.0xbow.io` |
| Relayer API | Production EVM chains | `https://fastrelay.xyz` |
| Relayer API | Published testnets | `https://testnet-relayer.privacypools.com` |

ASP API docs: `https://api.0xbow.io/api-docs`

`request.0xbow.io` is a partner-only host and does not serve public `mt-roots` / `mt-leaves` endpoints.
For public ASP reads, use `api.0xbow.io` (mainnet chains) or `dw.0xbow.io` (testnet chains).

OpenAPI/Swagger schemas may lag live responses. For concrete response shapes, use [skills.md](https://docs.privacypools.com/skills.md).

## Critical API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /{chainId}/public/mt-roots` | Fetch ASP `mtRoot` and `onchainMtRoot` (requires decimal `X-Pool-Scope`) |
| `GET /{chainId}/public/mt-leaves` | Fetch ASP labels and state tree leaves for proof construction (requires decimal `X-Pool-Scope`) |
| `POST /relayer/quote` | Get relay fee quote and signed `feeCommitment` |
| `GET /relayer/details` | Fetch relayer config (`feeReceiverAddress`, fee bounds, asset support) |
| `POST /relayer/request` | Submit relayed withdrawal before quote expiry |

## Required Safety Checks

- `X-Pool-Scope` must be a decimal bigint string.
- `stateRoot` should come from `contracts.getStateRoot(poolAddress)` / pool `currentRoot()`, not from `Entrypoint.latestRoot()`.
- `onchainMtRoot` must equal `Entrypoint.latestRoot()` exactly before proof generation/submission.
- When reconstructing state from events, initialize `DataService` with the deployment `startBlock` and use direct RPC.
- `withdrawalAmount` must be `> 0` and `<=` commitment value.
- Check `minimumDepositAmount` before submitting deposit transactions.
- For direct withdrawal, `withdrawal.processooor` must equal `msg.sender`.
- Relayer `feeCommitment` has a short TTL (~60s); quote and request should be near-contiguous, and quote invalidation should be tied to form changes.
- After partial withdrawals, refresh leaves before generating the next proof.

## Reference Map

| What you need | Where to find it |
|---|---|
| Chain addresses and start blocks | [Deployments](/deployments) |
| Protocol flows | [Deposit](/protocol/deposit), [Withdrawal](/protocol/withdrawal), [Ragequit](/protocol/ragequit) |
| SDK API and types | [SDK Utilities](/reference/sdk) |
| End-to-end integration detail | [skills.md](https://docs.privacypools.com/skills.md) |

## Common Failure Modes

| Error | Typical cause | Immediate action |
|---|---|---|
| `IncorrectASPRoot` | ASP root mismatch (`onchainMtRoot` parity not satisfied) | Re-fetch `mt-roots` + `mt-leaves`, use `onchainMtRoot`, regenerate proof |
| `MERKLE_ERROR` | Leaf missing from provided leaves (wrong scope/pool or stale data) | Verify scope and pool, refresh leaves, rebuild Merkle proofs |
| `InvalidProcessooor` | Direct vs relayed `processooor` mismatch | Direct: `processooor = msg.sender`; relayed: `processooor = entrypointAddress` |
| `NullifierAlreadySpent` | Commitment already exited via withdrawal or ragequit | Stop retrying that commitment and select another spendable commitment |
| `PrecommitmentAlreadyUsed` | Duplicate deposit precommitment / index reuse | Increment deposit index, recompute secrets/precommitment, resubmit |
