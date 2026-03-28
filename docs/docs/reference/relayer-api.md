---
sidebar_label: Relayer API
sidebar_position: 5
title: Relayer API Reference
description: "HTTP API reference for the Privacy Pools relayer, including quote, relay request, and details endpoints."
keywords:
  - privacy pools
  - relayer
  - relay
  - API
  - withdrawal
  - fee quote
  - fastrelay
---

The relayer is a separate service from the [ASP API](/reference/asp-api). It submits `Entrypoint.relay()` transactions on behalf of users, so that the on-chain sender is the relayer, not the withdrawer.

The public production relayer is operated by Fat Solutions. The relayer code is open-source (`packages/relayer` in the monorepo) and anyone can host their own instance.

## Hosts

| Environment | Host |
|-------------|------|
| Mainnet (Ethereum, Arbitrum, OP Mainnet) | `https://fastrelay.xyz` |
| Testnet (Sepolia, OP Sepolia) | `https://testnet-relayer.privacypools.com` |

### Host Selection

```typescript
function getRelayerHost(chainId: number): string {
  const hosts: Record<number, string> = {
    1:        "https://fastrelay.xyz",
    42161:    "https://fastrelay.xyz",
    10:       "https://fastrelay.xyz",
    11155111: "https://testnet-relayer.privacypools.com",
    11155420: "https://testnet-relayer.privacypools.com",
  };
  const host = hosts[chainId];
  if (!host) throw new Error(`No relayer host configured for chainId ${chainId}`);
  return host;
}
```

## Endpoints

### `POST /relayer/quote`

Returns a fee quote for a relayed withdrawal. When `recipient` is included, the response contains a signed `feeCommitment` that must be passed to `/relayer/request`.

**Example request (Sepolia, fee estimate only):**

```bash
curl -s -X POST https://testnet-relayer.privacypools.com/relayer/quote \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 11155111,
    "amount": "1000000000000000000",
    "asset": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "extraGas": false
  }'
```

**Example response (fee estimate only):**

```json
{
  "baseFeeBPS": "10",
  "feeBPS": "17",
  "gasPrice": "1089675357",
  "detail": {
    "relayTxCost": {
      "gas": "650000",
      "eth": "708288982050000"
    }
  }
}
```

**Example request (Sepolia, with recipient for signed commitment):**

```bash
curl -s -X POST https://testnet-relayer.privacypools.com/relayer/quote \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 11155111,
    "amount": "1000000000000000000",
    "asset": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "extraGas": false,
    "recipient": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  }'
```

**Example response (with signed commitment):**

```json
{
  "baseFeeBPS": "10",
  "feeBPS": "17",
  "gasPrice": "1089675357",
  "detail": {
    "relayTxCost": {
      "gas": "650000",
      "eth": "708288982050000"
    }
  },
  "feeCommitment": {
    "expiration": 1744676669549,
    "withdrawalData": "0x000000000000000000000000349746ab142b5d0d65899d9bcb6f2cd53ab084d80000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045000000000000000000000000000000000000000000000000000110d9316ec000",
    "asset": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "amount": "1000000000000000000",
    "extraGas": false,
    "signedRelayerCommitment": "0xa1b2c3...signed_bytes...f4e5d6"
  }
}
```

**Request body:**

```json
{
  "chainId": 1,
  "amount": "1000000000000000000",
  "asset": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  "extraGas": false,
  "recipient": "0xRecipientAddress"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chainId` | `number` | Yes | Target chain ID. |
| `amount` | `string` | Yes | Withdrawal amount as a decimal bigint string in the token's smallest unit. |
| `asset` | `string` | Yes | Asset address. Use `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` for ETH. |
| `extraGas` | `boolean` | No | When `true`, requests an additional native gas-token drop as part of the withdrawal. Only supported for non-native assets. Native-asset quotes must use `false`. Defaults to `false` when omitted. |
| `recipient` | `string` | No | Final recipient address. When provided, the response includes a signed `feeCommitment`. Omit for a fee estimate only. |

**Response (without recipient, fee estimate only):**

```json
{
  "baseFeeBPS": "10",
  "feeBPS": "17",
  "gasPrice": "1089675357",
  "detail": {
    "relayTxCost": {
      "gas": "650000",
      "eth": "708288982050000"
    }
  }
}
```

**Response (with recipient, includes signed commitment):**

