---
title: Ragequit
description: "Public fallback exit that allows original depositors to unconditionally reclaim funds from the pool."
keywords:
  - privacy pools
  - ragequit
  - public exit
  - fund recovery
  - original depositor
  - invalid proof
  - safety mechanism
---


Ragequit allows the original depositor to publicly reclaim their funds at any time, regardless of [ASP](/layers/asp) approval status. The contract enforces no ASP-related checks — only that the caller is the original depositor, the commitment exists, and the nullifier has not been spent. While always available, ragequit is primarily useful when a deposit has not been approved, since approved deposits can use the privacy-preserving [withdrawal](/protocol/withdrawal) path instead.

:::info Integration
For production integration guidance, see [Integrations](/protocol/integrations).
:::

## Protocol Flow

```mermaid
sequenceDiagram
    participant User as Original Depositor
    participant SDK
    participant Pool
    participant State as State Tree
    participant RQ as RagequitVerifier

    Note over User,State: User has original commitment parameters<br/>(value, label, nullifier, secret)

    User->>SDK: Generate ragequit proof

    activate SDK
    SDK->>SDK: Compute commitment hash
    SDK->>SDK: Compute precommitment hash
    SDK->>SDK: Compute nullifier hash

    Note over SDK: Package proof with:<br/>- Commitment hash<br/>- Value<br/>- Label
    SDK-->>User: Return ragequit proof
    deactivate SDK

    User->>Pool: ragequit(proof)

    activate Pool

    Pool->>State: Check commitment exists

    alt Commitment not found
        Pool-->>User: Revert: InvalidCommitment
    end

    Pool->>Pool: Verify caller is original depositor

    alt Not original depositor
        Pool-->>User: Revert: OnlyOriginalDepositor
    end

    Pool->>RQ: Verify proof

    alt Invalid proof
        Pool-->>User: Revert: InvalidProof
    end

    Pool->>State: Mark nullifier as spent

    alt Nullifier already spent
        Pool-->>User: Revert: NullifierAlreadySpent
    end

    Pool->>User: Transfer full commitment value

    Pool->>Pool: Emit Ragequit event
    deactivate Pool

    Note over User,State: Funds returned to original depositor<br/>Commitment permanently spent
```

### Ragequit steps

1. Check Requirements
   - Must be original depositor
   - Commitment must not be already spent
2. Generate Proof
3. Call the `ragequit` method with the proof
4. Finalized ragequit
   - User received the full commitment amount
