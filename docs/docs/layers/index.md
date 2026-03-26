---
title: Protocol Components
slug: /layers
description: Architecture overview of the contract, zero-knowledge, and ASP layers that make Privacy Pools work end to end.
keywords:
  - privacy pools
  - architecture
  - contracts
  - zero knowledge
  - asp
  - layers
---

Privacy Pools is made of three coordinated systems:

- **Smart contracts** hold funds, manage state, and expose deposit, relay, and ragequit entry points.
- **Zero-knowledge circuits** prove that a withdrawal is valid without revealing which deposit is being spent.
- **Association Set Providers (ASPs)** review deposit labels off-chain and publish approved-set roots on-chain.

## End-to-end data flow

1. A user deposits through the [Entrypoint](/layers/contracts/entrypoint) into an asset-specific pool.
2. The pool inserts the commitment into its state tree and records the original depositor for ragequit.
3. The ASP reviews deposit labels and publishes approved-set roots through the Entrypoint.
4. A client fetches state leaves plus ASP leaves, builds Merkle proofs, and generates a withdrawal proof.
5. The relayer calls `Entrypoint.relay()`, the pool verifies the proof and roots, and the Entrypoint routes funds to the recipient and fee recipient.

## Read by layer

| Layer | Covers |
|---|---|
| [Smart Contracts Layer](/layers/contracts) | Entrypoint responsibilities, pool responsibilities, state, fees, and ragequit |
| [Zero Knowledge Layer](/layers/zk) | Commitment hashing, LeanIMT inclusion proofs, and withdrawal proof composition |
| [ASP Layer](/layers/asp) | Deposit review, approved-label trees, and on-chain root publication |