```json
{
  "baseFeeBPS": "10",
  "feeBPS": "17",
  "gasPrice": "1089675357",
  "detail": {
    "relayTxCost": {
      "gas": "650000",
      "eth": "708288982050000"
    }
  },
  "feeCommitment": {
    "expiration": 1744676669549,
    "withdrawalData": "0x...",
    "asset": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "amount": "1000000000000000000",
    "extraGas": false,
    "signedRelayerCommitment": "0x..."
  }
}
```

| Response Field | Type | Description |
|----------------|------|-------------|
| `baseFeeBPS` | `string` | Fixed relayer fee component in basis points. |
| `feeBPS` | `string` | Total fee in basis points (includes gas cost component). |
| `gasPrice` | `string` | Current gas price used for the quote. |
| `detail.relayTxCost.gas` | `string` | Estimated gas units for the relay transaction. |
| `detail.relayTxCost.eth` | `string` | Estimated gas cost in wei. |
| `detail.extraGasFundAmount.gas` | `string` | Gas units for the extra native-gas drop. Only present when `extraGas: true`. |
| `detail.extraGasFundAmount.eth` | `string` | Cost of the extra gas drop in wei. Only present when `extraGas: true`. |
| `detail.extraGasTxCost.gas` | `string` | Gas units for the extra-gas transfer transaction. Only present when `extraGas: true`. |
| `detail.extraGasTxCost.eth` | `string` | Cost of the extra-gas transfer in wei. Only present when `extraGas: true`. |
| `feeCommitment` | `object` | Signed fee commitment (only present when `recipient` is provided). |

ABI-encode `withdrawal.data` client-side as `(address recipient, address feeRecipient, uint256 relayFeeBPS)` using `feeReceiverAddress` from `GET /relayer/details` and `feeBPS` from the quote. The `feeCommitment.withdrawalData` field is for the relayer's internal use — do not substitute it for your client-encoded value, as the proof's `context` is bound to the exact encoding you produce. See [Frontend Integration](/build/integration) for the complete code.

### Quote Lifecycle

The `feeCommitment` expires approximately **60 seconds** after the quote response. The full flow (quote, proof generation, relay request) must complete within this window. Proof generation typically takes 5 to 15 seconds in Node.js.

**Re-quote triggers:** Discard the quote and request a new one whenever any of the following change:

- Withdrawal amount
- Recipient address
- Relayer selection
- `extraGas` toggle

**Fee validation:** Before using the quoted fee, verify it does not exceed the on-chain maximum:

```typescript
const assetConfig = await contracts.getAssetConfig(assetAddress);
if (BigInt(quote.feeBPS) > assetConfig.maxRelayFeeBPS) {
  throw new Error("Quoted fee exceeds on-chain maximum");
}
```

### `POST /relayer/request`

Submits a relayed withdrawal to the relayer for on-chain execution.

**Request body:**

```json
{
  "chainId": 1,
  "scope": "123456789012345678901234567890",
  "withdrawal": {
    "processooor": "0xEntrypointAddress",
    "data": "0x..."
  },
  "proof": {
    "pi_a": ["...", "...", "..."],
    "pi_b": [["...", "..."], ["...", "..."], ["...", "..."]],
    "pi_c": ["...", "...", "..."]
  },
  "publicSignals": ["0", "1", "2", "3", "4", "5", "6", "7"],
  "feeCommitment": {
    "expiration": 1744676669549,
    "withdrawalData": "0x...",
    "asset": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "extraGas": false,
    "amount": "1000000000000000000",
    "signedRelayerCommitment": "0x..."
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chainId` | `number` | Yes | Target chain ID. |
| `scope` | `string \| number` | Yes | Pool scope as a **decimal** bigint string (not hex). Always use string since most scopes exceed JavaScript's safe integer limit (`2^53 - 1`). |
| `withdrawal` | `object` | Yes | The `Withdrawal` struct. `processooor` must be the Entrypoint address. `data` is ABI-encoded `RelayData`. |
| `proof` | `object` | Yes | ZK proof. `pi_a` / `pi_c`: 3-element string arrays. `pi_b`: 3x2-element string array. Extra fields like `protocol` and `curve` are accepted and ignored. |
| `publicSignals` | `string[]` | Yes | Exactly 8 elements. |
| `feeCommitment` | `object` | No | Signed fee commitment from `/relayer/quote`. Optional at schema level, but should be included for production relayed withdrawals. When present, all 6 fields are required. |

