---
title: Commitment Circuit
description: "Interface and behavior of the commitment circuit used to derive commitment and nullifier hashes for ragequit proofs."
keywords:
  - privacy pools
  - commitment circuit
  - circom
  - poseidon
  - nullifier hash
  - ragequit proof
  - zk
---


The commitment circuit (`commitment.circom`) derives commitment and nullifier hashes from deposit parameters:

```cpp
template CommitmentHasher() {
    signal input value;              // Value being committed
    signal input label;              // keccak256(abi.encodePacked(pool_scope, nonce)) % SNARK_SCALAR_FIELD
    signal input nullifier;          // Unique nullifier
    signal input secret;             // Secret value

    signal output commitment;        // Final commitment hash
    signal output nullifierHash;     // Hashed nullifier
}
```

Key operations:

1. Nullifier hashing: `nullifierHash = Poseidon([nullifier])`
2. Precommitment: `precommitmentHash = Poseidon([nullifier, secret])`
3. Final commitment: `commitment = Poseidon([value, label, precommitmentHash])`
