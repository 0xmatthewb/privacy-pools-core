---
title: SDK Utilities
sidebar_position: 1
description: "SDK API reference for high-level protocol operations, proof helpers, and integration-oriented TypeScript types."
keywords:
  - privacy pools
  - sdk
  - typescript
  - api reference
  - proof generation
  - withdrawal proof
  - integration
---

Start with `AccountService` for account management, `DataService` for on-chain event scanning, and `proveWithdrawal` for the core withdrawal flow. The remaining utilities cover advanced scenarios like legacy account migration and direct contract interactions.

## `PrivacyPoolSDK`

Main SDK class providing high-level protocol interaction.

### Constructor

`PrivacyPoolSDK` requires a `CircuitsInterface` implementation for proof generation.
The SDK exports a concrete `Circuits` class that satisfies this interface:

```typescript
import { PrivacyPoolSDK, Circuits } from "@0xbow/privacy-pools-core-sdk";

// Browser: set baseUrl so circuit artifacts load from the app origin
const circuits = new Circuits({ baseUrl: window.location.origin });
// In Node.js, use: new Circuits({ browser: false })
const sdk = new PrivacyPoolSDK(circuits);
```

### `Circuits`

The `Circuits` class implements `CircuitsInterface` and generates or verifies the Groth16 proofs used for commitments and withdrawals.

- **Browser:** pass `{ baseUrl: window.location.origin }` so artifacts load from your app's origin.
- **Node.js:** pass `{ browser: false }` so artifacts load from disk rather than `fetch`.
- You can also override `baseUrl` when serving artifacts from a custom location.

Every downloaded circuit artifact (`wasm`, `vkey`, and `zkey`) is verified against a registered SHA-256 digest before use, including when `baseUrl` is overridden.

### Methods

```tsx
class PrivacyPoolSDK {
  constructor(circuits: CircuitsInterface);

  createContractInstance(
    rpcUrl: string,
    chain: Chain,
    entrypointAddress: Address,
    privateKey: Hex,
  ): ContractInteractionsService;

  // Commitment Operations (for ragequit)
  async proveCommitment(
    value: bigint,
    label: bigint,
    nullifier: bigint,
    secret: bigint,
  ): Promise<CommitmentProof>;

  async verifyCommitment(proof: CommitmentProof): Promise<boolean>;

  // Withdrawal Operations
  async proveWithdrawal(
    commitment: Commitment | AccountCommitment,
    input: WithdrawalProofInput,
  ): Promise<WithdrawalProof>;

  async verifyWithdrawal(
    withdrawalProof: WithdrawalProof,
  ): Promise<boolean>;
}
```

`proveWithdrawal(...)` accepts either the nested `Commitment` shape returned by SDK commitment helpers or the flat `AccountCommitment` shape returned by account-reconstruction flows.

## `ContractInteractionsService`

Returned by `sdk.createContractInstance(...)` for on-chain reads and writes.

```tsx
interface ContractInteractionsService {
  depositERC20(
    asset: Address,
    amount: bigint,
    precommitment: bigint,
  ): Promise<TransactionResponse>;

  depositETH(
    amount: bigint,
    precommitment: bigint,
  ): Promise<TransactionResponse>;

  withdraw(
    withdrawal: Withdrawal,
    withdrawalProof: WithdrawalProof,
    scope: Hash,
  ): Promise<TransactionResponse>;

  relay(
    withdrawal: Withdrawal,
    withdrawalProof: WithdrawalProof,
    scope: Hash,
  ): Promise<TransactionResponse>;

  ragequit(
    commitmentProof: CommitmentProof,
    privacyPoolAddress: Address,
  ): Promise<TransactionResponse>;

  getScope(privacyPoolAddress: Address): Promise<bigint>;

  // ⚠️ Misleading name: calls Entrypoint.latestRoot(), not pool.currentRoot().
  // You must pass the Entrypoint address, not a pool address. See note below.
  getStateRoot(privacyPoolAddress: Address): Promise<bigint>;

  getStateSize(privacyPoolAddress: Address): Promise<bigint>;
  getAssetConfig(assetAddress: Address): Promise<AssetConfig>;
  getScopeData(
    scope: bigint,
  ): Promise<{ poolAddress: Address | null; assetAddress: Address | null }>;
  // Returns null addresses if the scope is not registered on the Entrypoint

  approveERC20(
    spenderAddress: Address,
    tokenAddress: Address,
    amount: bigint,
  ): Promise<TransactionResponse>;
}
```

