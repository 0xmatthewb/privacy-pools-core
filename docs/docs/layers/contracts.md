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

1. **[Entrypoint](/layers/contracts/entrypoint)**
   - Central access point for deposits
   - Manages pool registry and ASP root updates
   - Handles relay routing and fee distribution
   - Controls protocol-wide settings
2. **[Privacy Pools](/layers/contracts/privacy-pools)**
   - `PrivacyPoolSimple`: Handles native asset (ETH)
   - `PrivacyPoolComplex`: Handles ERC20 tokens
   - Both inherit from base `PrivacyPool` and `State` contracts
3. **Verifiers**
   - `CommitmentVerifier`: Validates [ragequit](/protocol/ragequit) proofs
   - `WithdrawalVerifier`: Validates [withdrawal](/protocol/withdrawal) proofs
   - Both implement Groth16 verification

## Component interaction

All user operations route through the Entrypoint, which delegates to the appropriate pool.

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
