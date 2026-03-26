---
sidebar_label: Frontend Integration
sidebar_position: 2
title: Frontend Integration
slug: /build/integration
description: Step-by-step guide for integrating Privacy Pools deposits, withdrawals, and ragequits into a frontend or dapp.
keywords: [privacy pools, frontend, deposit, withdrawal, ragequit, SDK, integration]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A complete Privacy Pools frontend integration using the TypeScript SDK.

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
Node 18+, viem 2.x, and a browser or Node.js environment. For testing, you will need testnet ETH on a supported chain. See [Deployments](/deployments) for chain addresses and `startBlock` values.
- SDK version: 1.2.0 (`@0xbow/privacy-pools-core-sdk`)
:::

**Install:** `npm install @0xbow/privacy-pools-core-sdk viem`

**Serve circuit artifacts:** the SDK's `Circuits` class fetches `.wasm`, `.zkey`, and `.vkey` files at runtime from a URL you provide via `baseUrl`. You need six files in your public directory: `commitment.wasm`, `commitment.zkey`, `commitment.vkey`, `withdraw.wasm`, `withdraw.zkey`, `withdraw.vkey`. These are built from the [circuits package](https://github.com/0xbow-io/privacy-pools-core/tree/main/packages/circuits). Copy them from a monorepo build or from the [production app's artifacts](https://app.privacypools.com/artifacts/).

```bash
# Example: download from the production app
mkdir -p public/artifacts
for f in commitment.wasm commitment.zkey commitment.vkey withdraw.wasm withdraw.zkey withdraw.vkey; do
  curl -o "public/artifacts/$f" "https://app.privacypools.com/artifacts/$f"
done
```

1. **Load deployment data**
   - Read chain-specific contract addresses and `startBlock` from [Deployments](/deployments)
   - You need: `Entrypoint`, `PrivacyPool`, and `Verifier` addresses for the target chain and asset scope

2. **Initialize SDK and contract helpers**
   - Create a `DataService` with a `ChainConfig[]` array (containing `chainId`, `privacyPoolAddress`, `startBlock`, and `rpcUrl`) so event scans start from the deployment block
   - In browser dapps, use a viem `WalletClient` plus the relevant contract ABI for writes
   - Reserve `sdk.createContractInstance(rpcUrl, chain, entrypointAddress, privateKey)` for server-side signers

3. **Bootstrap account state**
   - New accounts: `new AccountService(dataService, { mnemonic })`
   - Returning users: `AccountService.initializeWithEvents(dataService, { mnemonic }, pools)` to restore from on-chain events
   - Returns `{ account, legacyAccount?, errors }`:
     - `account` is the restored `AccountService`
     - `legacyAccount` (if present) holds migrated deposit histories for ragequit
     - `errors` lists any scopes that failed to load (see [SDK Utilities](/reference/sdk#account-reconstruction))

4. **Deposit**
   - Derive deposit secrets using `accountService.createDepositSecrets(scope, index)`
   - Simulate the deposit transaction with `publicClient.simulateContract(...)`, then execute with `walletClient.writeContract(request)`
   - Persist the confirmed `Deposited` event's `label` and post-fee `value` into local pool-account state
     (see [Account Reconstruction](/reference/sdk#account-reconstruction) for the full shape)
   - Wait for ASP approval before attempting withdrawal

5. **Perform the relayed withdrawal**
   1. **Fetch ASP roots and verify convergence:** call `GET /{chainId}/public/mt-roots` (with decimal `X-Pool-Scope`). If `onchainMtRoot` is `null` or `mtRoot !== onchainMtRoot`, stop because the ASP tree has not converged on-chain yet. Once they match, confirm `onchainMtRoot` equals `Entrypoint.latestRoot()` exactly
   2. **Request a relayer quote:** `POST /relayer/quote` to obtain a signed `feeCommitment`. The quote's `feeCommitment.withdrawalData` determines `withdrawal.data` and the proof `context`
   3. **Build Merkle proofs:** generate `stateMerkleProof` from pool state leaves (keyed by commitment hash) and `aspMerkleProof` from ASP leaves (keyed by label). For pools with an external ASP, merge all ASP leaf sources, remove duplicates, and sort ascending before generating the ASP proof
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
import type { Hash } from "@0xbow/privacy-pools-core-sdk";
import {
  createPublicClient, createWalletClient, custom, http,
} from "viem";
import { sepolia } from "viem/chains";

// --- Fill in from /deployments for your target chain ---
const POOL_ADDRESS = "0x..." as `0x${string}`;
const ENTRYPOINT_ADDRESS = "0x..." as `0x${string}`;
const START_BLOCK = 123456n;
const RPC_URL = "https://sepolia.infura.io/v3/YOUR_KEY";

// 1. Initialize SDK
const sdk = new PrivacyPoolSDK(
  new Circuits({ baseUrl: window.location.origin })
);

// 2. Create DataService
const dataService = new DataService([
  {
    chainId: 11155111,
    privacyPoolAddress: POOL_ADDRESS,
    startBlock: START_BLOCK,
    rpcUrl: RPC_URL,
  },
]);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});
const walletClient = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum!),
});