:::warning Pass the Entrypoint address, not the pool address
`getStateRoot()` reads `latestRoot()` using the Entrypoint ABI on whatever address is passed. Despite accepting `privacyPoolAddress`, you must pass the **Entrypoint address** because passing a pool address will fail.
:::

The return value is the ASP root, not the pool state root. For withdrawal proofs, read the pool state root directly via `IPrivacyPool.currentRoot()` and use `onchainMtRoot` from the [ASP API](/reference/asp-api) for the ASP root.

`ContractInteractionsService` always requires a `privateKey` in its constructor, even for read-only methods like `getScope()` and `getStateRoot()`. If you need scope or the pool state root without a signer (e.g., for `DataService` workflows), read them directly from the pool contract via a viem `PublicClient`:

```typescript
import { createPublicClient, http } from "viem";
const client = createPublicClient({ transport: http(rpcUrl) });
const stateRoot = await client.readContract({
  address: privacyPoolAddress,
  abi: [{ name: "currentRoot", type: "function", inputs: [],
          outputs: [{ type: "uint256" }], stateMutability: "view" }],
  functionName: "currentRoot",
});
```

Use the same pattern with `SCOPE()` when you only need scope resolution. For frontend dapps with browser wallets, use your own viem `WalletClient` with the contract ABI for the method you are calling. The SDK's crypto functions (`generateMasterKeys`, `hashPrecommitment`, etc.) work in any environment.

## `DataService`

Exported for read-only event scanning and account reconstruction.

```tsx
class DataService {
  constructor(
    chainConfigs: ChainConfig[],
    logFetchConfig?: Map<number, {
      blockChunkSize?: number;
      concurrency?: number;
      chunkDelayMs?: number;
      retryOnFailure?: boolean;
      maxRetries?: number;
      retryBaseDelayMs?: number;
    }>,
  );

  getDeposits(pool: PoolInfo): Promise<DepositEvent[]>;
  getWithdrawals(pool: PoolInfo, fromBlock?: bigint): Promise<WithdrawalEvent[]>;
  getRagequits(pool: PoolInfo, fromBlock?: bigint): Promise<RagequitEvent[]>;
}
```

`DataService` is fully standalone.

`DataService` fetches logs in chunked, rate-limited ranges:

- Always initialize with the deployment `startBlock` from the [Deployments](/deployments) page rather than `0n`. Scanning from genesis works but is unnecessarily slow and may hit RPC provider limits.
- Use the optional second constructor argument when you need per-chain fetch overrides (chunk size, concurrency, delay, retries).

`getDeposits` starts from `pool.deploymentBlock` if present, falling back to the chain's configured `startBlock`. `getWithdrawals` and `getRagequits` accept an optional `fromBlock` parameter for incremental fetching, defaulting to `pool.deploymentBlock`.

## Crypto Utilities

Core cryptographic operations.

```tsx
// Derive master keys from a BIP-39 mnemonic
function generateMasterKeys(mnemonic: string): MasterKeys;

// Generate deterministic nullifier/secret for a deposit
function generateDepositSecrets(
  keys: MasterKeys,
  scope: Hash,
  index: bigint,
): { nullifier: Secret; secret: Secret };

// Generate deterministic nullifier/secret for a withdrawal (change commitment)
function generateWithdrawalSecrets(
  keys: MasterKeys,
  label: Hash,
  index: bigint,
): { nullifier: Secret; secret: Secret };

// Create commitment with provided parameters
function getCommitment(
  value: bigint,
  label: bigint,
  nullifier: Secret,
  secret: Secret,
): Commitment;

// Hash nullifier + secret into a precommitment
function hashPrecommitment(
  nullifier: Secret,
  secret: Secret,
): Hash;

// Compute context hash for withdrawal proof
function calculateContext(
  withdrawal: Withdrawal,
  scope: Hash,
): string;  // returns hex string (cast to bigint for proveWithdrawal)

// Generate Merkle proof for leaf
function generateMerkleProof(
  leaves: bigint[],
  leaf: bigint,
): LeanIMTMerkleProof<bigint>;
```

## Integration Types

Subset most relevant to the methods above and the integration guides.

