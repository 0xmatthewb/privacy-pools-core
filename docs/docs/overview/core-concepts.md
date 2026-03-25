---
title: Core Concepts
description: "Core protocol concepts including commitments, nullifiers, Merkle trees, proof types, and how Privacy Pools preserves privacy with verifiability."
keywords:
  - privacy pools
  - commitments
  - nullifiers
  - merkle tree
  - zk proofs
  - state root
  - ASP
---

## Commitments and nullifiers

A PrivacyPool commitment is a note for some value deposited in a Pool composed of:

- **`value`**: The amount being committed
- **`label`**: A unique identifier derived from scope and nonce
- **`nullifier`**: A secret that prevents double-spending
- **`secret`**: A value that helps hide the nullifier

```mermaid
graph TD
    CH["Commitment Hash<br/><i>Poseidon(value, label, precommitmentHash)</i>"]
    CH --- V["value"]
    CH --- L["label"]
    CH --- PH["Precommitment Hash<br/><i>Poseidon(nullifier, secret)</i>"]
    PH --- N["nullifier"]
    PH --- S["secret"]
```

The protocol uses three hash constructions:

- **Commitment Hash**: `Poseidon(value, label, precommitmentHash)` — the on-chain leaf in the state Merkle tree
- **Precommitment Hash**: `Poseidon(nullifier, secret)` — submitted at deposit time. Because it hides the nullifier, the contract cannot link this precommitment to the nullifier hash that will later appear during withdrawal.
- **Nullifier Hash**: `Poseidon(nullifier)` — revealed on-chain during withdrawal or ragequit. The contract records it and rejects any future attempt to spend the same commitment (`NullifierAlreadySpent`). The nullifier itself stays private; only its hash is public, so observers cannot reconstruct the precommitment or link the withdrawal back to the original deposit.

## Zero-knowledge proofs in Privacy Pools

Privacy Pools uses [zero-knowledge proofs](/layers/zk) to demonstrate valid statements about private information without revealing that information. The protocol employs three proof types:

- **[Commitment Proofs](/layers/zk/commitment)**: Verify the ownership of a commitment (used in ragequit)
- **[Withdrawal Proofs](/layers/zk/withdrawal)**: Verify ownership, inclusion in both state and ASP trees, and valid value transitions
- **[Merkle Proofs](/layers/zk/lean-imt)**: Demonstrate membership in a tree without revealing position

## Basic operations

- **[Deposit](/protocol/deposit)**
  - User generates commitment components
  - Deposits funds and submits commitment to pool
  - Commitment is added to the state tree
- **[Withdrawal](/protocol/withdrawal)**
  - User proves ownership of an existing commitment
  - Creates new commitment for remaining funds
  - Marks previous commitment as spent
  - Receives withdrawn assets
- **[Ragequit](/protocol/ragequit)**
  - Original depositor proves ownership of a commitment
  - Recovers full remaining deposit value
  - Marks commitment as spent

## Privacy model

Privacy Pools splits knowledge across participants so that no single party can link a deposit to its withdrawal.

| Party | Can see | Cannot see |
|---|---|---|
| **Depositor** | Their own secrets, label, deposit value | Other depositors' secrets |
| **Recipient** | Withdrawn amount arriving at their address | Which deposit funded it, depositor identity |
| **Relayer** | Proof validity, recipient address, fee amount | Deposit source, nullifier, commitment linkage |
| **ASP** | All deposit labels, which labels are approved | Nullifiers, secrets, withdrawal recipients |
| **On-chain observer** | Deposit amounts, withdrawal amounts, nullifier hashes | Link between any deposit and any withdrawal |

The withdrawal ZK proof demonstrates that the withdrawer owns a valid, ASP-approved commitment in the pool without revealing _which_ commitment. The relayer submits the transaction on behalf of the user, breaking the on-chain address link between depositor and recipient. The ASP sees deposit labels (which are public from deposit events) but never learns withdrawal destinations.

For the full deposit-to-withdrawal lifecycle, see [Using Privacy Pools](/protocol).
