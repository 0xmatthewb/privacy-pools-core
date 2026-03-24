---
sidebar_label: Frontend Integration
sidebar_position: 2
title: Frontend Integration
slug: /build/integration
description: Step-by-step guide for integrating Privacy Pools deposits, withdrawals, and ragequits into a frontend or dapp.
keywords: [privacy pools, frontend, deposit, withdrawal, ragequit, SDK, integration]
---

# Frontend Integration

## Key References

1. [Deployments](/deployments): chain-specific addresses and `startBlock`
2. [SDK Utilities](/reference/sdk): SDK types and functions
3. [Deposit](/protocol/deposit), [Withdrawal](/protocol/withdrawal), [Ragequit](/protocol/ragequit): protocol behavior
4. [Skill Library](/build/skills): task-specific agent skill files for each integration workflow

## Minimal Frontend Recipe

This is the shortest path from zero to a working deposit-and-withdraw loop. Each step names the SDK or contract method; see [SDK Utilities](/reference/sdk), [Withdrawal](/protocol/withdrawal), and [Deployments](/deployments) for exact types and payloads.

1. **Load deployment data.** Read the chain-specific contract addresses and `startBlock` from [Deployments](/deployments). You need the `Entrypoint`, `PrivacyPool`, and `Verifier` addresses for the target chain and asset scope.
2. **Initialize SDK and contract helpers.** Create a `DataService` with a `ChainConfig[]` array (each entry carries `chainId`, `privacyPoolAddress`, `startBlock`, and `rpcUrl`) so event scans start from the deployment block. In browser dapps, use a viem `WalletClient` plus the relevant contract ABI for writes. Reserve `sdk.createContractInstance(rpcUrl, chain, entrypointAddress, privateKey)` for backend or server-side signers.
3. **Bootstrap account state.** Generate or restore a mnemonic-backed account using `generateMasterKeys`. Reconstruct pool state via `AccountService.initializeWithEvents(dataService, { mnemonic }, pools)` — this scans on-chain events and returns `{ account, legacyAccount?, errors }` so restores can reconcile migrated histories when needed (see [SDK Utilities](/reference/sdk#account-reconstruction) for the full return type).
4. **Deposit.** Derive deposit secrets from the account, call `ContractInteractionsService.depositETH` (or `depositERC20` for token deposits after calling `approveERC20`), and persist the confirmed `Deposited` event's `label` and post-fee `value` into local pool-account state. Wait for ASP approval before attempting withdrawal.
5. **Perform the relayed withdrawal.**
   1. **Fetch ASP root and verify parity.** Call `GET /{chainId}/public/mt-roots` (with decimal `X-Pool-Scope`) and confirm that `onchainMtRoot` equals `Entrypoint.latestRoot()` exactly.
   2. **Request a relayer quote.** `POST /relayer/quote` to obtain a signed `feeCommitment`. The quote's `feeCommitment.withdrawalData` determines `withdrawal.data` and the proof `context`.
   3. **Build the withdrawal proof.** Generate the ZK proof using the verified ASP root, the pool state root, and the relayer-provided context.
   4. **Submit via relayer.** Send the proof to `POST /relayer/request` before the quote expires. Use `https://fastrelay.xyz` on production chains and `https://testnet-relayer.privacypools.com` on testnets.
6. **Refresh state after withdrawal.** Re-scan events to pick up the new change commitment. Insert it into local account state before generating another proof.

### Quick Start Code

```typescript
import {
  PrivacyPoolSDK,
  DataService,
  Circuits,
  generateMasterKeys,
  generateDepositSecrets,
  hashPrecommitment,
} from "@0xbow/privacy-pools-core-sdk";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

// 1. Initialize SDK with circuit artifacts
const sdk = new PrivacyPoolSDK(new Circuits());

// 2. Create DataService for reading on-chain events
const dataService = new DataService([
  {
    chainId: 11155111,
    privacyPoolAddress: "0x..." as `0x${string}`, // from /deployments
    startBlock: 123456n,                           // from /deployments
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
  },
]);

// 3. Read on-chain data with a PublicClient
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http("https://sepolia.infura.io/v3/YOUR_KEY"),
});

// 4. Server-side signer example only.
//    Browser dapps should use a WalletClient plus the relevant ABI instead.
const contracts = sdk.createContractInstance(
  "https://sepolia.infura.io/v3/YOUR_KEY",
  sepolia,
  "0x..." as `0x${string}`, // Entrypoint address from /deployments
  "0x..." as `0x${string}`, // signer private key
);

// 5. Generate account keys from a mnemonic
const keys = generateMasterKeys("your twelve word mnemonic phrase ...");

// 6. Derive deposit secrets and compute precommitment
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
const { nullifier, secret } = generateDepositSecrets(keys, scope, 0n);
const precommitment = hashPrecommitment(nullifier, secret);

// 7. Deposit ETH into the pool
const depositTx = await contracts.depositETH(
  10000000000000000n, // 0.01 ETH in wei
  precommitment,
);
await depositTx.wait();

// 8. Fetch deposit events to confirm and reconstruct state
const deposits = await dataService.getDeposits({
  chainId: 11155111,
  address: "0x..." as `0x${string}`, // pool address
  scope,
  deploymentBlock: 123456n,
});

// 9. Withdrawal: generate proof and submit via relayer
//    See /reference/sdk for proveWithdrawal() and /protocol/withdrawal
//    for the full relayed withdrawal flow via the production or testnet relayer host
```

See [SDK Utilities](/reference/sdk) for the full API surface.

### Log Fetch Configuration

`DataService` accepts an optional `logFetchConfig` second argument (a `Map<number, LogFetchConfig>`) that controls how event logs are fetched per chain. Tuning these values prevents RPC rate-limit errors in production.

| Chain | `chainId` | `blockChunkSize` |
|---|---|---|
| Ethereum mainnet | `1` | `1_250_000` |
| Optimism | `10` | `12_000_000` |
| Base | `8453` | `6_000_000` |
| Arbitrum One | `42161` | `48_000_000` |
| BNB Chain | `56` | `10_000_000` |

Each entry also supports `concurrency`, `chunkDelayMs`, `retryOnFailure`, `maxRetries`, and `retryBaseDelayMs`. See [SDK Utilities](/reference/sdk) for the full `LogFetchConfig` type.

## Integration Checklist

1. Bootstrap a mnemonic-backed account before the user can deposit or withdraw.
2. If wallet onboarding is supported, derive the recovery seed from deterministic EIP-712 signatures only when the wallet can reproduce the same payload signature twice, and require a backup step. If the wallet path cannot guarantee deterministic signing, fall back to manual mnemonic create/load.
3. Derive deposit secrets from the recovery account, validate `minimumDepositAmount`, submit the deposit, and persist the confirmed `Deposited` `label` plus post-fee `value` into pool-account state.
4. Reconstruct balances as pool accounts and refresh ASP approval state across all loaded chain/scope pairs. A deposit is approved when its `label` appears in the current ASP leaves returned by `GET /{chainId}/public/mt-leaves`. Treat deposits as pending until the label is present.
5. Build withdrawal proofs with two roots: read the pool state root from `IPrivacyPool.currentRoot()` and use ASP `onchainMtRoot` for the ASP root. Require exact parity between `onchainMtRoot` and `Entrypoint.latestRoot()`.
6. Build the app's withdrawal UX around relayed withdrawals using `https://fastrelay.xyz` on production chains and `https://testnet-relayer.privacypools.com` on testnets. This is the privacy-preserving withdrawal path and should be the standard withdrawal action.
7. Only enable private withdrawal when a relayer is available and the selected pool account has positive balance plus ASP approval (label present in ASP leaves).
8. Resolve the final recipient before review, fetch relayer details plus `minWithdrawAmount`, and request the relayer quote on the review step. Discard the quote whenever amount, recipient, relayer, or optional gas-token-drop settings change.
9. Do not surface direct `PrivacyPool.withdraw()` in normal frontend integrations. It is a signer-only non-private protocol path. If an explicit advanced direct flow is ever implemented, `processooor` must equal `msg.sender`, while the relayed path uses `Entrypoint.relay()` with `processooor = entrypointAddress`.
10. Keep ragequit separate and clearly public.

## Frontend Defaults

- Track each deposit and each post-withdrawal change commitment inside the same pool-account tree.
- Disable withdraw CTAs unless wallet is connected, account state is loaded, at least one relayer is available, and there is at least one approved non-zero pool account.
- Filter withdraw selectors to approved non-zero accounts for the active chain/scope and pick a sensible default account automatically.
- Parse confirmed receipts and persist them in pool-account state. This avoids exposing raw secrets in copy/paste or clipboard flows.
- Gate wallet-signature derivation by wallet capability; many smart/contract wallets should use manual mnemonic onboarding instead.
- After a successful private withdrawal, insert the new change commitment back into local account state before allowing another spend.
- Do not log recovery phrases, signatures, nullifiers, secrets, or raw note material to analytics or error tracking.
- Handle wallet rejections and user cancellations gracefully without retry loops or error telemetry.

## Recommended UX Details

### Account and Recovery

- Prefer wallet-signature seed derivation only when the wallet can reproduce the same EIP-712 signature for the same payload. Feature-detect this at runtime based on wallet capability.
- Compare two signatures of the same payload before deriving, and require recovery-phrase backup before continuing.
- If account reconstruction returns `legacyAccount`, keep it during restores for migrated users. If some scopes fail during that restore, retry those scopes with `AccountService.initializeWithEvents(dataService, { mnemonic }, failedPools)`. Otherwise, retry failed non-migration scopes with `AccountService.initializeWithEvents(dataService, { service: account }, failedPools)`.
- If you support manual recovery input, normalize whitespace, commas, and newlines before checksum validation.

### Deposit UX

- If you expose `Use max`, reserve gas for native-asset deposits and account for vetting-fee math before populating the amount field.
- If the wallet supports batching, collapsing approval + deposit into one action is a good upgrade. The same pattern can extend to stake-then-deposit flows for alternative input tokens as long as the final deposited asset and expected amount are explicit in the review UI.
- Parse the confirmed `Deposited` event immediately and store the resulting pool account locally rather than waiting for a later rescan.
- Tell the user that confirmed deposits may take time to appear in activity views or become ASP-approved.

For the full deposit protocol mechanics, see [Deposit](/protocol/deposit).

### Private Withdrawal UX

- Resolve ENS names to a final address before the review step, using mainnet (`chainId = 1`) resolution. Displaying reverse ENS alongside the resolved address is helpful. Unresolved input must block submit.
- Fetch `GET /relayer/details` early enough to validate `minWithdrawAmount`. If a partial withdrawal would leave a non-zero remainder below that minimum, warn clearly and offer: withdraw less, withdraw max, or leave the remainder for a later public exit.
- `GET /{chainId}/public/deposits-larger-than` is useful for showing an anonymity-set estimate while the user edits the amount.
- `POST /relayer/quote` without `recipient` is useful earlier in the form for fee estimation only. Request the signed `feeCommitment` only after the final recipient is known on review.
- Request the relayer quote only when the review screen opens, keep a visible countdown, and if the quote refreshes because inputs changed or time elapsed, require the user to confirm again.
- Treat `extraGas` as an optional gas-token drop for supported non-native assets. Quote invalidation and fee display must include it.
- If proof generation takes noticeable time, surface progress phases such as `loading_circuits`, `generating_proof`, and `verifying_proof`.

For the full withdrawal protocol mechanics, see [Withdrawal](/protocol/withdrawal).

### Ragequit UX

- Keep ragequit on its own action path with a clear warning that it is a public exit.
- Ragequit returns the full balance to the original depositor address. It does not send funds to a separate recipient.

For the full ragequit protocol mechanics, see [Ragequit](/protocol/ragequit).

## API Hosts

| Service | Network scope | Base URL |
|---|---|---|
| ASP API | Production EVM chains | `https://api.0xbow.io` |
| ASP API | Published testnets | `https://dw.0xbow.io` |
| Relayer API | Production EVM chains | `https://fastrelay.xyz` |
| Relayer API | Published testnets | `https://testnet-relayer.privacypools.com` |

ASP API docs: `https://api.0xbow.io/api-docs`

`request.0xbow.io` is a partner-only host and does not serve public `mt-roots` / `mt-leaves` endpoints.
For public ASP reads, use `api.0xbow.io` (mainnet chains) or `dw.0xbow.io` (testnet chains).

OpenAPI/Swagger schemas may lag live responses. For concrete response shapes, see the [Skill Library](/build/skills) or the individual skill files for [deposits](https://docs.privacypools.com/agent-skills/privacy-pools-deposit/SKILL.md), [withdrawals](https://docs.privacypools.com/agent-skills/privacy-pools-withdraw/SKILL.md), and [ragequit](https://docs.privacypools.com/agent-skills/privacy-pools-ragequit/SKILL.md).

## Critical API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /{chainId}/public/mt-roots` | Fetch ASP `mtRoot` and `onchainMtRoot` (requires decimal `X-Pool-Scope`) |
| `GET /{chainId}/public/mt-leaves` | Fetch ASP labels and state tree leaves for proof construction (requires decimal `X-Pool-Scope`) |
| `POST /relayer/quote` | Get relay fee quote and signed `feeCommitment` |
| `GET /relayer/details` | Fetch relayer config (`feeReceiverAddress`, fee bounds, asset support) |
| `POST /relayer/request` | Submit relayed withdrawal before quote expiry |

## Required Safety Checks

- `X-Pool-Scope` must be a decimal bigint string.
- `stateRoot` should come from the pool contract's `currentRoot()`, not from `Entrypoint.latestRoot()`.
- `onchainMtRoot` must equal `Entrypoint.latestRoot()` exactly before proof generation/submission.
- When reconstructing state from events, include the deployment `startBlock` in your `ChainConfig` entries so `DataService` scans from the correct block.
- `withdrawalAmount` must be `> 0` and `<=` commitment value.
- Check `minimumDepositAmount` before submitting deposit transactions.
- If you explicitly implement direct withdrawal, `withdrawal.processooor` must equal `msg.sender`, so the pool pays the signer.
- For relayed withdrawal, `withdrawal.processooor` must equal the Entrypoint address, and recipient plus fee routing comes from `withdrawal.data`.
- Relayer `feeCommitment` has a short TTL (~60s); quote and request should be near-contiguous, and quote invalidation should be tied to form changes.
- After partial withdrawals, refresh leaves before generating the next proof.
- Use a generous `waitForTransactionReceipt` timeout — the production frontend uses 300 seconds (5 minutes) for deposit, withdrawal, and ragequit confirmations.

## Common Failure Modes

| Error | Typical cause | Immediate action |
|---|---|---|
| `IncorrectASPRoot` | ASP root mismatch (`onchainMtRoot` parity not satisfied) | Re-fetch `mt-roots` + `mt-leaves`, use `onchainMtRoot`, regenerate proof |
| `MERKLE_ERROR` | Leaf missing from provided leaves (wrong scope/pool or stale data) | Verify scope and pool, refresh leaves, rebuild Merkle proofs |
| `InvalidProcessooor` | Direct vs relayed `processooor` mismatch | Direct: `processooor = msg.sender`; relayed: `processooor = entrypointAddress` |
| `NullifierAlreadySpent` | Commitment already exited via withdrawal or ragequit | Stop retrying that commitment and select another spendable commitment |
| `PrecommitmentAlreadyUsed` | Duplicate deposit precommitment / index reuse | Increment deposit index, recompute secrets/precommitment, resubmit |
| `ContextMismatch` | Wrong `withdrawal.data` or `processooor` caused the context hash to differ | Rebuild the `Withdrawal` object and re-derive context |
| `UnknownStateRoot` | State root expired from the 64-slot circular buffer | Re-fetch the pool's `currentRoot()` and regenerate the proof |
| `InvalidTreeDepth` | Tree depth exceeds circuit maximum | Use `32n` for both state and ASP tree depth |
| `InvalidDepositValue` | Deposit value exceeds `type(uint128).max` | Reduce the deposit amount |

## Reference Map

| What you need | Where to find it |
|---|---|
| Chain addresses and start blocks | [Deployments](/deployments) |
| Protocol flows | [Deposit](/protocol/deposit), [Withdrawal](/protocol/withdrawal), [Ragequit](/protocol/ragequit) |
| SDK API and types | [SDK Utilities](/reference/sdk) |
| Task-specific agent skills | [Skill Library](/build/skills) |
