---
sidebar_label: Frontend Integration
sidebar_position: 2
title: Frontend Integration
slug: /build/integration
description: Step-by-step guide for integrating Privacy Pools deposits, withdrawals, and ragequits into a frontend or dapp.
keywords: [privacy pools, frontend, deposit, withdrawal, ragequit, SDK, integration]
---

## Key References

| Page | What you will find |
|---|---|
| [Deployments](/deployments) | Contract addresses and `startBlock` per chain |
| [SDK Utilities](/reference/sdk) | SDK types, methods, and account reconstruction |
| [Deposit](/protocol/deposit), [Withdrawal](/protocol/withdrawal), [Ragequit](/protocol/ragequit) | On-chain mechanics for each protocol flow |
| [UX Patterns](/build/ux-patterns) | Frontend patterns for accounts, deposits, withdrawals, and ragequit |
| [ASP API](/reference/asp-api), [Relayer API](/reference/relayer-api) | Endpoint schemas and response shapes |

## Minimal Frontend Recipe

**Install:** `npm install @0xbow/privacy-pools-core-sdk viem`

**Serve circuit artifacts:** copy the SDK's circuit files to your app's public directory so the browser can fetch them at runtime:

```bash
cp node_modules/@0xbow/privacy-pools-core-sdk/dist/node/artifacts/*.{wasm,zkey,vkey} public/artifacts/
```

1. **Load deployment data**
   - Read chain-specific contract addresses and `startBlock` from [Deployments](/deployments)
   - You need: `Entrypoint`, `PrivacyPool`, and `Verifier` addresses for the target chain and asset scope

2. **Initialize SDK and contract helpers**
   - Create a `DataService` with a `ChainConfig[]` array (each entry carries `chainId`, `privacyPoolAddress`, `startBlock`, and `rpcUrl`) so event scans start from the deployment block
   - In browser dapps, use a viem `WalletClient` plus the relevant contract ABI for writes
   - Reserve `sdk.createContractInstance(rpcUrl, chain, entrypointAddress, privateKey)` for server-side signers

