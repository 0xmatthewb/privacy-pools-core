---
title: ASP Layer
description: "How the Association Set Provider manages approved-label Merkle trees, publishes roots on-chain, and gates private withdrawals."
keywords:
  - privacy pools
  - ASP
  - association set provider
  - approved labels
  - compliance
  - merkle root
  - withdrawals
---

The ASP (Association Set Provider) decides which deposits are eligible for private withdrawal. It does this by maintaining an off-chain Merkle tree of approved deposit labels and periodically publishing the tree's root on-chain through the Entrypoint.

## How it works

Every deposit creates a `label` on-chain (`keccak256(scope, ++nonce) % SNARK_SCALAR_FIELD`). The label is public: it appears in the `Deposited` event. The ASP monitors these events, evaluates each deposit against its own criteria, and adds approved labels to its Merkle tree.

When the ASP updates its tree, it calls `Entrypoint.updateRoot(root, ipfsCID)`, which appends a new entry to the on-chain `associationSets` array:

```solidity
struct AssociationSetData {
  uint256 root;      // Merkle root of approved labels
  string ipfsCID;    // IPFS CID pointing to the full label set
  uint256 timestamp; // Block timestamp of the update
}
```

Only the `ASP_POSTMAN` role can call `updateRoot()`. The Entrypoint owner manages this role assignment.

## How withdrawals use the ASP tree

The withdrawal circuit takes two Merkle inclusion proofs: one for the state tree (proving the commitment exists) and one for the ASP tree (proving the label is approved). The ASP tree leaf is the **label itself**, not the commitment hash.

```
ASPRootChecker.leaf <== label
```

On-chain, the `validWithdrawal` modifier enforces that the proof's claimed ASP root matches `Entrypoint.latestRoot()` exactly. Unlike the state tree (which accepts any of the last 64 roots), the ASP root must be the most recent one. If the ASP publishes a new root between when the client fetches leaves and when the proof lands on-chain, the proof will revert with `IncorrectASPRoot`.

## Root history

The Entrypoint stores all ASP roots in a growing array (not a circular buffer). Historical roots are accessible via `rootByIndex(index)` and `associationSets(index)`, which returns the root, IPFS CID, and timestamp. Each root update emits a `RootUpdated` event.

## Label exclusion

There is no on-chain mechanism for removing labels. The root history is append-only. But the ASP can publish a new root computed from a set that excludes certain labels. Once that root lands on-chain, any commitment with an excluded label can no longer produce a valid withdrawal proof. The original depositor can still [ragequit](/protocol/ragequit).

Pool wind-down (`windDown()`) is a separate operation that blocks new deposits. It does not affect the ASP tree or existing withdrawal eligibility.

## API surface

The ASP serves its tree data over HTTP. Clients use this to build withdrawal proofs:

- `GET /{chainId}/public/mt-roots` returns the latest root (`mtRoot`) and the root currently on-chain (`onchainMtRoot`). If these differ, the ASP has computed a new tree that hasn't been pushed on-chain yet.
- `GET /{chainId}/public/mt-leaves` returns the full set of approved labels (`aspLeaves`) and state tree leaves (`stateTreeLeaves`).
- `GET /{chainId}/public/deposits-larger-than` returns deposits above a threshold, useful for anonymity-set UX.

All pool-scoped endpoints require the `X-Pool-Scope` header as a decimal string.

For endpoint details, see the [ASP API Reference](/reference/asp-api).
