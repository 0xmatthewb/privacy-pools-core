---
title: SDK Utilities
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

:::info Integration
For production integration guidance, see [Integrations](/protocol/integrations).
:::


## `PrivacyPoolSDK`

Main SDK class providing high-level protocol interaction.

```tsx
class PrivacyPoolSDK {
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
  getStateRoot(privacyPoolAddress: Address): Promise<bigint>;
  getStateSize(privacyPoolAddress: Address): Promise<bigint>;
  getAssetConfig(assetAddress: Address): Promise<AssetConfig>;
  getScopeData(
    scope: bigint,
  ): Promise<{ poolAddress: Address | null; assetAddress: Address | null }>;

  approveERC20(
    spenderAddress: Address,
    tokenAddress: Address,
    amount: bigint,
  ): Promise<TransactionResponse>;
}
```

`getStateRoot(poolAddress)` returns the pool state-tree root from `currentRoot()`. This is distinct from the ASP root: for `WithdrawalProofInput.aspRoot`, use ASP `onchainMtRoot` and verify it against `Entrypoint.latestRoot()`.

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
    }>,
  );

  getDeposits(pool: PoolInfo): Promise<DepositEvent[]>;
  getWithdrawals(pool: PoolInfo, fromBlock?: bigint): Promise<WithdrawalEvent[]>;
  getRagequits(pool: PoolInfo, fromBlock?: bigint): Promise<RagequitEvent[]>;
}
```

`DataService` fetches logs in chunked, rate-limited ranges. Initialize it with the deployment `startBlock` rather than `0n`, and use the optional second constructor argument only when you need per-chain fetch overrides. It also preserves zero-value withdrawal events so account reconstruction stays correct for full-withdrawal chains, even though zero-value change commitments are not spendable.

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
): string;  // returns hex string — cast to bigint for proveWithdrawal

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
  hash: string;
  wait: () => Promise<void>;
}

interface Commitment {
  hash: Hash;              // Commitment hash
  nullifierHash: Hash;     // Hash of nullifier
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

interface AccountCommitment {
  hash: Hash;
  value: bigint;
  label: Hash;
  nullifier: Secret;
  secret: Secret;
  blockNumber: bigint;
  timestamp?: bigint;
  txHash: Hex;
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
