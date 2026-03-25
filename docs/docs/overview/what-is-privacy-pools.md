---
title: What is Privacy Pools?
slug: /overview/what-is-privacy-pools
description: "High-level overview of Privacy Pools, explaining compliant private withdrawals on Ethereum using zero-knowledge proofs and Association Set Providers (ASPs)."
keywords:
  - privacy pools
  - 0xbow
  - ethereum
  - zero-knowledge proofs
  - ASP
  - private withdrawals
  - compliance
---


## The challenge of private transactions

On public blockchains like Ethereum, every transaction is visible to everyone. While this transparency is a core feature, it creates significant privacy challenges and risks for users. When all transactions are visible, every transaction reveals the full balances and transaction history of both parties.

## Privacy Pools offers a solution

Privacy Pools enables private withdrawals through a combination of zero-knowledge proofs and commitment schemes. Users can deposit assets into Privacy Pools and later withdraw them, either partially or fully, without creating an on-chain link between their deposit and withdrawal addresses. A relayer submits withdrawal transactions on behalf of users, breaking the on-chain address link between depositor and recipient.

Deposits are never blocked at entry — anyone can deposit at any time. An [Association Set Provider (ASP)](/layers/asp) independently evaluates deposits after they enter the pool and maintains a set of approved labels. ASP approval is what unlocks the private withdrawal path. If a deposit is not approved (or the user prefers not to wait), the original depositor can always [ragequit](/protocol/ragequit) — a public exit that returns the full balance without ASP approval.

## Start here

| Goal | Page |
|---|---|
| Understand the protocol lifecycle | [Using Privacy Pools](/protocol) |
| Build a frontend integration | [Start Here](/build/start) |
| Integrate with agents | [Start Here](/build/start) |
| Look up chain addresses and `startBlock` | [Deployments](/deployments) |

## System architecture overview

Privacy Pools' architecture consists of three distinct layers:

```mermaid
flowchart TD
    subgraph C["Contract Layer"]
        direction LR
        E["Entrypoint (upgradeable)"]
        PP["Privacy Pools (per asset)"]
        S["Pool state"]
        E --> PP
        PP --> S
    end

    subgraph Z["Zero-Knowledge Layer"]
        direction LR
        CC["Commitment circuits"]
        WC["Withdrawal circuits"]
        V["On-chain verifiers"]
        CC -.->|"proofs"| V
        WC -.->|"proofs"| V
    end

    subgraph A["ASP Layer"]
        direction LR
        ASP["Association Set Provider"]
        SET["Approved labels"]
        POST["Authorized accounts"]
        ASP --> SET
        ASP --> POST
    end

    POST -->|"publish ASP root"| E
    PP -->|"verify proofs"| V
    SET -.->|"membership inputs"| WC
    S -.->|"state proof inputs"| WC

    %% Invisible layout constraints to keep layer order aligned with the list:
    E ~~~ WC
    WC ~~~ ASP
```

1. **[Contract Layer](/layers/contracts)**
   - An upgradeable [Entrypoint](/layers/contracts/entrypoint) contract that coordinates ASP-operated privacy pools
   - Asset-specific [Privacy Pools](/layers/contracts/privacy-pools) that hold funds and manage state
2. **[Zero-Knowledge Layer](/layers/zk)**
   - [Commitment circuits](/layers/zk/commitment) for secure deposit registration
   - [Withdrawal circuits](/layers/zk/withdrawal) that enable private asset withdrawals
   - On-chain verifiers that validate circuit proofs
3. **[Association Set Provider (ASP) Layer](/layers/asp)**
   - Maintains the current set of approved deposit labels
   - Updates state through authorized accounts
   - Enables regulatory compliance without compromising privacy

These layers work together to create a secure privacy-preserving system: the contract layer manages assets and state, the zero-knowledge layer ensures privacy, and the ASP layer provides compliance capabilities.

## Key features and capabilities

- **Deposits are never blocked**: Anyone can deposit at any time. The ASP evaluates deposits after entry, not before.
- **Privacy via relayed withdrawals**: A relayer submits the withdrawal transaction, so the recipient address has no on-chain link to the depositor.
- **Partial Withdrawals**: Users can withdraw portions of their deposits while maintaining privacy.
- **[Ragequit](/protocol/ragequit) is always available**: Original depositors can publicly reclaim their funds at any time, even if the ASP has not approved the deposit.
- **Compliance without custody**: The ASP-based approval system enables regulatory compliance while users retain full control of their funds through cryptographic commitments.
