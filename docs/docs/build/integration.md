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

This page covers the full integration: deposit, withdrawal, and ragequit. If you haven't read [Using Privacy Pools](/protocol) yet, start there.

:::info Prerequisites
Node 18+, viem 2.x, a browser or Node.js environment, and the target chain's addresses and `startBlock` from [Deployments](/deployments).
:::

## Circuit artifacts and SDK setup

**Install:** `npm install @0xbow/privacy-pools-core-sdk viem`

**Serve circuit artifacts:** the SDK's `Circuits` class fetches six files at runtime from a URL you set via `baseUrl`: `commitment.wasm`, `commitment.zkey`, `commitment.vkey`, `withdraw.wasm`, `withdraw.zkey`, `withdraw.vkey`. Place them in your app's public directory under `/artifacts/`.

These files come from the [circuits package](https://github.com/0xbow-io/privacy-pools-core/tree/main/packages/circuits). To build them yourself, clone the monorepo and run `yarn workspace @privacy-pool-core/circuits compile`. The output lands in `packages/circuits/build/{commitment,withdraw}/`. Copy the `.wasm`, `.zkey`, and `.vkey` files from each subdirectory into your public artifacts folder. The SDK verifies each file's SHA-256 hash at load time and rejects mismatches.

Fill the chain-specific values from [Deployments](/deployments) for the network you are integrating.

```typescript
import {
  PrivacyPoolSDK,
  DataService,
  Circuits,
} from "@0xbow/privacy-pools-core-sdk";
import {
  createPublicClient, createWalletClient, custom, http,
  encodeAbiParameters, parseAbiParameters,
} from "viem";
import { sepolia } from "viem/chains";

// Fill these values from /deployments for your target chain.
const POOL_ADDRESS = "0x..." as `0x${string}`;
const ENTRYPOINT_ADDRESS = "0x..." as `0x${string}`;
const START_BLOCK = 123456n;
const RPC_URL = "https://sepolia.infura.io/v3/YOUR_KEY";

const sdk = new PrivacyPoolSDK(
  new Circuits({ baseUrl: window.location.origin })
);

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
```

Create `DataService` with `startBlock` so event scans begin at the deployment block instead of genesis. Reserve `sdk.createContractInstance(...)` for server-side signers; browser dapps should usually use their own viem clients for writes.

## Account bootstrapping

New accounts should start from a mnemonic-backed `AccountService`. Returning users should restore from on-chain events.

:::warning
Never log, hardcode, or store mnemonics, nullifiers, or secrets in plaintext. Source the mnemonic from secure user input and keep derived secrets in memory only. Do not include any of these values in error messages, analytics, or browser storage.
:::

```typescript
import {
  AccountService,
} from "@0xbow/privacy-pools-core-sdk";
import type { Hash } from "@0xbow/privacy-pools-core-sdk";

const accountService = new AccountService(dataService, {
  mnemonic: "your recovery phrase ...",
  poolConcurrency: 1,
});

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

// index = number of existing pool accounts for this scope
const existingAccounts = accountService.account.poolAccounts.get(scope) ?? [];
const { precommitment } = accountService.createDepositSecrets(scope, BigInt(existingAccounts.length));
const [account] = await walletClient.getAddresses();
```

For returning users, use `AccountService.initializeWithEvents(dataService, { mnemonic }, pools)`. It returns `{ account, legacyAccount?, errors }`, where `legacyAccount` preserves migrated histories for ragequit and `errors` reports any scopes that failed to load.

## Deposit flow

Derive deposit secrets with `accountService.createDepositSecrets(scope, index)`, then simulate and submit the deposit. Persist the confirmed `Deposited` event's `label` and post-fee `value` into local pool-account state.

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

After the receipt confirms, decode the `Deposited` event from the pool contract to get the on-chain `label` and post-fee `value`, then register the pool account locally:

```typescript
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

// Decode the pool's Deposited event from the receipt
const depositedLog = receipt.logs.find(
  (log) => log.address.toLowerCase() === POOL_ADDRESS.toLowerCase()
);
// Parse _label and _value from the event (indices vary by ABI decoding approach)
const _label = BigInt(depositedLog!.topics[2] ?? depositedLog!.data); // adapt to your ABI decoder
const _value = /* post-fee value from the decoded event */;

// Register the deposit in local account state
accountService.addPoolAccount(
  scope, _value, nullifier, secret, _label as Hash,
  receipt.blockNumber, txHash
);
```

:::tip
Use a full ABI decoder (e.g., viem's `decodeEventLog`) for production code. The snippet above illustrates the flow; the exact log parsing depends on your setup.
:::

## Waiting for ASP approval

Do not treat a deposit as ready for private withdrawal until the ASP tree has converged on-chain.

```typescript
const aspHost = "https://dw.0xbow.io"; // Sepolia. See /reference/asp-api for host selection.
const aspRoots = await fetch(
  `${aspHost}/11155111/public/mt-roots`,
  { headers: { "X-Pool-Scope": scope.toString() } } // must be decimal
).then((r) => r.json());

if (!aspRoots.onchainMtRoot || aspRoots.mtRoot !== aspRoots.onchainMtRoot) {
  throw new Error("ASP tree has not converged, try again later");
}

// Confirm the on-chain ASP root matches the contract
const latestRoot = await publicClient.readContract({
  address: ENTRYPOINT_ADDRESS,
  abi: [{
    name: "latestRoot",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  }],
  functionName: "latestRoot",
});
if (BigInt(aspRoots.onchainMtRoot) !== latestRoot) {
  throw new Error("ASP root does not match Entrypoint.latestRoot()");
}
```

Call `GET /{chainId}/public/mt-roots` with decimal `X-Pool-Scope`. If `onchainMtRoot` is `null` or `mtRoot !== onchainMtRoot`, wait and retry. Once they match, confirm `BigInt(onchainMtRoot) === Entrypoint.latestRoot()` before generating a proof.

## Relayed withdrawal

Relayed withdrawal is the standard frontend path. Request the quote late in the flow, build `withdrawal.data` by ABI-encoding the recipient, relayer fee address, and fee BPS client-side, and submit the proof before the quote expires.

```typescript
import {
  calculateContext,
  generateMerkleProof,
} from "@0xbow/privacy-pools-core-sdk";
import type { Hash } from "@0xbow/privacy-pools-core-sdk";

const relayerUrl = "https://testnet-relayer.privacypools.com"; // mainnet: https://fastrelay.xyz
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

// Fetch relayer address for fee routing
const relayerDetails = await fetch(
  `${relayerUrl}/relayer/details?chainId=11155111&assetAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`
).then((r) => r.json());

// ABI-encode RelayData client-side — the proof context is bound to this exact encoding.
const withdrawalData = encodeAbiParameters(
  parseAbiParameters("address recipient, address feeRecipient, uint256 relayFeeBPS"),
  [recipient, relayerDetails.feeReceiverAddress, BigInt(quote.feeBPS)]
);

const withdrawal = {
  processooor: ENTRYPOINT_ADDRESS,
  data: withdrawalData,
};
const context = BigInt(calculateContext(withdrawal, scope));

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

// Pad siblings to the circuit's fixed tree depth
const padSiblings = (siblings: bigint[]) =>
  [...siblings, ...Array(32 - siblings.length).fill(0n)];

const stateLeaves = leavesResponse.stateTreeLeaves.map(BigInt);
const aspLeaves = [...new Set(leavesResponse.aspLeaves)].map(BigInt);

const stateMerkleProof = generateMerkleProof(stateLeaves, commitment.hash);
const aspMerkleProof = generateMerkleProof(aspLeaves, commitment.label);

const { nullifier: newNullifier, secret: newSecret } =
  accountService.createWithdrawalSecrets(commitment);

const withdrawalProof = await sdk.proveWithdrawal(
  commitment,
  {
    context,
    withdrawalAmount: withdrawAmount,
    stateMerkleProof: {
      ...stateMerkleProof,
      siblings: padSiblings(stateMerkleProof.siblings as bigint[]),
    },
    aspMerkleProof: {
      ...aspMerkleProof,
      siblings: padSiblings(aspMerkleProof.siblings as bigint[]),
    },
    stateRoot: stateMerkleProof.root as Hash,
    stateTreeDepth: 32n,
    aspRoot: aspMerkleProof.root as Hash,
    aspTreeDepth: 32n,
    newSecret,
    newNullifier,
  }
);

// Verify locally before submitting to the relayer
const proofValid = await sdk.verifyWithdrawal(withdrawalProof);
if (!proofValid) {
  throw new Error("Withdrawal proof failed local verification");
}

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
  }, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
});
if (!relayResponse.ok) {
  throw new Error(`Relayer request failed: ${relayResponse.status}`);
}
const relayResult = await relayResponse.json();
if (!relayResult.success) {
  throw new Error(`Relayer rejected withdrawal: ${relayResult.error}`);
}

// After the relay succeeds, wait for the on-chain receipt and update local state
const relayReceipt = await publicClient.waitForTransactionReceipt({
  hash: relayResult.txHash,
});
const changeValue = commitment.value - withdrawAmount;
accountService.addWithdrawalCommitment(
  commitment, changeValue, newNullifier, newSecret,
  relayReceipt.blockNumber, relayResult.txHash
);
```

:::warning Update local state after every withdrawal
Without calling `addWithdrawalCommitment`, the local account still points at the now-spent commitment. The next withdrawal attempt would use a nullified commitment and fail.
:::

### Account selection and external ASPs

- Select withdrawal candidates from `accountService.account.poolAccounts.get(scope)`, not from a flattened cross-chain list.
- Only offer pool accounts whose latest commitment has a non-zero balance and whose label is approved in the current ASP leaf set.
- For pools that configure an external ASP, merge the 0xbow ASP leaves with the external provider's leaves, remove duplicates, sort ascending, and generate the ASP Merkle proof from that merged label set.
- Use `GET /relayer/details` for the relayer's `feeReceiverAddress` (needed for ABI-encoding `withdrawal.data`) and for UX validation such as `minWithdrawAmount` and fee display.

## Ragequit

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
const ragequitHash = await walletClient.writeContract(rqRequest);
await publicClient.waitForTransactionReceipt({ hash: ragequitHash });
```

Wait for the receipt before marking ragequit as complete. If you persist local account history, decode the confirmed `Ragequit` event from that receipt and store it alongside the spent commitment.

For server-side signers, use `sdk.createContractInstance(...)` instead of a `WalletClient`.

## Production checklist

1. Require the recovery phrase to be saved before the first deposit.
2. Fill chain-specific `Entrypoint`, `PrivacyPool`, and `startBlock` values from [Deployments](/deployments) when you wire a target chain.
3. Wait for ERC-20 approval receipts before depositing.
4. Request relayer quotes on the review step, and re-quote if amount, recipient, relayer, optional gas-token drop, or expiration changes.
5. Verify ASP root parity before generating a withdrawal proof.
6. Wait for the receipt before marking deposit, relay, or ragequit as complete.
7. Keep ragequit available as the public exit path, but do not foreground it over private withdrawal.

### DataService tuning

`DataService` accepts an optional `logFetchConfig` second argument (a `Map<number, Partial<LogFetchConfig>>`) that controls how event logs are fetched per chain.

| Chain | `chainId` | `blockChunkSize` |
|---|---|---|
| Ethereum mainnet | `1` | `1_250_000` |
| Optimism | `10` | `12_000_000` |
| Arbitrum One | `42161` | `48_000_000` |

Each entry also supports `concurrency`, `chunkDelayMs`, `retryOnFailure`, `maxRetries`, and `retryBaseDelayMs`.

## Exact references

| Topic | Page |
|---|---|
| Chain addresses, chain metadata, and `startBlock` | [Deployments](/deployments) |
| UX patterns for accounts, deposits, withdrawals, and ragequit | [UX Patterns](/build/ux-patterns) |
| ASP API endpoints, hosts, and response shapes | [ASP API Reference](/reference/asp-api) |
| Relayer quote, request, and details endpoints | [Relayer API Reference](/reference/relayer-api) |
| Contract errors, safety checks, and common mistakes | [Errors and Constraints](/reference/errors) |
| SDK types, methods, and account reconstruction | [SDK Utilities](/reference/sdk) |