3. **Bootstrap account state**
   - New accounts: `new AccountService(dataService, { mnemonic })`
   - Returning users: `AccountService.initializeWithEvents(dataService, { mnemonic }, pools)` to restore from on-chain events
   - Returns `{ account, legacyAccount?, errors }` so restores can reconcile migrated histories (see [SDK Utilities](/reference/sdk#account-reconstruction))

4. **Deposit**
   - Derive deposit secrets using `accountService.createDepositSecrets(scope, index)`
   - Simulate the deposit transaction with `publicClient.simulateContract(...)`, then execute with `walletClient.writeContract(request)`
   - Persist the confirmed `Deposited` event's `label` and post-fee `value` into local pool-account state (see [Account Reconstruction](/reference/sdk#account-reconstruction) for the full shape)
   - Wait for ASP approval before attempting withdrawal

5. **Perform the relayed withdrawal**
   1. **Fetch ASP roots and verify convergence:** call `GET /{chainId}/public/mt-roots` (with decimal `X-Pool-Scope`). If `onchainMtRoot` is `null` or `mtRoot !== onchainMtRoot`, stop — the ASP tree has not converged on-chain yet. Once they match, confirm `onchainMtRoot` equals `Entrypoint.latestRoot()` exactly
   2. **Request a relayer quote:** `POST /relayer/quote` to obtain a signed `feeCommitment`. The quote's `feeCommitment.withdrawalData` determines `withdrawal.data` and the proof `context`
   3. **Build Merkle proofs:** generate `stateMerkleProof` from pool state leaves (keyed by commitment hash) and `aspMerkleProof` from ASP leaves (keyed by label)
   4. **Generate the withdrawal proof:** call `proveWithdrawal` with the Merkle proofs, verified roots, withdrawal amount, relayer-provided context, change secrets from `accountService.createWithdrawalSecrets(commitment)`, and tree depth `32n` for both state and ASP trees
   5. **Submit via relayer:** send the proof to `POST /relayer/request` before the quote expires. Use `https://fastrelay.xyz` on production chains and `https://testnet-relayer.privacypools.com` on testnets

6. **Refresh state after withdrawal**
   - Re-scan events to pick up the new change commitment
   - Insert it into local account state before generating another proof

### Quick Start Code

```typescript
import {
  PrivacyPoolSDK,
  DataService,
  AccountService,
  Circuits,
} from "@0xbow/privacy-pools-core-sdk";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";

// 1. Initialize SDK with circuit artifacts (set baseUrl for browser)
const sdk = new PrivacyPoolSDK(
  new Circuits({ baseUrl: window.location.origin })
);

// 2. Create DataService for reading on-chain events
const dataService = new DataService([
  {
    chainId: 11155111,
    privacyPoolAddress: "0x..." as `0x${string}`, // from /deployments
    startBlock: 123456n,                           // from /deployments
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
  },
]);

// 3. Create clients
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http("https://sepolia.infura.io/v3/YOUR_KEY"),
});
const walletClient = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum!),
});

// 4. Create an AccountService from a recovery phrase
const accountService = new AccountService(dataService, {
  mnemonic: "your recovery phrase ...",
});

// 5. Read the pool scope and derive deposit secrets
const scope = await publicClient.readContract({
  address: "0x..." as `0x${string}`, // pool address
  abi: [{
    name: "SCOPE",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  }],
  functionName: "SCOPE",
});
// Index = number of existing pool accounts for this scope (0n for first deposit)
const { precommitment } = accountService.createDepositSecrets(scope, 0n);

// 6. Simulate then deposit ETH via the Entrypoint
const entrypointAddress = "0x..." as `0x${string}`; // Entrypoint (Proxy) from /deployments
const [account] = await walletClient.getAddresses();
const { request } = await publicClient.simulateContract({
  account,
  address: entrypointAddress,
  abi: [{
    name: "deposit",
    type: "function",
    inputs: [{ name: "_precommitment", type: "uint256" }],
    outputs: [{ name: "_commitment", type: "uint256" }],
    stateMutability: "payable",
  }],
  functionName: "deposit",
  args: [precommitment],
  value: 10000000000000000n, // 0.01 ETH
});
const txHash = await walletClient.writeContract(request);
await publicClient.waitForTransactionReceipt({ hash: txHash });

// 7. Fetch deposit events to confirm and reconstruct state
const deposits = await dataService.getDeposits({
  chainId: 11155111,
  address: "0x..." as `0x${string}`, // pool address
  scope,
  deploymentBlock: 123456n,
});

// 8. Withdrawal: generate proof and submit via relayer
//    See /reference/sdk for proveWithdrawal() and /protocol/withdrawal
//    for the full relayed withdrawal flow
```

For server-side signers, use `sdk.createContractInstance(rpcUrl, chain, entrypointAddress, privateKey)` instead of a `WalletClient`. See [SDK Utilities](/reference/sdk) for the full API surface.

### Log Fetch Configuration

`DataService` accepts an optional `logFetchConfig` second argument (a `Map<number, LogFetchConfig>`) that controls how event logs are fetched per chain. Tuning these values prevents RPC rate-limit errors in production.

| Chain | `chainId` | `blockChunkSize` |
|---|---|---|
| Ethereum mainnet | `1` | `1_250_000` |
| Optimism | `10` | `12_000_000` |
| Arbitrum One | `42161` | `48_000_000` |

Each entry also supports `concurrency`, `chunkDelayMs`, `retryOnFailure`, `maxRetries`, and `retryBaseDelayMs`. See [SDK Utilities](/reference/sdk) for the full `LogFetchConfig` type.

## Integration Checklist

1. Bootstrap a mnemonic-backed account before the user can deposit or withdraw.
2. If wallet onboarding is supported:
   - Derive the recovery seed from deterministic EIP-712 signatures only when the wallet can reproduce the same payload signature twice.
   - Otherwise use manual mnemonic onboarding.
   - Require the recovery phrase to be saved before continuing.
3. For deposits:
   - Derive deposit secrets from the recovery account.
   - Validate `minimumDepositAmount` before submission.
   - Persist the confirmed `Deposited` event's `label` and post-fee `value` into pool-account state.
4. Reconstruct balances as pool accounts and refresh ASP approval state across all loaded chain/scope pairs.
   - A deposit is ready for withdrawal when `mtRoot === onchainMtRoot` (from `GET /{chainId}/public/mt-roots`) and the deposit's `label` appears in the `aspLeaves` array from `GET /{chainId}/public/mt-leaves`.
   - Treat deposits as pending until both conditions are met.
5. Build withdrawal proofs with two roots:
   - Pool state root from `IPrivacyPool.currentRoot()`.
   - ASP root from the `onchainMtRoot` field.
   - Require exact parity between `onchainMtRoot` and `Entrypoint.latestRoot()`.
6. Use relayed withdrawals only: `https://fastrelay.xyz` on production chains, `https://testnet-relayer.privacypools.com` on testnets. Do not surface direct `PrivacyPool.withdraw()` in frontend UX.
7. Only enable private withdrawal when a relayer is available and the selected pool account has positive balance plus ASP approval.
8. On the review step:
   - Resolve the final recipient before quoting.
   - Fetch relayer details and `minWithdrawAmount`.
   - Request the relayer quote.
   - Discard the quote whenever amount, recipient, relayer, or gas-token-drop settings change.
9. Keep ragequit separate and clearly public.

## Next Steps

| Topic | Page |
|---|---|
| UX patterns for accounts, deposits, withdrawals, and ragequit | [UX Patterns](/build/ux-patterns) |
| ASP API endpoints, hosts, and response shapes | [ASP API Reference](/reference/asp-api) |
| Relayer quote, request, and details endpoints | [Relayer API Reference](/reference/relayer-api) |
| Contract errors, safety checks, and common mistakes | [Errors and Constraints](/reference/errors) |
| SDK types, methods, and account reconstruction | [SDK Utilities](/reference/sdk) |

