---
sidebar_label: Frontend Integration
sidebar_position: 2
title: Frontend Integration
slug: /build/integration
description: Step-by-step guide for integrating Privacy Pools deposits, withdrawals, and ragequits into a frontend or dapp.
keywords: [privacy pools, frontend, deposit, withdrawal, ragequit, SDK, integration]
---

This guide walks through integrating Privacy Pools deposits, withdrawals, and ragequit into a frontend application using the TypeScript SDK. It assumes you have a viem-based dapp and want to add compliant private transactions.

## Key References

| Page | What you will find |
|---|---|
| [Deployments](/deployments) | Contract addresses and `startBlock` per chain |
| [SDK Utilities](/reference/sdk) | SDK types, methods, and account reconstruction |
| [Deposit](/protocol/deposit), [Withdrawal](/protocol/withdrawal), [Ragequit](/protocol/ragequit) | On-chain mechanics for each protocol flow |
| [UX Patterns](/build/ux-patterns) | Frontend patterns for accounts, deposits, withdrawals, and ragequit |
| [ASP API](/reference/asp-api), [Relayer API](/reference/relayer-api) | Endpoint schemas and response shapes |

## Minimal Frontend Recipe

:::info Prerequisites
Node 18+, viem 2.x, and a browser or Node.js environment. For testing, you will need testnet ETH on a supported chain — see [Deployments](/deployments) for chain addresses and `startBlock` values.
:::

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
   - Returns `{ account, legacyAccount?, errors }` — `account` is the restored `AccountService`, `legacyAccount` (if present) holds migrated deposit histories for ragequit, `errors` lists any scopes that failed to load (see [SDK Utilities](/reference/sdk#account-reconstruction))

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
  calculateContext,
  generateMerkleProof,
} from "@0xbow/privacy-pools-core-sdk";
import {
  createPublicClient, createWalletClient, custom, http,
  encodeAbiParameters, parseAbiParameters,
} from "viem";
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

// 8. Wait for ASP approval, then fetch roots
const poolAddress = "0x..." as `0x${string}`;  // pool address
const aspHost = "https://asp.privacypools.com"; // see /reference/asp-api for host selection
const aspRoots = await fetch(
  `${aspHost}/11155111/public/mt-roots`,
  { headers: { "X-Pool-Scope": scope.toString() } } // must be decimal
).then((r) => r.json());
// Stop if ASP tree has not converged on-chain
if (!aspRoots.onchainMtRoot || aspRoots.mtRoot !== aspRoots.onchainMtRoot) {
  throw new Error("ASP tree has not converged — try again later");
}

// 9. Request a relayer quote
const relayerUrl = "https://fastrelay.xyz"; // testnet: https://testnet-relayer.privacypools.com
const withdrawAmount = 5000000000000000n; // 0.005 ETH
const recipient = "0x..." as `0x${string}`;
const quote = await fetch(`${relayerUrl}/relayer/quote`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chainId: 11155111,
    amount: withdrawAmount.toString(),
    asset: "0x0000000000000000000000000000000000000000",
    recipient,
  }),
}).then((r) => r.json());

// 10. Build the Withdrawal struct by ABI-encoding RelayData client-side
// feeReceiverAddress comes from /relayer/details, not the quote response
const relayerDetails = await fetch(
  `${relayerUrl}/relayer/details?chainId=11155111&assetAddress=0x0000000000000000000000000000000000000000`
).then((r) => r.json());
const withdrawalData = encodeAbiParameters(
  parseAbiParameters("address recipient, address feeRecipient, uint256 relayFeeBPS"),
  [recipient, relayerDetails.feeReceiverAddress, BigInt(quote.feeBPS)]
);
const withdrawal = { processooor: entrypointAddress, data: withdrawalData };
const context = BigInt(calculateContext(withdrawal, scope as any));

// Fetch ASP leaves and state tree leaves from the ASP API
// The mt-leaves endpoint returns both as flat string[] arrays (decimal-encoded bigints)
const leavesResponse = await fetch(
  `${aspHost}/11155111/public/mt-leaves`,
  { headers: { "X-Pool-Scope": scope.toString() } }
).then((r) => r.json());

