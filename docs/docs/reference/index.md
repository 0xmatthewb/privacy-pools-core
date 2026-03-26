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

Use this section when you need exact values, schemas, or contract behavior. For the end-to-end implementation path, start with [Build](/build). For the product lifecycle, start with [Using Privacy Pools](/protocol). Within this section, [Deployments](/deployments) is the lookup page for exact chain values, not part of the initial tutorial flow.

:::info Verified sources
This reference section is aligned to three sources of truth:

- Contracts and circuits from the local `privacy-pools-core-main` repo
- `@0xbow/privacy-pools-core-sdk@1.2.0`
- The production website integration patterns
:::

## Recommended read order

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

## How to use this section

- Guide pages explain the sequence of actions and user-facing behavior.
- Reference pages own exact field names, defaults, schemas, and validation rules.
- When both a guide and a reference page mention the same concept, use the reference page as the canonical source for exact shapes and parameter details.
