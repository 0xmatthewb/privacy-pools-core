---
title: Circuit Architecture Overview
description: "Overview of the Circom zero-knowledge layer, including commitment hashing, LeanIMT inclusion proofs, and withdrawal proof composition."
keywords:
  - privacy pools
  - circom
  - zero-knowledge
  - commitment hasher
  - leanimt
  - withdrawal circuit
  - proof system
---

The zero-knowledge layer is built from three Circom circuits that compose into two user-facing proofs: a commitment proof (for [ragequit](/protocol/ragequit)) and a withdrawal proof (for [private withdrawal](/protocol/withdrawal)).

## Circuits

| Circuit | Role |
|---|---|
| **[CommitmentHasher](/layers/zk/commitment)** | Derives commitment and nullifier hashes from deposit parameters using Poseidon |
| **LeanIMTInclusionProof** | Verifies Merkle tree membership with dynamic depth |
| **[Withdrawal](/layers/zk/withdrawal)** | Composes CommitmentHasher + two LeanIMT proofs (state tree and ASP tree) to prove ownership of an approved commitment |

## Commitment hashes

Each deposit produces a commitment from four inputs — `value`, `label`, `nullifier`, and `secret` — combined through nested Poseidon hashes:

```tsx
nullifierHash = PoseidonHash(nullifier);
precommitmentHash = PoseidonHash(nullifier, secret);
commitmentHash = PoseidonHash(value, label, precommitmentHash);
```

## Public signals

Each circuit exposes a different set of public signals:

- **Commitment circuit** — 4 public signals: 2 outputs (`commitment`, `nullifierHash`) and 2 public inputs (`value`, `label`). Private: `nullifier`, `secret`.
- **Withdrawal circuit** — 8 public signals: 2 outputs (`newCommitmentHash`, `existingNullifierHash`) and 6 public inputs (`withdrawnValue`, `stateRoot`, `stateTreeDepth`, `ASPRoot`, `ASPTreeDepth`, `context`). Private: existing commitment secrets, new secrets, Merkle siblings.

See [Circuits Reference](/reference/circuits) for the full constraint list and signal ordering.

## Proof generation and verification

The SDK generates a Groth16 proof (`pi_a`, `pi_b`, `pi_c`) from the circuit inputs. On-chain, `WithdrawalVerifier` or `CommitmentVerifier` runs a pairing check and reverts with `InvalidProof` if it fails.