// 3. Create AccountService
const accountService = new AccountService(dataService, {
  mnemonic: "your recovery phrase ...",
});

// 4. Read the pool scope and derive deposit secrets
const scope = await publicClient.readContract({
  address: POOL_ADDRESS,
  abi: [{
    name: "SCOPE",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  }],
  functionName: "SCOPE",
}) as Hash;

// index = number of existing deposits for this scope (0 for first deposit)
const { precommitment } = accountService.createDepositSecrets(scope, 0n);

// 5. Deposit via the Entrypoint
const [account] = await walletClient.getAddresses();
```

<Tabs>
<TabItem value="eth" label="ETH" default>

```typescript
const { request } = await publicClient.simulateContract({
  account,
  address: ENTRYPOINT_ADDRESS,
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
```

</TabItem>
<TabItem value="erc20" label="ERC-20">

```typescript
const TOKEN_ADDRESS = "0x..." as `0x${string}`; // e.g., USDC
const depositAmount = 10000000n; // 10 USDC (6 decimals)

// Approve the Entrypoint to spend tokens
const { request: approveRequest } = await publicClient.simulateContract({
  account,
  address: TOKEN_ADDRESS,
  abi: [{
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  }],
  functionName: "approve",
  args: [ENTRYPOINT_ADDRESS, depositAmount],
});
const approveHash = await walletClient.writeContract(approveRequest);
await publicClient.waitForTransactionReceipt({ hash: approveHash });

// Deposit ERC-20 tokens
const { request } = await publicClient.simulateContract({
  account,
  address: ENTRYPOINT_ADDRESS,
  abi: [{
    name: "deposit",
    type: "function",
    inputs: [
      { name: "_asset", type: "address" },
      { name: "_value", type: "uint256" },
      { name: "_precommitment", type: "uint256" },
    ],
    outputs: [{ name: "_commitment", type: "uint256" }],
    stateMutability: "nonpayable",
  }],
  functionName: "deposit",
  args: [TOKEN_ADDRESS, depositAmount, precommitment],
});
const txHash = await walletClient.writeContract(request);
await publicClient.waitForTransactionReceipt({ hash: txHash });
```

</TabItem>
</Tabs>

```typescript
// 6. Fetch deposit events
const deposits = await dataService.getDeposits({
  chainId: 11155111,
  address: POOL_ADDRESS,
  scope,
  deploymentBlock: START_BLOCK,
});

// 7. Wait for ASP approval, then fetch roots
const aspHost = "https://dw.0xbow.io"; // Sepolia. See /reference/asp-api for host selection.
const aspRoots = await fetch(
  `${aspHost}/11155111/public/mt-roots`,
  { headers: { "X-Pool-Scope": scope.toString() } } // must be decimal
).then((r) => r.json());
// → { mtRoot: string, onchainMtRoot: string | null }
if (!aspRoots.onchainMtRoot || aspRoots.mtRoot !== aspRoots.onchainMtRoot) {
  throw new Error("ASP tree has not converged, try again later");
}

// 8. Request a relayer quote
const relayerUrl = "https://fastrelay.xyz"; // testnet: https://testnet-relayer.privacypools.com
const withdrawAmount = 5000000000000000n; // 0.005 ETH
const recipient = "0x..." as `0x${string}`;
const quoteResponse = await fetch(`${relayerUrl}/relayer/quote`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chainId: 11155111,
    amount: withdrawAmount.toString(),
    asset: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // native ETH sentinel
    recipient,
    extraGas: false,
  }),
});
if (!quoteResponse.ok) {
  throw new Error(`Relayer quote failed: ${quoteResponse.status}`);
}
const quote = await quoteResponse.json();
// → { feeBPS: string, feeCommitment: { expiration, withdrawalData, ... } }

// 9. Build Withdrawal struct
// The signed feeCommitment is the canonical source for relayed withdrawal.data
const withdrawal = {
  processooor: ENTRYPOINT_ADDRESS,
  data: quote.feeCommitment.withdrawalData as `0x${string}`,
};
const context = BigInt(calculateContext(withdrawal, scope));

// → { stateTreeLeaves: string[], aspLeaves: string[] } (decimal bigints)
const leavesResponse = await fetch(
  `${aspHost}/11155111/public/mt-leaves`,
  { headers: { "X-Pool-Scope": scope.toString() } }
).then((r) => r.json());

const accountsForScope = accountService.account.poolAccounts.get(scope) ?? [];
if (accountsForScope.length === 0) {
  throw new Error("No pool accounts found for this scope");
}
const approvedAccounts = accountsForScope.filter((poolAccount) => {
  const latestCommitment = poolAccount.children.length > 0
    ? poolAccount.children[poolAccount.children.length - 1]
    : poolAccount.deposit;
  return latestCommitment.value > 0n && leavesResponse.aspLeaves.includes(poolAccount.label.toString());
});
const poolAccount = approvedAccounts[0];
if (!poolAccount) {
  throw new Error("No ASP-approved non-zero account found for this scope");
}
const commitment = poolAccount.children.length > 0
  ? poolAccount.children[poolAccount.children.length - 1]
  : poolAccount.deposit;

