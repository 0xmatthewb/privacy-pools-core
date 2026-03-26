---
sidebar_label: ASP API
sidebar_position: 4
title: ASP API Reference
description: "HTTP API reference for the Association Set Provider, including endpoints for Merkle roots, leaves, health checks, and chain discovery."
keywords:
  - privacy pools
  - ASP
  - API
  - merkle root
  - inclusion proof
  - association set provider
---

The Association Set Provider (ASP) publishes an HTTP API that integrators use to fetch Merkle tree data for withdrawal proofs. The ASP is operated by 0xbow and serves both approved labels (the ASP tree) and state tree leaves (commitment hashes) for each pool.

:::info Use this page for
- exact ASP hosts, headers, endpoint shapes, and response fields
- checking root-convergence behavior and approval lookups
- verifying the canonical API details behind the guide pages

Verified against the current public ASP API behavior and production website integration patterns.
:::

## Hosts

| Environment | Host |
|-------------|------|
| Mainnet (Ethereum, Arbitrum, OP Mainnet) | `https://api.0xbow.io` |
| Testnet (Sepolia, OP Sepolia) | `https://dw.0xbow.io` |
| Swagger docs | `https://api.0xbow.io/api-docs` |

`request.0xbow.io` is a partner-only host (API-key gated) and does not serve the public endpoints documented below.

### Host Selection

```typescript
function getAspApiHost(chainId: number): string {
  const hosts: Record<number, string> = {
    1:        "https://api.0xbow.io",  // Ethereum Mainnet
    42161:    "https://api.0xbow.io",  // Arbitrum
    10:       "https://api.0xbow.io",  // OP Mainnet
    11155111: "https://dw.0xbow.io",   // Sepolia testnet
    11155420: "https://dw.0xbow.io",   // OP Sepolia testnet
  };
  const host = hosts[chainId];
  if (!host) throw new Error(`No ASP API host configured for chainId ${chainId}`);
  return host;
}
```

## Required Header

All pool-scoped endpoints require the `X-Pool-Scope` header. The value must be a **decimal bigint string** (`scope.toString()`), not hex. Hex or other non-decimal values will silently fail to match any pool and return 404.

```typescript
const scope = await contracts.getScope(privacyPoolAddress);
const headers = { "X-Pool-Scope": scope.toString() };
```

## Endpoints

### `GET /{chainId}/public/mt-roots`

Returns the current ASP tree root for a pool.

**Required header:** `X-Pool-Scope`

**Response:**

```json
{
  "mtRoot": "123456789...",
  "createdAt": "2025-04-01T12:00:00.000Z",
  "onchainMtRoot": "123456789..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `mtRoot` | `string` | Latest ASP Merkle root from the ASP database (decimal bigint string). May be ahead of on-chain if a new root has not been pushed yet. |
| `createdAt` | `string` | ISO 8601 timestamp of this root. |
| `onchainMtRoot` | `string \| null` | The root value currently committed on-chain via `Entrypoint.latestRoot()`. Use this value as the proof's `aspRoot`. `null` when no root has been pushed on-chain for the pool yet. |

**Root parity check:** The proof's `aspRoot` must exactly match `Entrypoint.latestRoot()`. Always verify:

```typescript
import { createPublicClient, http } from "viem";

const entrypointAbi = [{
  name: "latestRoot",
  type: "function",
  inputs: [],
  outputs: [{ type: "uint256" }],
  stateMutability: "view",
}] as const;