```tsx
type Hash = bigint;    // Branded bigint for commitment/Merkle hashes
type Secret = bigint;  // Branded bigint for nullifier/secret values

interface MasterKeys {
  masterNullifier: Secret;
  masterSecret: Secret;
}

interface AssetConfig {
  pool: Address;
  minimumDepositAmount: bigint;
  vettingFeeBPS: bigint;
  maxRelayFeeBPS: bigint;
}

interface TransactionResponse {
  hash: string;  // hex transaction hash
  wait: () => Promise<void>;
}

interface Commitment {
  hash: Hash;              // Commitment hash
  nullifierHash: Hash;     // Precommitment hash: Poseidon(nullifier, secret). Note: the circuit's nullifierHash is Poseidon(nullifier), which is a different value.
  preimage: {
    value: bigint;         // Committed value
    label: bigint;         // Commitment label
    precommitment: {
      hash: Hash;          // Precommitment hash
      nullifier: Secret;   // Nullifier value
      secret: Secret;      // Secret value
    };
  };
}

interface PoolAccount {
  label: Hash;
  deposit: AccountCommitment;
  children: AccountCommitment[];
  ragequit?: RagequitEvent;
  isMigrated?: boolean;
}

interface AccountCommitment {
  hash: Hash;
  value: bigint;
  label: Hash;
  nullifier: Secret;
  secret: Secret;
  blockNumber: bigint;
  timestamp?: bigint;
  txHash: Hex;
  isMigration?: boolean;
}

interface WithdrawalProofInput {
  context: bigint;                           // Proof context (from calculateContext, cast to bigint)
  withdrawalAmount: bigint;                  // Amount to withdraw
  stateMerkleProof: LeanIMTMerkleProof<bigint>;  // State tree inclusion proof
  aspMerkleProof: LeanIMTMerkleProof<bigint>;    // ASP tree inclusion proof
  stateRoot: Hash;                           // Current state root
  stateTreeDepth: bigint;                    // Always 32n
  aspRoot: Hash;                             // Current ASP root
  aspTreeDepth: bigint;                      // Always 32n
  newSecret: Secret;                         // New secret for change commitment
  newNullifier: Secret;                      // New nullifier for change commitment
}

interface CommitmentProof {
  proof: Groth16Proof;
  publicSignals: PublicSignals;
}

interface WithdrawalProof {
  proof: Groth16Proof;
  publicSignals: PublicSignals;
}

interface Withdrawal {
  processooor: Address;   // Direct: tx signer (msg.sender). Relayed: Entrypoint address.
  data: Hex;              // Direct: "0x". Relayed: ABI-encoded RelayData.
}

interface ChainConfig {
  chainId: number;
  privacyPoolAddress: Address;
  startBlock: bigint;
  rpcUrl: string;
}

interface PoolInfo {
  chainId: number;
  address: Hex;
  scope: Hash;
  deploymentBlock: bigint;
}

interface DepositEvent {
  depositor: string;
  commitment: Hash;
  label: Hash;
  value: bigint;
  precommitment: Hash;
  blockNumber: bigint;
  transactionHash: Hex;
}

interface WithdrawalEvent {
  withdrawn: bigint;
  spentNullifier: Hash;
  newCommitment: Hash;
  blockNumber: bigint;
  transactionHash: Hex;
}

interface RagequitEvent {
  ragequitter: string;
  commitment: Hash;
  label: Hash;
  value: bigint;
  blockNumber: bigint;
  transactionHash: Hex;
}
```

## Account Reconstruction

Pool accounts are reconstructed from on-chain events with `AccountService`:

```typescript
const accountService = new AccountService(dataService, {
  mnemonic,
  poolConcurrency: 4,
});
```

```typescript
import { AccountService, DataService } from "@0xbow/privacy-pools-core-sdk";

const dataService = new DataService([
  { chainId, rpcUrl, privacyPoolAddress, startBlock }
]);

const { account, legacyAccount, errors } = await AccountService.initializeWithEvents(
  dataService,
  { mnemonic },
  pools // array of PoolInfo
);
// account       = current AccountService instance
// legacyAccount = optional legacy AccountService used when restoring migrated histories
// errors        = PoolEventsError[] for any pools whose event fetch failed

const retry = await AccountService.initializeWithEvents(
  dataService,
  { service: account },
  failedPools
);
// retry.account = updated AccountService after retrying only the missing scopes

const migratedRetry = await AccountService.initializeWithEvents(
  dataService,
  { mnemonic },
  failedPools
);
// migratedRetry.account / migratedRetry.legacyAccount = rerun failed migrated scopes
```

After initialization:

- Refresh ASP review status across every loaded chain/scope combination to determine which accounts are eligible for private withdrawal.
- Persist zero-value change commitments for history alignment, but do not treat them as spendable balances.

For a complete integration recipe and checklist, see [Frontend Integration](/build/integration).
