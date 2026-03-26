---
title: ASP Layer
description: "ASP layer responsibilities for approved-label set management, inclusion data publication, and gating withdrawals for compliance."
keywords:
  - privacy pools
  - ASP
  - association set provider
  - approved labels
  - compliance
  - state updates
  - withdrawals
---


## Role in the Protocol

The Association Set Provider is the compliance layer that controls which deposits can be privately withdrawn from Privacy Pools. It maintains a set of approved labels and provides the data necessary for cryptographic proofs of label inclusion.

## Core Responsibilities

- Maintains the Merkle tree of approved deposit labels
- Publishes updated roots to the [Entrypoint](/layers/contracts/entrypoint) via authorized postmen (`ASP_POSTMAN` role)
- Serves label and state-tree leaves through the [ASP API](/reference/asp-api) so clients can build withdrawal proofs

## Operation - Label Management

### Root Updates

- Only authorized postmen can update roots
- Each update includes:

  ```solidity
  struct AssociationSetData {
    uint256 root;        // Merkle root of approved labels
    string ipfsCID;      // IPFS v1 CID referencing off-chain association set data
    uint256 timestamp;   // Update timestamp
  }

  ```

- Root history stored in a growing array on the Entrypoint

### Set Validation

- Withdrawals require the proof's ASP root to match the latest root exactly (`Entrypoint.latestRoot()`)
- The withdrawal proof must demonstrate label inclusion in the ASP tree

### Label Exclusion

The on-chain contracts have no mechanism for removing individual labels. The Entrypoint's root history is append-only. However, the ASP can publish a new root computed from a set that excludes certain labels. Once the new root lands on-chain, any commitment whose label was excluded can no longer produce a valid withdrawal proof. The original depositor can still [ragequit](/protocol/ragequit).

Pool wind-down (`windDown()`) is a separate operation: it sets a `dead` flag on the pool to block new deposits but does not affect labels or withdrawals.