// State tree: keyed by commitment hash. ASP tree: keyed by label.
const stateMerkleProof = generateMerkleProof(
  leavesResponse.stateTreeLeaves.map(BigInt),
  commitment.hash
);
const aspMerkleProof = generateMerkleProof(
  leavesResponse.aspLeaves.map(BigInt),
  commitment.label
);

// 10. Generate the withdrawal proof
const { nullifier: newNullifier, secret: newSecret } =
  accountService.createWithdrawalSecrets(commitment);

const withdrawalProof = await sdk.proveWithdrawal(
  commitment,
  {
    context,
    withdrawalAmount: withdrawAmount,
    stateMerkleProof,
    aspMerkleProof,
    stateRoot: stateMerkleProof.root as Hash,
    stateTreeDepth: 32n,
    aspRoot: aspMerkleProof.root as Hash,
    aspTreeDepth: 32n,
    newSecret,
    newNullifier,
  }
);
// → { proof: { pi_a, pi_b, pi_c }, publicSignals: string[] }

// 11. Submit to relayer before the quote expires
const relayResponse = await fetch(`${relayerUrl}/relayer/request`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    withdrawal,
    proof: withdrawalProof.proof,
    publicSignals: withdrawalProof.publicSignals,
    scope: scope.toString(),
    chainId: 11155111,
    feeCommitment: quote.feeCommitment,
  }, (_, v) => (typeof v === "bigint" ? v.toString() : v)), // bigint -> string for JSON
});
if (!relayResponse.ok) {
  throw new Error(`Relayer request failed: ${relayResponse.status}`);
}
const relayResult = await relayResponse.json();
if (!relayResult.success) {
  throw new Error(`Relayer rejected withdrawal: ${relayResult.error}`);
}
```

### Account Selection and External ASPs

- Select withdrawal candidates from `accountService.account.poolAccounts.get(scope)`, not from a flattened cross-chain list.
- Only offer pool accounts whose latest commitment has a non-zero balance and whose label is approved in the current ASP leaf set.
- For pools that configure an external ASP, merge the 0xbow ASP leaves with the external provider's leaves, remove duplicates, sort ascending, and generate the ASP Merkle proof from that merged label set.
- Use `GET /relayer/details` for UX validation such as `minWithdrawAmount` and fee display. When a quote already includes `feeCommitment.withdrawalData`, do not rebuild `withdrawal.data` from `/relayer/details`.

### Ragequit (Public Exit)

Ragequit lets the original depositor reclaim funds publicly, bypassing ASP approval. Only the depositing address can call it.

```typescript
const commitmentProof = await sdk.proveCommitment(
  commitment.value,
  commitment.label,
  commitment.nullifier,
  commitment.secret
);

// pB coordinates are swapped (x,y -> y,x) per Solidity's groth16 verifier convention
const { request: rqRequest } = await publicClient.simulateContract({
  account,
  address: POOL_ADDRESS,
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

For server-side signers, use `sdk.createContractInstance(...)` instead of a `WalletClient`.

### Log Fetch Configuration

`DataService` accepts an optional `logFetchConfig` second argument (a `Map<number, Partial<LogFetchConfig>>`) that controls how event logs are fetched per chain.

| Chain | `chainId` | `blockChunkSize` |
|---|---|---|
| Ethereum mainnet | `1` | `1_250_000` |
| Optimism | `10` | `12_000_000` |
| Arbitrum One | `42161` | `48_000_000` |

Each entry also supports `concurrency`, `chunkDelayMs`, `retryOnFailure`, `maxRetries`, and `retryBaseDelayMs`.

## Key integration rules

1. **Relayed withdrawals only.** Use `fastrelay.xyz` on production chains and `testnet-relayer.privacypools.com` on published testnets. Never expose direct `PrivacyPool.withdraw()` in frontend UX.
2. **Recovery phrase first.** Require users to save their recovery phrase before their first deposit. Never expose raw note material in clipboard or copy/paste flows.
3. **Quote on review, re-quote on change.** Request relayer quotes on the review step. If amount, recipient, or relayer changes, or the quote expires, discard and re-quote.
4. **ASP root parity.** Always verify the ASP tree has converged on-chain (`mtRoot === onchainMtRoot`) before generating a withdrawal proof.

## Next Steps

| Topic | Page |
|---|---|
| UX patterns for accounts, deposits, withdrawals, and ragequit | [UX Patterns](/build/ux-patterns) |
| ASP API endpoints, hosts, and response shapes | [ASP API Reference](/reference/asp-api) |
| Relayer quote, request, and details endpoints | [Relayer API Reference](/reference/relayer-api) |
| Contract errors, safety checks, and common mistakes | [Errors and Constraints](/reference/errors) |
| SDK types, methods, and account reconstruction | [SDK Utilities](/reference/sdk) |
