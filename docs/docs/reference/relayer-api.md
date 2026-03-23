---
sidebar_label: Relayer API
sidebar_position: 6
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

The relayer is a separate service from the [ASP API](/reference/asp-api). It submits `Entrypoint.relay()` transactions on behalf of users, enabling privacy-preserving withdrawals where the on-chain transaction sender is the relayer rather than the user.

The public production relayer is operated by Fat Solutions. The relayer code is open-source (`packages/relayer` in the monorepo) and anyone can host their own instance.

## Base URLs

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
| `extraGas` | `boolean` | Yes | When `true`, requests an additional native gas-token drop as part of the withdrawal. Only supported for non-native assets. Native-asset quotes must use `false`. |
| `recipient` | `string` | No | Final recipient address. When provided, the response includes a signed `feeCommitment`. Omit for a fee estimate only. |

**Response (without recipient -- fee estimate only):**

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

**Response (with recipient -- includes signed commitment):**

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
| `baseFeeBPS` | `string` | Base relayer fee in basis points. |
| `feeBPS` | `string` | Total fee in basis points (includes gas cost component). |
| `gasPrice` | `string` | Current gas price used for the quote. |
| `detail.relayTxCost.gas` | `string` | Estimated gas units for the relay transaction. |
| `detail.relayTxCost.eth` | `string` | Estimated gas cost in wei. |
| `detail.extraGasFundAmount.gas` | `string` | Gas units for the extra native-gas drop. Only present when `extraGas: true`. |
| `detail.extraGasFundAmount.eth` | `string` | Cost of the extra gas drop in wei. Only present when `extraGas: true`. |
| `detail.extraGasTxCost.gas` | `string` | Gas units for the extra-gas transfer transaction. Only present when `extraGas: true`. |
| `detail.extraGasTxCost.eth` | `string` | Cost of the extra-gas transfer in wei. Only present when `extraGas: true`. |
| `feeCommitment` | `object` | Signed fee commitment (only present when `recipient` is provided). |

### Quote Lifecycle

The `feeCommitment` expires approximately **60 seconds** after the quote response. The full flow -- quote, proof generation, relay request -- must complete within this window. Proof generation typically takes 5--15 seconds in Node.js.

**Re-quote triggers:** Discard the quote and request a new one whenever any of the following change:

- Withdrawal amount
- Recipient address
- Relayer selection
- `extraGas` toggle
- Quote expiration

After re-quoting, require the user to review and confirm again before proof generation.

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
| `scope` | `string \| number` | Yes | Pool scope as a **decimal** bigint string (not hex). `number` is also accepted but string is recommended for large values that exceed `Number.MAX_SAFE_INTEGER`. |
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
  "requestId": "uuid"
}
```

**Failure response (HTTP 200):**

```json
{
  "success": false,
  "error": "description of failure",
  "requestId": "uuid"
}
```

**Important:** The relayer returns HTTP 200 for both success and application-level failures (bad proof, expired `feeCommitment`, context mismatch). Pre-processing errors (bad schema, unsupported chain, gas price too high) return non-200 status codes.

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

The relayer API does not support cancellation. If a `feeCommitment` has expired, request a new quote.

### `GET /relayer/details`

Returns relayer configuration for a specific chain and asset. Use this to check asset support, fee receiver address, and minimum withdrawal amounts.

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chainId` | `number` | Yes | Target chain ID. |
| `assetAddress` | `string` | Yes | Asset contract address. |

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
| `feeBPS` | `string` | Base fee in basis points. |
| `minWithdrawAmount` | `string` | Minimum withdrawal amount (in token smallest unit). |
| `feeReceiverAddress` | `string` | Address that receives the relay fee. Use this as the `feeRecipient` in `RelayData`. |
| `assetAddress` | `string` | Asset address. |
| `maxGasPrice` | `string \| null` | Maximum gas price the relayer will accept. `null` when not configured for the chain. |

### Minimum Withdrawal Validation

Before proceeding with a relayed withdrawal, check:

1. `withdrawalAmount >= minWithdrawAmount`
2. If partial withdrawal: the remaining balance should be either `0` or `>= minWithdrawAmount`. If the remainder would be non-zero but below the minimum, warn the user and offer alternatives (withdraw less, withdraw the full balance, or plan a later public exit for the remainder).