const aspRoot = BigInt(onchainMtRoot);
const client = createPublicClient({ chain, transport: http(rpcUrl) });
const onChainLatest = await client.readContract({
  address: entrypointAddress,
  abi: entrypointAbi,
  functionName: "latestRoot",
});
if (aspRoot !== onChainLatest) {
  throw new Error("ASP root mismatch, re-fetch and retry");
}
```

If `mtRoot !== onchainMtRoot`, the ASP has computed a new root that has not been pushed on-chain yet. The `mt-leaves` endpoint returns leaves corresponding to `mtRoot`, so wait and re-fetch until the two values converge before building a proof.

### `GET /{chainId}/public/mt-leaves`

Returns both the ASP-approved labels and the state tree commitment hashes for a pool.

**Required header:** `X-Pool-Scope`

**Response:**

```json
{
  "aspLeaves": ["123456...", "789012..."],
  "stateTreeLeaves": ["345678...", "901234..."]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `aspLeaves` | `string[]` | Approved labels as decimal bigint strings, in tree insertion order. |
| `stateTreeLeaves` | `string[]` | All commitment hashes as decimal bigint strings, in tree insertion order. |

No pagination. The full leaf arrays are returned in a single response.

:::note External ASPs
Some integrations merge leaves from more than one ASP source. In those cases, merge the leaf sets, remove duplicates, sort them in ascending bigint order, and build the ASP Merkle proof from that merged set.
:::

**Checking if a deposit is ASP-approved:**

```typescript
const { aspLeaves } = await res.json();
const isApproved = aspLeaves.includes(label.toString());
```

Until a deposit is approved, private withdrawal is unavailable. [Ragequit](/protocol/ragequit) remains available as the public self-custodial exit back to the original deposit address.

### `GET /{chainId}/health/liveness`

Returns the health status of the ASP API for a given chain.

**Response:**

```json
{
  "status": "ok"
}
```

### `GET /{chainId}/health/asp`

Returns pool-level leaf counts, useful for sanity-checking whether the ASP is indexing a given pool.

**Response:**

```json
{
  "status": "ok",
  "currentLeaves": [
    { "poolId": 1, "totalLeaves": 6229 },
    { "poolId": 6, "totalLeaves": 749 }
  ]
}
```

### `GET /global/public/entrypoints`

Returns all chains with their entrypoint contract addresses and deployment start blocks. Useful for programmatic chain discovery.

**Response:**

```json
{
  "chains": {
    "ethereum": {
      "entrypoint": "0x6818...",
      "fromBlock": 22167294,
      "chainId": "1"
    }
  },
  "cacheTimestamp": "2026-03-24T17:44:00.772Z"
}
```

The `fromBlock` in this response is the entrypoint deployment block, which may be later than the optimal `startBlock` for event scanning. Always use the `startBlock` values from the [Deployments](/deployments) page for `DataService` initialization.

### `GET /{chainId}/public/deposits-larger-than`

Returns the number of deposits above a given amount threshold for a pool. Useful for anonymity set estimation.

**Required header:** `X-Pool-Scope`

**Required query parameter:** `amount` (decimal bigint string in the token's smallest unit, e.g. `"1000000000000000000"` for 1 ETH)

**Response:**

```json
{
  "eligibleDeposits": 518,
  "totalDeposits": 2859,
  "percentage": 18.12,
  "amount": "1000000000000000000",
  "scope": "4916574638117198869413701114161172350986437430914933850166949084132905299523",
  "rank": 189,
  "uniqueAmountsAbove": 189
}
```

| Field | Type | Description |
|-------|------|-------------|
| `eligibleDeposits` | `number` | Count of deposits at or above the threshold. |
| `totalDeposits` | `number` | Total deposit count in the pool. |
| `percentage` | `number` | `eligibleDeposits / totalDeposits * 100` (may be fractional). |
| `amount` | `string` | Echo of the queried amount threshold (decimal bigint string). |
| `scope` | `string` | Echo of the pool scope used for the query (decimal bigint string). |
| `rank` | `number` | Ordinal rank of the queried amount among unique deposit amounts. |
| `uniqueAmountsAbove` | `number` | Count of distinct deposit amounts above the threshold. |

## Error Handling

| Status Code | Meaning |
|-------------|---------|
| 400 | Missing `X-Pool-Scope` header. Message: `"Pool scope is required in X-Pool-Scope header"`. |
| 404 | `X-Pool-Scope` present but does not match any known pool (including hex-encoded scope values). |
| 403 / 429 | Rate limiting. Retry with exponential backoff. |

Rate-limit details are not published. Retry with exponential backoff.

## On-Chain Supplemental Access

For direct on-chain reads without the HTTP API:

- **Latest root:** `Entrypoint.latestRoot()` (selector: `0xd7b0fef1`)
- **Historical roots:** `Entrypoint.rootByIndex(index)` returns the root at a given index. `Entrypoint.associationSets(index)` returns `(root, ipfsCID, timestamp)`.
- **IPFS CID:** `associationSets(index).ipfsCID` returns the IPFS CID containing the label set for a given root index.

For how these endpoints fit into the withdrawal flow, see [Frontend Integration](/build/integration).
