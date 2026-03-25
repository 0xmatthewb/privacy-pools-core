---
sidebar_label: UX Patterns
sidebar_position: 3
title: UX Patterns
slug: /build/ux-patterns
description: Recommended frontend patterns for account management, deposits, withdrawals, and ragequit in Privacy Pools.
keywords: [privacy pools, UX, frontend, account, deposit, withdrawal, ragequit, recovery]
---

Practical frontend patterns for Privacy Pools integrations. For the step-by-step integration recipe, see [Frontend Integration](/build/integration).

## Account and Recovery

- Prefer wallet-signature seed derivation only when the wallet can reproduce the same EIP-712 signature for the same payload — see [Deposit — Account and Recovery](/protocol/deposit#account-and-recovery) for the full onboarding rules.
- Compare two signatures of the same payload before deriving. If they differ, use manual mnemonic onboarding. Require the recovery phrase to be saved before continuing.
- If account reconstruction returns `legacyAccount`, keep it during restores for migrated users.
  - If some scopes fail during a legacy restore, retry those scopes with `AccountService.initializeWithEvents(dataService, { mnemonic }, failedPools)` so legacy discovery runs again.
  - For non-migration retries, use `AccountService.initializeWithEvents(dataService, { service: account }, failedPools)` instead.
- If you support manual recovery input, normalize whitespace, commas, and newlines before checksum validation.
- Do not log recovery phrases, signatures, nullifiers, secrets, or raw note material to analytics or error tracking.

## Deposit UX

- If you expose `Use max`, reserve gas for native-asset deposits and account for vetting-fee math before populating the amount field.
- If the wallet supports batching, collapse approval + deposit into one action.
- For stake-then-deposit flows with alternative input tokens, make the final deposited asset and expected amount explicit in the review UI.
- Parse the confirmed `Deposited` event immediately and store the resulting pool account locally rather than waiting for a later rescan.
- Tell the user that confirmed deposits may take time to become ASP-approved.
- Track each deposit and each post-withdrawal change commitment inside the same pool-account tree.
- Parse confirmed receipts and persist them in pool-account state. Do not expose raw note material in copy/paste or clipboard flows.

For the full deposit protocol mechanics, see [Deposit](/protocol/deposit).

## Private Withdrawal UX

Before enabling withdrawal, verify:
- Wallet is connected and account state is loaded.
- At least one relayer is available.
- The selected pool account has positive balance and ASP approval.

Filter withdraw selectors to approved non-zero accounts for the active chain/scope and pick a sensible default automatically.

- Resolve ENS names to a final address before the review step, using mainnet (`chainId = 1`) resolution. Display reverse ENS alongside the resolved address. Unresolved input must block submit.
  ```typescript
  import { normalize } from "viem/ens";
  const resolved = await publicClient.getEnsAddress({ name: normalize(input) });
  ```
- Fetch `GET /relayer/details` early enough to validate `minWithdrawAmount`. If a partial withdrawal would leave a non-zero remainder below that minimum, warn clearly and offer: withdraw less, withdraw max, or leave the remainder for a later public exit.
  ```typescript
  const details = await fetch(`${relayerUrl}/relayer/details?chainId=${chainId}&assetAddress=${asset}`).then(r => r.json());
  ```
- Use `GET /{chainId}/public/deposits-larger-than` to show an anonymity-set estimate while the user edits the amount.
- Request the signed `feeCommitment` only after the final recipient is known on review.
- Request the relayer quote only when the review screen opens. Keep a visible countdown. If the quote refreshes because inputs changed or time elapsed, require the user to confirm again.
- Treat `extraGas` as an optional gas-token drop for supported non-native assets. Quote invalidation and fee display must include it.
- If proof generation takes noticeable time, surface progress phases such as `loading_circuits`, `generating_proof`, and `verifying_proof`.
- After a successful withdrawal, insert the new change commitment back into local account state before allowing another spend.

For the full withdrawal protocol mechanics, see [Withdrawal](/protocol/withdrawal).

## Ragequit UX

- Keep ragequit on its own action path with a clear warning that it is a public exit.
- Ragequit returns the full balance to the original depositor address. It does not send funds to a separate recipient.
- Handle wallet rejections and user cancellations gracefully without retry loops or error telemetry.

For the full ragequit protocol mechanics, see [Ragequit](/protocol/ragequit).

## Next Steps

| Topic | Page |
|---|---|
| SDK types, methods, and account reconstruction | [SDK Utilities](/reference/sdk) |
| Contract errors, safety checks, and common mistakes | [Errors and Constraints](/reference/errors) |
