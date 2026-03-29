---
title: Smart Contracts Layer
description: "Architecture of the smart contract layer, covering Entrypoint, asset-specific pools, verifiers, and protocol state responsibilities."
keywords:
  - privacy pools
  - smart contracts
  - entrypoint
  - privacy pool
  - verifiers
  - solidity
  - architecture
---


## Contract architecture overview

The Privacy Pools protocol is built on three core contracts:

1. **[Entrypoint](/layers/contracts/entrypoint)** — Upgradeable coordinator for deposits, relay, ASP roots, and fees.
2. **[Privacy Pools](/layers/contracts/privacy-pools)** — Per-asset pool contracts (`PrivacyPoolSimple` for ETH, `PrivacyPoolComplex` for ERC-20) inheriting from `PrivacyPool` and `State`.
3. **Verifiers** — `CommitmentVerifier` ([ragequit](/protocol/ragequit)) and `WithdrawalVerifier` ([withdrawal](/protocol/withdrawal)), both Groth16.

## Component interaction

| Operation | Path | Notes |
|---|---|---|
| Deposit | User → Entrypoint → Pool | Entrypoint deducts fee, forwards to pool |
| Relayed withdrawal | Relayer → Entrypoint → Pool → Recipient | Entrypoint verifies fee, distributes funds |
| Direct withdrawal | User → Pool | Caller must equal `processooor` |
| [Ragequit](/protocol/ragequit) | User → Pool | Original depositor only |
| ASP root update | Postman → Entrypoint | Authorized role posts new root |

## State management basics

Each Privacy Pool maintains:

1. **Tree State**
   - Lean Incremental Merkle Tree (LeanIMT) for commitments
   - Dynamic depth that grows with insertions
   - Cached roots for historical validation
2. **Nullifier Registry**
   - Tracks spent nullifiers to prevent double-spending
3. **Deposit Records**
   - Maps labels to original depositor addresses
   - Enables direct recovery through ragequit
