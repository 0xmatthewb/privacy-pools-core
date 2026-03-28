---
sidebar_label: UX Patterns
sidebar_position: 3
title: UX Patterns
slug: /build/ux-patterns
description: Recommended frontend patterns for account management, deposits, withdrawals, and ragequit in Privacy Pools.
keywords: [privacy pools, UX, frontend, account, deposit, withdrawal, ragequit, recovery]
---

These patterns assume your SDK is wired up per [Frontend Integration](/build/integration). They cover the UX details that the integration recipe does not: account recovery edge cases, approval states, quote timing, and ragequit presentation.

## Account and Recovery

- Prefer wallet-signature seed derivation only when the wallet can reproduce the same EIP-712 signature for the same payload.
- Compare two signatures of the same payload before deriving. If they differ, use manual mnemonic onboarding. Require the recovery phrase to be saved before continuing.
- If `initializeWithEvents` returns `legacyAccount`, keep it during restores for migrated users because it is needed for ragequit of legacy deposits.
- If some scopes fail during account restoration, retry those scopes with `AccountService.initializeWithEvents(dataService, { mnemonic }, failedPools)` to re-run discovery.
  - For retries from an existing account service, use `AccountService.initializeWithEvents(dataService, { service: account }, failedPools)` instead.
- If you support manual recovery input, normalize whitespace, commas, and newlines before checksum validation.
- Do not log recovery phrases, signatures, nullifiers, secrets, or raw note material to analytics or error tracking.

## Deposit UX

- If you expose `Use max`, reserve gas for native-asset deposits and account for vetting-fee math before populating the amount field.
- If the wallet supports batching, collapse approval + deposit into one action.
- For stake-then-deposit flows with alternative input tokens, make the final deposited asset and expected amount explicit in the review UI.
- Parse the confirmed `Deposited` event immediately and store the resulting pool account locally rather than waiting for a later rescan.
- Tell the user that confirmed deposits may take time to become ASP-approved.
- Track each deposit and each post-withdrawal change commitment inside the same pool-account tree.

See [Deposit](/protocol/deposit) for the protocol mechanics.

## Private Withdrawal UX

Before enabling withdrawal, verify:
- At least one relayer is available.
- The selected pool account has positive balance and ASP approval.

Filter withdraw selectors to approved non-zero accounts for the active chain/scope and pick a sensible default automatically.

- Surface review statuses clearly: approved, pending, declined, and `poi_required` (displayed as "POA Needed"), which prompts the user to provide documentation before approval can continue.

- Resolve ENS names to a final address before the review step, using mainnet (`chainId = 1`) resolution.
  - Display reverse ENS alongside the resolved address.
  - Unresolved input must block submit.
  ```typescript
  import { normalize } from "viem/ens";
  const resolved = await publicClient.getEnsAddress({ name: normalize(input) });
  ```
- Fetch `GET /relayer/details` early enough to validate `minWithdrawAmount`.
  - If a partial withdrawal would leave a non-zero remainder below that minimum, warn clearly and offer: withdraw less, withdraw max, or leave the remainder for a later public exit.
  ```typescript
  const url = `${relayerUrl}/relayer/details?chainId=${chainId}&assetAddress=${asset}`;
  const details = await fetch(url).then(r => r.json());
  ```
- Use `GET /{chainId}/public/deposits-larger-than` to show an anonymity-set estimate while the user edits the amount.
- Request the signed `feeCommitment` only after the final recipient is known on review.
- Request the relayer quote only when the review screen opens. Keep a visible countdown.
  - If the quote refreshes because inputs changed or time elapsed, require the user to confirm again.
- Treat `extraGas` as an optional gas-token drop for supported non-native assets. Quote invalidation and fee display must include it.
- If proof generation takes noticeable time, surface progress phases such as `loading_circuits`, `generating_proof`, and `verifying_proof`.
- After a successful withdrawal, insert the new change commitment back into local account state before allowing another spend.

See [Withdrawal](/protocol/withdrawal) for the protocol mechanics.

## Ragequit UX

- Keep ragequit on its own action path with a clear warning that it is a public exit.
- Ragequit returns the full balance to the original depositor address. It does not send funds to a separate recipient.
- Do not present ragequit as the default during normal ASP review. Show deposits as pending unless the user explicitly chooses a public exit or private withdrawal is unavailable.

See [Ragequit](/protocol/ragequit) for the protocol mechanics.

## Next Steps

| Topic | Page |
|---|---|
| SDK types, methods, and account reconstruction | [SDK Utilities](/reference/sdk) |
| Contract errors, safety checks, and common mistakes | [Errors and Constraints](/reference/errors) |
