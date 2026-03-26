---
sidebar_label: Errors & Constraints
sidebar_position: 6
title: Errors and Constraints
description: "Contract revert reasons, SDK error patterns, and common integration pitfalls for Privacy Pools."
keywords:
  - privacy pools
  - errors
  - revert
  - constraints
  - troubleshooting
  - integration
---

When a transaction, proof, or event scan fails, this is the page to open. It ties the guide-level symptoms back to the exact contract and SDK rules.

For the contract interface definitions where these errors originate, see [Contracts Interfaces](/reference/contracts).

:::info Use this page for
- exact revert names and the conditions that usually trigger them
- the most common proof-submission and event-scan failures
- checking whether an issue belongs to a lifecycle guide or the exact contract rules

Verified against the current contracts package, SDK v1.2.0, and the integration guidance in these docs.
:::

:::tip Most common during integration
Focus on `ContextMismatch`, `UnknownStateRoot`, and `IncorrectASPRoot`, which are the most common proof-submission failures. See [Common Integration Mistakes](#common-integration-mistakes) at the bottom of this page for debugging guidance.
:::

## Contract Revert Reasons

### PrivacyPool Errors

These errors are defined in `IPrivacyPool.sol` and triggered during deposit, withdrawal, or ragequit operations on the pool contract.

| Error | Triggered By | Description |
|-------|-------------|-------------|
| `InvalidProcessooor` | `withdraw` | `msg.sender != withdrawal.processooor`. For direct withdrawal, the signer must match. For relayed withdrawal, the Entrypoint contract is the caller. |
| `ContextMismatch` | `withdraw` | The proof's `context` signal does not match `keccak256(abi.encode(withdrawal, SCOPE)) % SNARK_SCALAR_FIELD`. Usually caused by constructing the `Withdrawal` object with the wrong `processooor` or `data`, or using the wrong pool scope. |
| `InvalidTreeDepth` | `withdraw` | State tree depth or ASP tree depth in the proof exceeds `MAX_TREE_DEPTH`. The SDK uses `32n` for both, which is the circuit maximum. |
| `UnknownStateRoot` | `withdraw` | The proof's state root is not in the pool's recent root history. The contract keeps the last 64 roots in a circular buffer. Re-fetch the current state root and regenerate the proof. |
| `IncorrectASPRoot` | `withdraw` | The proof's ASP root does not exactly match `Entrypoint.latestRoot()`. Unlike state roots, the ASP root must be the **latest** value, not just a recent one. Re-fetch from the [ASP API](/reference/asp-api) and verify parity before submitting. |
| `InvalidProof` | `withdraw`, `ragequit` | The Groth16 verifier rejected the proof. Check that all proof inputs (commitment values, Merkle proofs, roots) are correct and consistent. |
| `InvalidCommitment` | `ragequit` | The commitment hash from the proof is not present in the pool's state tree. |
| `OnlyOriginalDepositor` | `ragequit` | `depositors[label] != msg.sender`. Only the address that made the original deposit can call ragequit for that commitment. |
| `InvalidDepositValue` | `deposit` | Deposit value is `>= type(uint128).max`. |
| `PoolIsDead` | `deposit`, pool admin | The pool has been permanently suspended by the Entrypoint. |

### Pool Variant Errors

These errors are defined in `IPrivacyPoolSimple` (native-asset pools) and `IPrivacyPoolComplex` (ERC-20 pools).

| Error | Pool Type | Description |
|-------|-----------|-------------|
| `InsufficientValue` | Native asset | `msg.value` is less than the required deposit amount. |
| `FailedToSendNativeAsset` | Native asset | ETH transfer to the depositor or ragequitter failed (e.g. the recipient is a contract that reverts on `receive`). |
| `NativeAssetNotAccepted` | ERC-20 | ETH was sent (`msg.value > 0`) to a pool that only accepts ERC-20 tokens. |
| `NativeAssetNotSupported` | ERC-20 | Attempted to deploy or configure an ERC-20 pool with the native asset address. |

### Entrypoint Errors

These errors are defined in `IEntrypoint.sol` and triggered during relay, deposit routing, or admin operations.

| Error | Triggered By | Description |
|-------|-------------|-------------|
| `InvalidProcessooor` | `relay` | `withdrawal.processooor != address(this)`. For relayed withdrawals, `processooor` must be the Entrypoint address. |
| `InvalidWithdrawalAmount` | `relay` | Withdrawn value is zero. |
| `PoolNotFound` | `relay`, `deposit` | No pool is registered for the given scope or asset. |
| `RelayFeeGreaterThanMax` | `relay` | `relayFeeBPS > assetConfig.maxRelayFeeBPS`. The quoted fee exceeds the on-chain maximum for this asset. |
| `MinimumDepositAmount` | `deposit` | `value < minimumDepositAmount` for the asset. |
| `PrecommitmentAlreadyUsed` | `deposit` | The precommitment hash has already been used in a previous deposit. Increment your deposit index and recompute the precommitment. |
| `NativeAssetTransferFailed` | `relay` | ETH transfer to the recipient or fee recipient failed. |
| `NoRootsAvailable` | `latestRoot` | No ASP root has been published yet. Called `latestRoot()` before the first `updateRoot` transaction. Wait for the ASP to push an initial root. |
| `InvalidPoolState` | `relay` | Post-relay balance integrity check failed. The pool's asset balance is less than expected after processing the withdrawal. |
| `NativeAssetNotAccepted` | `receive` | ETH was sent to the Entrypoint by an address other than the registered native-asset pool. Only the pool contract can send ETH to the Entrypoint (during withdrawal processing). |
| `AssetMismatch` | admin | Pool asset does not match the registered asset. |

### State Errors

These errors are defined in `IState.sol` and triggered by internal state operations.

| Error | Triggered By | Description |
|-------|-------------|-------------|
| `NullifierAlreadySpent` | `withdraw`, `ragequit` | The commitment's nullifier has already been spent. This commitment was already exited via withdrawal or ragequit. Withdrawal and ragequit are mutually exclusive on the same commitment. |
| `NotYetRagequitteable` | - | Reserved. Not enforced in the current implementation. |
| `OnlyEntrypoint` | internal | A function restricted to the Entrypoint was called by another address. |
| `MaxTreeDepthReached` | `deposit` | The state Merkle tree has reached its maximum capacity. |

## SDK Error Patterns

### Proof Generation Failures

- **`MERKLE_ERROR`**: The target leaf is not present in the provided leaf array. Common causes: wrong pool scope, stale data, or the deposit has not been indexed yet. If no deposits have been approved for a new pool, `aspLeaves` will be empty and `generateMerkleProof` will throw this error.
- **Circuit errors from invalid inputs**: If `withdrawalAmount > committedValue`, the circuit produces a cryptic error during proof generation rather than a clear validation message. Always validate `withdrawalAmount > 0n && withdrawalAmount <= committedValue` before calling `proveWithdrawal`.

### Root Staleness

See the [State Root vs ASP Root](/protocol/withdrawal#state-root-vs-asp-root) comparison for root validation rules.

## Common Integration Mistakes

### Confusing State Root and ASP Root

These are two separate Merkle trees with different sources and validation rules:

| | State Root | ASP Root |
|---|-----------|----------|
| **Source** | Pool `currentRoot()` read directly from `IPrivacyPool` | ASP API `onchainMtRoot` from `GET /{chainId}/public/mt-roots` |
| **On-chain check** | Must be one of the last 64 known roots | Must exactly equal `Entrypoint.latestRoot()` |
| **Contains** | Commitment hashes | Approved labels |
| **Error on mismatch** | `UnknownStateRoot` | `IncorrectASPRoot` |

### Using Hex for X-Pool-Scope

The `X-Pool-Scope` header must be a decimal string. Hex-encoded scope values will not match any pool (the API treats the header as a literal string lookup), and the API returns 404 rather than a validation error.

```typescript
// Wrong: hex string, API returns 404
const scope = '0x1a2b3c';
headers['X-Pool-Scope'] = scope;

// Right: decimal string
const scope = 1715004n; // or whatever the pool scope is
headers['X-Pool-Scope'] = scope.toString(); // "1715004"
```

### Scanning Events from Genesis

Always use the deployment `startBlock` from [Deployments](/deployments).

### Submitting Duplicate Precommitments

Each precommitment hash can only be used once on-chain. If a deposit transaction reverts or is never mined, the precommitment is not consumed, so you can retry with the same index. Only increment the index after a confirmed successful deposit.

### Forgetting to Refresh After a Withdrawal

After a withdrawal, a new reduced-value or zero-value change commitment may be inserted into the state tree. Before generating the next withdrawal proof, re-fetch state tree leaves and rebuild the Merkle proof.

- Using stale leaves will produce an invalid state root.

### Using Raw Event Value Instead of Committed Value

The `Deposited` event's `value` field is the post-fee amount (after `vettingFeeBPS` deduction). Always use this value, not the original `amount` sent in the deposit transaction, when reconstructing commitments or computing withdrawal amounts.
