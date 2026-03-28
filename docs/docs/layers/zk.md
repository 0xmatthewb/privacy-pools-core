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


The Privacy Pools protocol uses three main Circom circuits:

1. **CommitmentHasher Circuit**
   - Computes commitment hashes from inputs
   - Generates precommitment and nullifier hashes
   - Uses Poseidon hash for efficient ZK computation
2. **LeanIMTInclusionProof Circuit**
   - Verifies membership in Lean Incremental Merkle Trees
   - Computes path from leaf to root
   - Validates hashes for each tree level
   - Accommodates dynamic tree depth
3. **Withdrawal Circuit**
   - Combines commitment and Merkle tree proofs
   - Verifies ownership of existing commitment
   - Validates new commitment creation
   - Checks ASP root inclusion

## Commitments

Each deposit produces a commitment from four inputs:

1. **Components**
   - Value: The amount of assets being committed
   - Label: Unique identifier from pool scope and nonce
   - Nullifier: Secret value preventing double-spending
   - Secret: Random value proving ownership
2. **Hash Construction**

   ```tsx
   nullifierHash = PoseidonHash(nullifier);
   precommitmentHash = PoseidonHash(nullifier, secret);
   commitmentHash = PoseidonHash(value, label, precommitmentHash);
   ```

Each circuit splits inputs into public and private signals:

- **Commitment circuit** — 4 public signals: 2 outputs (precommitment hash, commitment hash) and 2 public inputs (value, label). Private signals: nullifier, secret.
- **Withdrawal circuit** — 8 public signals: 2 outputs (nullifier hash, new commitment hash) and 6 public inputs (withdrawal amount, existing commitment root, ASP root, context, new commitment value, new commitment label). Private signals: nullifier, secret, new secret, Merkle siblings.

The SDK generates a Groth16 proof (`pi_a`, `pi_b`, `pi_c`) from the circuit inputs. On-chain, `WithdrawalVerifier` or `CommitmentVerifier` runs a pairing check and reverts with `InvalidProof` if it fails.
