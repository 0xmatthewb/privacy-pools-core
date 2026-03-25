---
title: Circuits Interfaces
description: "Circuit interface reference describing public and private inputs, outputs, and constraints for commitment and withdrawal proofs."
keywords:
  - privacy pools
  - circuit interfaces
  - circom
  - public inputs
  - private inputs
  - outputs
  - constraints
---

**`CommitmentHasher`**

Creates commitment proofs using Poseidon hash.

```
Inputs:
- value: Amount being committed
- label: keccak256(abi.encodePacked(scope, nonce)) % SNARK_SCALAR_FIELD
- nullifier: Unique nullifier for commitment
- secret: Secret for commitment

Outputs:
- commitment: Poseidon(value, label, Poseidon(nullifier, secret))
- nullifierHash: Poseidon(nullifier)
```

**`Withdraw`**

Validates withdrawal proofs.

```
Public Inputs:
- withdrawnValue: Amount being withdrawn
- stateRoot: Current state root
- stateTreeDepth: Current state tree depth
- ASPRoot: Latest ASP root
- ASPTreeDepth: Current ASP tree depth
- context: uint256(keccak256(abi.encode(withdrawal, scope))) % SNARK_SCALAR_FIELD

Private Inputs:
- label: keccak256(abi.encodePacked(scope, nonce)) % SNARK_SCALAR_FIELD
- existingValue: Value of existing commitment
- existingNullifier: Nullifier of existing commitment
- existingSecret: Secret of existing commitment
- newNullifier: Nullifier for new commitment
- newSecret: Secret for new commitment
- stateSiblings[]: State tree merkle proof
- stateIndex: Index in state tree
- ASPSiblings[]: ASP tree merkle proof
- ASPIndex: Index in ASP tree

Public Outputs:
- newCommitmentHash: Hash of new commitment
- existingNullifierHash: Hash of spent nullifier

```

## `publicSignals` Ordering

The relayer and contract expect `publicSignals` as a fixed-length array. The SDK produces these automatically, but non-SDK integrators must match this exact order.

**Withdrawal proof (8 elements):**

| Index | Signal | Description |
|-------|--------|-------------|
| 0 | `newCommitmentHash` | Poseidon hash of the change commitment |
| 1 | `existingNullifierHash` | Poseidon hash of the spent nullifier |
| 2 | `withdrawnValue` | Amount withdrawn |
| 3 | `stateRoot` | Pool state Merkle root |
| 4 | `stateTreeDepth` | Depth of the state tree (32) |
| 5 | `ASPRoot` | ASP Merkle root |
| 6 | `ASPTreeDepth` | Depth of the ASP tree (32) |
| 7 | `context` | `uint256(keccak256(abi.encode(withdrawal, scope))) % SNARK_SCALAR_FIELD` |

**Ragequit proof (4 elements):**

| Index | Signal | Description |
|-------|--------|-------------|
| 0 | `commitmentHash` | Hash of the commitment being exited |
| 1 | `nullifierHash` | Hash of the commitment's nullifier |
| 2 | `value` | Value of the commitment |
| 3 | `label` | Label of the commitment |

Source: `ProofLib.sol` index accessors.