// Pick the pool account to spend (reconstructed from AccountService)
// poolAccounts is a Map<scope, PoolAccount[]>
// Each PoolAccount has deposit (original) and children (change commitments)
const poolAccounts = accountService.account.poolAccounts;
const poolAccount = poolAccounts.values().next().value[0];
// The spendable commitment is the latest: last child, or the deposit if no children
const commitment = poolAccount.children.length > 0
  ? poolAccount.children[poolAccount.children.length - 1]
  : poolAccount.deposit;

// Build Merkle proofs from both trees
// State tree leaves are commitment hashes; ASP tree leaves are labels
const stateMerkleProof = generateMerkleProof(
  leavesResponse.stateTreeLeaves.map(BigInt),
  commitment.hash
);
const aspMerkleProof = generateMerkleProof(
  leavesResponse.aspLeaves.map(BigInt),
  commitment.label
);

// 11. Generate the withdrawal proof
const { nullifier: newNullifier, secret: newSecret } =
  accountService.createWithdrawalSecrets(commitment);

// Roots come from the Merkle proof results, not separate contract calls
// proveWithdrawal accepts AccountCommitment directly (no wrapping needed)
const withdrawalProof = await sdk.proveWithdrawal(
  commitment,
  {
    context,
    withdrawalAmount: withdrawAmount,
    stateMerkleProof,
    aspMerkleProof,
    stateRoot: stateMerkleProof.root as any,
    stateTreeDepth: 32n,
    aspRoot: aspMerkleProof.root as any,
    aspTreeDepth: 32n,
    newSecret,
    newNullifier,
  }
);

// 12. Submit to relayer before the quote expires
const relayResult = await fetch(`${relayerUrl}/relayer/request`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    withdrawal,
    proof: withdrawalProof.proof,
    publicSignals: withdrawalProof.publicSignals,
    scope: scope.toString(),
    chainId: 11155111,
    feeCommitment: quote.feeCommitment,
  }, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
}).then((r) => r.json());
// Check relayResult.success — the relayer returns HTTP 200 even for failures
```

### Ragequit (Public Exit)

Ragequit lets the original depositor reclaim funds publicly without ASP approval. It calls the pool contract directly (not via relayer). Only the address that submitted the original deposit can ragequit — other addresses will revert with `OnlyOriginalDepositor`.

```typescript
// Generate a commitment proof for ragequit
// Use an AccountCommitment from the pool account (has nullifier + secret)
const ragequitCommitment = commitment; // AccountCommitment from pool account
// Fields are already bigints — no conversion needed
const commitmentProof = await sdk.proveCommitment(
  ragequitCommitment.value,
  ragequitCommitment.label,
  ragequitCommitment.nullifier,
  ragequitCommitment.secret
);

// Submit ragequit directly to the pool contract
// Note: pB coordinates must be swapped for Solidity
const { request: rqRequest } = await publicClient.simulateContract({
  account,
  address: poolAddress,
  abi: [{
    name: "ragequit",
    type: "function",
    inputs: [{
      name: "p",
      type: "tuple",
      components: [
        { name: "pA", type: "uint256[2]" },
        { name: "pB", type: "uint256[2][2]" },
        { name: "pC", type: "uint256[2]" },
        { name: "pubSignals", type: "uint256[4]" },
      ],
    }],
    outputs: [],
    stateMutability: "nonpayable",
  }],
  functionName: "ragequit",
  args: [{
    pA: commitmentProof.proof.pi_a.slice(0, 2).map(BigInt),
    pB: [
      [BigInt(commitmentProof.proof.pi_b[0][1]), BigInt(commitmentProof.proof.pi_b[0][0])],
      [BigInt(commitmentProof.proof.pi_b[1][1]), BigInt(commitmentProof.proof.pi_b[1][0])],
    ],
    pC: commitmentProof.proof.pi_c.slice(0, 2).map(BigInt),
    pubSignals: commitmentProof.publicSignals.map(BigInt),
  }],
});
await walletClient.writeContract(rqRequest);
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

