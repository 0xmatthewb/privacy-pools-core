---
title: Circuits Interfaces
sidebar_position: 3
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

## CommitmentHasher

Creates commitment proofs using Poseidon hash. Used by both withdrawal and ragequit flows.

### Inputs

| Signal | Type | Visibility | Description |
|---|---|---|---|
| `value` | field | public | Amount being committed |
| `label` | field | public | Deposit label: `keccak256(abi.encodePacked(scope, nonce)) % SNARK_SCALAR_FIELD` |
| `nullifier` | field | private | Unique nullifier for this commitment |
| `secret` | field | private | Secret paired with the nullifier |

### Outputs

| Signal | Type | Description |
|---|---|---|
| `commitment` | field | `Poseidon(value, label, Poseidon(nullifier, secret))` |
| `nullifierHash` | field | `Poseidon(nullifier)` — revealed on-chain to prevent double-spending |

## Withdraw

Validates withdrawal proofs: proves ownership of a commitment, inclusion in both state and ASP trees, and creates a valid change commitment for remaining funds.

### Public Inputs

| Signal | Type | Description |
|---|---|---|
| `withdrawnValue` | field | Amount being withdrawn |
| `stateRoot` | field | Pool state Merkle root |
| `stateTreeDepth` | field | Current depth of the state tree |
| `ASPRoot` | field | Latest ASP-approved Merkle root |
| `ASPTreeDepth` | field | Current depth of the ASP tree |
| `context` | field | `keccak256(abi.encode(withdrawal, scope)) % SNARK_SCALAR_FIELD` |

### Private Inputs

| Signal | Type | Description |
|---|---|---|
| `label` | field | Deposit label |
| `existingValue` | field | Value of the commitment being spent |
| `existingNullifier` | field | Nullifier of the existing commitment |
| `existingSecret` | field | Secret of the existing commitment |
| `newNullifier` | field | Nullifier for the change commitment |
| `newSecret` | field | Secret for the change commitment |
| `stateSiblings[32]` | field[] | State tree Merkle proof siblings |
| `stateIndex` | field | Leaf index in the state tree |
| `ASPSiblings[32]` | field[] | ASP tree Merkle proof siblings |
| `ASPIndex` | field | Leaf index in the ASP tree |

### Public Outputs

| Signal | Type | Description |
|---|---|---|
| `newCommitmentHash` | field | Hash of the change commitment for remaining funds |
| `existingNullifierHash` | field | `Poseidon(existingNullifier)` — recorded on-chain to prevent re-spending |

## Withdraw Circuit Constraints

The Withdraw circuit enforces the following constraints (sourced from `withdraw.circom`):

1. **Existing commitment reconstruction** — recomputes `Poseidon(existingValue, label, Poseidon(existingNullifier, existingSecret))` and verifies the result matches a leaf in the state tree.

2. **State tree inclusion** — LeanIMT inclusion proof verifying the existing commitment hash is a leaf at `stateIndex` with the given `stateSiblings`, producing `stateRoot`.

3. **ASP tree inclusion** — LeanIMT inclusion proof using the **label** as the leaf (not the commitment hash). This proves the deposit has been approved by the ASP.

4. **Value range checks** — both `remainingValue` (`existingValue - withdrawnValue`) and `withdrawnValue` must fit in 128 bits (`Num2Bits(128)`). This prevents underflow and constrains values to a valid range.

5. **Nullifier uniqueness** — `existingNullifier !== newNullifier` (`IsEqual` constraint output must be 0). Ensures the change commitment uses a fresh nullifier.

6. **New commitment construction** — computes `Poseidon(remainingValue, label, Poseidon(newNullifier, newSecret))` as the change commitment hash.

7. **Context integrity** — `context * context` is computed as a signal to prevent the optimizer from removing `context` as an unused input, binding the proof to specific withdrawal parameters.

## Label Derivation

Labels are computed on-chain by the pool contract during deposit:

```solidity
uint256 label = uint256(keccak256(abi.encodePacked(SCOPE, ++nonce))) % SNARK_SCALAR_FIELD;
```

Where `SCOPE` is itself derived from:

```solidity
SCOPE = uint256(keccak256(abi.encodePacked(address(pool), block.chainid, asset))) % SNARK_SCALAR_FIELD;
```

The SDK does not recompute labels — it reads them from on-chain `Deposited` events via `DataService`.

`SNARK_SCALAR_FIELD` = `21888242871839275222246405745257275088548364400416034343698204186575808495617`

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

Source: `ProofLib.sol` index accessors and [Contracts Interfaces](/reference/contracts#prooflib).
