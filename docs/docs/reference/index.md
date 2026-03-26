---
title: Technical Reference
slug: /reference
description: Exact SDK, contract, circuit, API, and deployment reference material for Privacy Pools.
keywords:
  - privacy pools
  - technical reference
  - sdk
  - contracts
  - circuits
  - api
  - deployments
---

## Read in this order

1. [Deployments](/deployments) for chain addresses and `startBlock` values once you know which network you are wiring.
2. [SDK Utilities](/reference/sdk) for account reconstruction, proof helpers, and contract helpers.
3. [ASP API](/reference/asp-api) and [Relayer API](/reference/relayer-api) for exact request and response shapes.
4. [Contracts Interfaces](/reference/contracts) and [Circuits Interfaces](/reference/circuits) for protocol-level types and proof inputs.
5. [Errors and Constraints](/reference/errors) when debugging failures or validating assumptions.

## At a glance

| Page | Use it for |
|---|---|
| [Deployments](/deployments) | Canonical addresses and chain `startBlock` values |
| [SDK Utilities](/reference/sdk) | `AccountService`, `DataService`, proof helpers, and contract helper behavior |
| [Contracts Interfaces](/reference/contracts) | Solidity structs, events, function signatures, and proof signal ordering |
| [Circuits Interfaces](/reference/circuits) | Public/private inputs, outputs, and circuit constraints |
| [ASP API](/reference/asp-api) | Roots, leaves, health checks, and chain discovery |
| [Relayer API](/reference/relayer-api) | Quote, relay request, fee commitment, and failure handling |
| [Errors and Constraints](/reference/errors) | Revert reasons, validation rules, and common failure modes |
