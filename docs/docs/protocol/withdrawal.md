---
title: Withdrawal
description: "Relayed withdrawal is the recommended production path; this page also covers advanced direct withdrawal, proof generation, nullifier-spend checks, fee handling, and state transition behavior."
keywords:
  - privacy pools
  - withdrawal
  - relayer
  - direct withdrawal
  - nullifier
  - proof verification
  - fees
---


Privacy Pools supports two types of withdrawals, but website-aligned production frontends should expose the relayed flow as the primary private-withdraw action:

1. **Relayed Withdrawals**: Withdrawal processed through a relayer. This is the privacy-preserving frontend path.
2. **Direct Withdrawals / Self-Relay**: User submits the withdrawal transaction themselves. This is an advanced non-private path.

Both methods require [zero-knowledge proofs](/layers/zk/withdrawal) to prove commitment ownership and maintain privacy.

:::info Integration
For production workflow guidance, see [Integrations](/protocol/integrations) and [skills.md](https://docs.privacypools.com/skills.md).
:::

Integration note: withdrawal proofs carry two separate roots. The state-tree root comes from the pool's `currentRoot()` (via SDK `contracts.getStateRoot(poolAddress)`), while the ASP root must match `Entrypoint.latestRoot()` and is sourced from ASP `onchainMtRoot`.

## Production Frontend Pattern

- Only offer private withdrawal from pool accounts with `balance > 0` and ASP approval.
- Resolve ENS or other human-readable recipient input to a final address before requesting a quote or generating a proof.
- Fetch `GET /relayer/details` and warn if a partial withdrawal would leave a non-zero remainder below `minWithdrawAmount`.
- Request the quote on the review step, keep a visible countdown, and if amount, recipient, relayer, or `extraGas` changes, refresh the quote and require another confirm click.
- Treat `extraGas` as an optional gas-token drop for supported non-native assets and reflect it in fee display plus quote invalidation.
- Treat user-submitted withdrawal paths as advanced non-private options. If the frontend wants private withdrawal, it should use the relayed flow.
- Keep ragequit separate as the explicit public fallback.

## Withdrawal Types Comparison

| Aspect                   | Direct Withdrawal  | Relayed Withdrawal                      |
| ------------------------ | ------------------ | --------------------------------------- |
| Privacy Level            | Not privacy-preserving for normal frontend use (signer pays gas and submits the withdrawal transaction) | Recommended private path (relayer pays gas, decoupling recipient from tx sender) |
| Gas Payment              | User pays directly | Relayer pays, takes fee                 |
| Fee Structure            | No fees            | Configurable relayer fee                |
| Complexity               | Simpler but privacy-reducing | Additional fee computation              |
| Front-running Protection | Context-based      | Context-based                           |

### Protocol Flow - Direct Withdrawal (Advanced)

```mermaid
sequenceDiagram
    participant User
    participant SDK
    participant Pool
    participant Entrypoint

    Note over User: Has: nullifier, secret,<br/>label, value
    User->>SDK: Prepare withdrawal(amount)

    activate SDK
    Note over SDK: Generate:<br/>newNullifier, newSecret
    SDK->>SDK: Compute remaining value
    SDK->>SDK: Generate Withdrawal proof
    SDK-->>User: withdrawalProof
    deactivate SDK

    User->>Pool: withdraw(withdrawal, proof)

    activate Pool
    Pool->>Pool: Verify processooor == msg.sender
    Pool->>Entrypoint: Check proof uses latest ASP root
    Pool->>Pool: Verify proof


    Pool->>Pool: Update state<br/>Record spent nullifier
    Pool->>User: Transfer amount

    Pool-->>User: Emit Withdrawn
    deactivate Pool

    Note over User: Store new secrets<br/>for remaining balance

```

### Protocol Flow - Relayed Withdrawal (Website and production default)

```mermaid
sequenceDiagram
    participant User
    participant SDK
    participant Relayer
    participant Entrypoint
    participant Pool


    Note over User: Has: nullifier, secret,<br/>label, value
    User->>SDK: Prepare withdrawal(amount, relayer)

    activate SDK
    Note over SDK: Generate:<br/>newNullifier, newSecret
    SDK->>SDK: Compute remaining value
    SDK->>SDK: Generate Withdrawal proof
    SDK-->>User: withdrawalProof
    deactivate SDK

    User->>Relayer: Submit withdrawal + proof
    Relayer->>Relayer: Verify proof locally
    Relayer->>Entrypoint: relay(withdrawal, proof, scope)

    activate Entrypoint
    Entrypoint->>Pool: withdraw(withdrawal, proof)

    activate Pool
    Pool->>Pool: Verify processooor is Entrypoint
    Pool->>Pool: Verify proof
    Pool->>Entrypoint: Check proof uses latest ASP root

    Pool->>Pool: Update state<br/>Record spent nullifier
    Pool->>Entrypoint: Transfer full amount
    deactivate Pool

    Entrypoint->>Entrypoint: Calculate fees
    Entrypoint->>User: Transfer(amount - fees)
    Entrypoint->>Relayer: Pay relayer fee

    Entrypoint-->>User: Emit WithdrawalRelayed
    deactivate Entrypoint

    Note over User: Store new secrets<br/>for remaining balance

```

### Withdrawal Data Structure

```solidity
struct Withdrawal {
    address processooor;    // Direct: tx signer (msg.sender), Relayed: Entrypoint address
    bytes data;             // Direct: empty, Relayed: ABI-encoded RelayData
}

struct RelayData {
    address recipient;     // Final recipient of withdrawn funds
    address feeRecipient;  // Relayer address (receives the fee)
    uint256 relayFeeBPS;   // Fee in basis points
}
```

## Withdrawal Steps

### Direct Withdrawal (Advanced)

1. **Proof Generation**
   - User constructs withdrawal parameters
   - Generates ZK proof of commitment ownership
   - Computes new commitment for remaining value
2. **Contract Interaction**
   - User submits proof to pool contract
   - Pool verifies proof and context
   - Updates state (nullifiers, commitments)
   - Transfers assets to signer (processooor)

Do not expose this as the default frontend action if recipient privacy matters.

### Relayed Withdrawal (Recommended)

1. **User Steps**
   - Construct withdrawal with Entrypoint as processooor
   - Resolve the final recipient and request the relayer quote late in the flow so proof generation and relay submission fit inside the quote TTL
   - Validate the relayer minimum and warn if the remaining balance after a partial withdrawal would fall below it
   - Generate ZK proof
   - Submit to relayer off-chain
2. **Relayer Steps**
   - Verify proof locally
   - Submit transaction to Entrypoint
   - Pay gas fees
3. **Entrypoint Processing**
   - Verify proof and context
   - Process withdrawal through pool
   - Handle fee distribution
   - Transfer assets to recipient

### Context Generation

The `context` signal binds the proof to specific withdrawal parameters:

```solidity
context = uint256(keccak256(abi.encode(
    withdrawal,
    pool.SCOPE()
))) % SNARK_SCALAR_FIELD;
```