**Success response (HTTP 200):**

```json
{
  "success": true,
  "txHash": "0x...",
  "timestamp": 1744676669549,
  "requestId": "uuid",
  "txSwap": "0x..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | `true` when the relay transaction was broadcast. |
| `txHash` | `string` | Transaction hash of the relay call. |
| `timestamp` | `number` | Unix timestamp (ms) of the response. |
| `requestId` | `string` | UUID for this relay request. |
| `txSwap` | `string \| undefined` | Transaction hash of the Uniswap swap for the native-gas drop. Only present when `extraGas` was `true` and the swap succeeded. |

**Failure response (HTTP 200):**

```json
{
  "success": false,
  "error": "description of failure",
  "requestId": "uuid",
  "timestamp": 1744676669549
}
```

:::warning The relayer returns HTTP 200 for failures
The relayer returns HTTP 200 for both success and application-level failures (bad proof, expired `feeCommitment`, context mismatch). Pre-processing errors (bad schema, unsupported chain, gas price too high) return non-200 status codes.
:::

Always check `result.success` after verifying the HTTP status:

```typescript
if (!res.ok) {
  throw new Error(`Relayer HTTP error: ${res.status}`);
}
const result = await res.json();
if (!result.success) {
  throw new Error(`Relayer rejected: ${result.error}`);
}
```

The relayer API does not support cancellation.

### Handling Failures

| Scenario | Response | Action |
|----------|----------|--------|
| Bad proof | HTTP 200, `success: false` | Regenerate proof with fresh roots and re-quote |
| Expired fee commitment | HTTP 200, `success: false` | Re-quote via `POST /relayer/quote`, then resubmit |
| Context mismatch | HTTP 200, `success: false` | Verify `withdrawal.data` was ABI-encoded with the correct `(recipient, feeRecipient, relayFeeBPS)` values |
| Stale ASP root | On-chain `IncorrectASPRoot` revert | Re-fetch ASP roots, verify parity, regenerate proof |
| Schema or validation error | HTTP 4xx | Fix request payload per error message |
| Relayer overloaded | HTTP 5xx | Retry after backoff |

For proof, quote, or context failures where no transaction was broadcast, discard the current quote and start from `POST /relayer/quote`.

:::info
If the response includes a `txHash` (the withdrawal landed but the optional gas-token swap failed), the withdrawal itself succeeded. Do not retry the withdrawal.
:::

### `GET /relayer/details`

Returns relayer configuration for a specific chain and asset. Use this to check asset support, fee receiver address, and minimum withdrawal amounts.

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chainId` | `number` | Yes | Target chain ID. |
| `assetAddress` | `string` | Yes | Asset contract address. |

**Example request (Sepolia, native ETH):**

```bash
curl -s "https://testnet-relayer.privacypools.com/relayer/details?chainId=11155111&assetAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
```

**Response:**

```json
{
  "chainId": 11155111,
  "feeBPS": "10",
  "minWithdrawAmount": "100",
  "feeReceiverAddress": "0x349746Ab142B5d0D65899d9bcB6f2Cd53AB084d8",
  "assetAddress": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  "maxGasPrice": "10000000000000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `chainId` | `number` | Chain ID. |
| `feeBPS` | `string` | Fixed fee component in basis points. |
| `minWithdrawAmount` | `string` | Minimum withdrawal amount (in token smallest unit). |
| `feeReceiverAddress` | `string` | Address that receives the relay fee. For standard withdrawals, use this as `feeRecipient` in `RelayData`. When using `feeCommitment` from the quote, the `withdrawalData` already encodes the correct fee routing. |
| `assetAddress` | `string` | Asset address. |
| `maxGasPrice` | `string \| null` | Maximum gas price the relayer will accept. `null` when not configured for the chain. |

### Minimum Withdrawal Validation

Before proceeding with a relayed withdrawal, check:

1. `withdrawalAmount >= minWithdrawAmount`
2. If partial withdrawal: the remaining balance should be either `0` or `>= minWithdrawAmount`. If the remainder would be non-zero but below the minimum, warn the user and offer alternatives (withdraw less, withdraw the full balance, or plan a later public exit for the remainder).

For how these endpoints fit into the full withdrawal flow, see [Frontend Integration](/build/integration).
