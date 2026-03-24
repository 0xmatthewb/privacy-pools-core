---
sidebar_label: ASP API
sidebar_position: 5
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

:::caution Engineer Confirmation Needed
The ASP API response shapes documented here are based on observed behavior and SDK integration patterns. The live API may diverge from the published Swagger schema on some endpoints (`mt-roots`, event listings, `pool-info`). Use the concrete response shapes below when parsing responses, and test against the live API before shipping.
:::

## Base URLs

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
| `onchainMtRoot` | `string` | The root value currently committed on-chain via `Entrypoint.latestRoot()`. Use this value as the proof's `aspRoot`. |

**Root parity check:** The proof's `aspRoot` must exactly match `Entrypoint.latestRoot()`. Always verify:

```typescript
import { createPublicClient, http } from "viem";
import { IEntrypointABI } from "@0xbow/privacy-pools-core-sdk";

const aspRoot = BigInt(onchainMtRoot);
const client = createPublicClient({ chain, transport: http(rpcUrl) });
const onChainLatest = await client.readContract({
  address: entrypointAddress,
  abi: IEntrypointABI,
  functionName: "latestRoot",
});
if (aspRoot !== onChainLatest) {
  throw new Error("ASP root mismatch — re-fetch and retry");
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

**Checking if a deposit is ASP-approved:**

```typescript
const { aspLeaves } = await res.json();
const isApproved = aspLeaves.includes(label.toString());
```

Most deposits are approved within 1 hour, though some may take up to 7 days. While unapproved, [ragequit](/protocol/ragequit) is the only exit path.

### `GET /{chainId}/health/liveness`

Returns the health status of the ASP API for a given chain. Use before making data calls to verify the service is reachable.

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
  }
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
  "eligibleDeposits": 42,
  "totalDeposits": 150,
  "percentage": 28,
  "rank": 5,
  "uniqueAmountsAbove": 12
}
```

| Field | Type | Description |
|-------|------|-------------|
| `eligibleDeposits` | `number` | Count of deposits at or above the threshold. |
| `totalDeposits` | `number` | Total deposit count in the pool. |
| `percentage` | `number` | `eligibleDeposits / totalDeposits * 100`. |
| `rank` | `number` | Ordinal rank of the queried amount among unique deposit amounts. |
| `uniqueAmountsAbove` | `number` | Count of distinct deposit amounts above the threshold. |

## Error Handling

| Status Code | Meaning |
|-------------|---------|
| 400 | Missing `X-Pool-Scope` header. Message: `"Pool scope is required in X-Pool-Scope header"`. |
| 404 | `X-Pool-Scope` present but does not match any known pool (including hex-encoded scope values). |
| 403 / 429 | Rate limiting. Retry with exponential backoff. |

Rate-limit details are not published. Treat HTTP 403, 429, or any equivalent throttle response as a backoff signal.

## On-Chain Supplemental Access

For direct on-chain reads without the HTTP API:

- **Latest root:** `Entrypoint.latestRoot()` (selector: `0xd7b0fef1`)
- **Historical root access:** Admin-only.
- **IPFS CID:** `associationSets(index).ipfsCID` returns the IPFS CID containing the label set for a given root index.
