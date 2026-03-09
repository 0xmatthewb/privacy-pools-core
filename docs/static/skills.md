# Privacy Pools

> Privacy Pools enables compliant private transactions on Ethereum.
> Users deposit assets publicly and withdraw them privately using zero-knowledge proofs.
> Association Set Providers (ASPs) ensure only approved deposits can be withdrawn.
> Built by 0xbow. Website: https://privacypools.com | Docs: https://docs.privacypools.com

## What It Does

Privacy Pools breaks the on-chain link between deposit and withdrawal addresses. A user deposits ETH or ERC20 tokens into a pool, then later withdraws to a different address. A ZK proof demonstrates that the withdrawal is valid without revealing which deposit it came from. The ASP layer screens deposits for compliance and excludes unapproved labels from private withdrawals.

## Core Operations

1. **Deposit**: Send assets to a Privacy Pool. The user submits a precommitment hash (derived from a nullifier and secret) on-chain. The pool contract generates a unique `label` and computes the full `commitment = poseidon(value, label, precommitment)`, which is inserted into the on-chain Merkle tree. The `label` is emitted in the `Deposited` event. The integration should capture it and persist it in pool-account state alongside the nullifier and secret rather than surfacing raw secret-bearing notes to the user.
2. **Withdraw**: Generate a ZK proof showing your commitment exists in both the state tree and the ASP-approved set, then submit it on-chain. Production frontends should use the relayed path by default. Supports partial withdrawals.
3. **Ragequit**: Emergency public exit. Prove ownership of a commitment via a commitment proof, then call ragequit to recover funds to the original depositor. Sacrifices privacy but guarantees fund recovery.

## Frontend Defaults

Use these frontend defaults unless you have a specific reason not to:

- Model the user as a mnemonic-backed account and keep deposits plus change commitments in pool-account state. This keeps secret-bearing notes out of copy/paste UX and gives users a safer abstraction.
- Make relayed withdrawal the default private-withdraw UX. Self-relay and direct withdrawal are advanced non-private options.
- Only offer wallet-signature onboarding when deterministic EIP-712 signing is supported. Sign the same typed-data payload twice, require backup before continuing, use the current derivation flow for new accounts, and only expose any older restore path for existing legacy accounts.
- If manual recovery phrase entry exists, sanitize whitespace/newlines/commas, validate checksum, and avoid clipboard-first UX.
- Only offer private withdrawal from balances that are both positive and ASP-approved.
- Request relayer quotes late in the flow, usually on the review step, and invalidate them when amount, recipient, relayer, or gas-drop settings change.
- Resolve the final recipient before quote/proof generation, and warn if a partial withdrawal would leave a non-zero remainder below the relayer minimum.
- Keep ragequit separate from private withdrawal and label it clearly as public fallback.

## SDK Quick Start

The SDK is built on [viem](https://viem.sh) and uses viem's `Chain` objects, `Address`/`Hex` types, and `PublicClient` internally. If your project uses ethers.js, you can still use the SDK's standalone crypto functions (`generateMasterKeys`, `hashPrecommitment`, etc.) but `ContractInteractionsService` requires viem types.

```bash
npm install @0xbow/privacy-pools-core-sdk
```

```typescript
import {
  PrivacyPoolSDK,
  Circuits,
  DataService,
  generateMasterKeys,
  generateDepositSecrets,
  generateWithdrawalSecrets,
  getCommitment,
  hashPrecommitment,
  generateMerkleProof,
  calculateContext,
  SDKError,
  ProofError,
  type Commitment,
  type Withdrawal,
  type PoolInfo,
  type MasterKeys,
  type Hash,
} from "@0xbow/privacy-pools-core-sdk";
import { mainnet } from "viem/chains";  // or arbitrum, optimism, etc.

// 1. Initialize SDK — circuit artifacts are fetched automatically
const circuits = new Circuits();  // defaults to browser mode (fetch). For Node.js: new Circuits({ browser: false })
const sdk = new PrivacyPoolSDK(circuits);

// 2. Create contract service
// - entrypointAddress: the Entrypoint proxy contract for the target network
// - privacyPoolAddress (used below): the specific pool contract for the asset you want (ETH, USDC, etc.)
// Both addresses are listed at https://docs.privacypools.com/deployments
// Note: privateKey is for server-side / backend usage. For frontend dapps with browser wallets,
// use the contract ABIs from the contracts package (packages/contracts) with your own viem
// WalletClient. The crypto functions (generateMasterKeys, hashPrecommitment, etc.) work in
// any environment — only the ContractInteractionsService requires a private key.
const contracts = sdk.createContractInstance(rpcUrl, mainnet, entrypointAddress, privateKey);

// Read-only usage: DataService can be used standalone without PrivacyPoolSDK or a private key.
// It only needs an RPC URL. ContractInteractionsService (above) always requires a privateKey,
// even for read-only methods like getScope() — this is a constructor requirement.
// If you need scope without a private key (e.g., for DataService), you can read it directly
// from the pool contract via viem:
//   import { createPublicClient, http } from "viem";
//   const client = createPublicClient({ transport: http(rpcUrl) });
//   const scope = await client.readContract({
//     address: privacyPoolAddress, abi: [{ name: "SCOPE", type: "function",
//       inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" }],
//     functionName: "SCOPE",
//   });
// This avoids needing ContractInteractionsService for read-only workflows.
```

`contracts.getStateRoot(privacyPoolAddress)` reads the pool's `currentRoot()` and should be used for `WithdrawalProofInput.stateRoot`. This is distinct from ASP `onchainMtRoot`, which must match `Entrypoint.latestRoot()` and should be used for `aspRoot`.

`DataService` fetches logs in chunked, rate-limited ranges by default. Always initialize it with the deployment `startBlock` for the chain you are scanning. If your RPC provider is strict, you can override per-chain log fetch settings (chunk size, concurrency, delay, retries) with the optional second constructor argument:

```typescript
const logFetchConfig = new Map([
  [chainId, { blockChunkSize: 5000, concurrency: 2, chunkDelayMs: 200 }],
]);

const dataService = new DataService(
  [{ chainId, rpcUrl, privacyPoolAddress, startBlock }],
  logFetchConfig
);
```

## Frontend Account Patterns

### Account Bootstrap

The core SDK does not ship a frontend onboarding wrapper. The reference pattern is:

1. Connect a wallet and determine whether it can reproduce the same EIP-712 signature for the same payload. If not, or if the signer path is abstracted in a way that breaks deterministic signing, fall back to manual setup.
2. Build a versioned typed-data payload bound to `keccak256(addressBytes)`.
3. Sign the same payload twice and compare signatures. If the signatures differ, reject wallet-based derivation.
4. Derive the mnemonic from the signature's `r` value using HKDF, with the wallet address bytes as salt and an app-specific context string. Use the current derivation flow for new accounts and only expose any older restore path for existing legacy accounts.
5. Require the user to download or otherwise back up the recovery phrase before loading the account.
6. Never log raw signatures, recovery phrases, nullifiers, or secrets.

Feature-detect this at runtime rather than relying on wallet branding alone.

If you support manual recovery phrase load, normalize whitespace/newlines/commas and validate word count plus checksum before initializing account state.

### Pool-Account Model

- `AccountService` is the recommended production model for frontend state.
- On account load, use `AccountService.initializeWithEvents(dataService, { mnemonic }, pools)` to reconstruct deposits and withdrawal history.
- Refresh review status across every loaded chain/scope combination, not just the currently selected pool.
- If a deposit reports `APPROVED` but its label is not yet present in the current ASP leaves, continue treating it as pending until the leaf arrives.
- On deposit success, parse the `Deposited` event and persist the resulting commitment metadata into local pool-account state rather than surfacing secret-bearing notes to the user.
- On withdrawal success, append the new child/change commitment back to that same pool-account tree and refresh leaves before the next withdrawal.
- Only expose privately spendable balances from accounts that have positive balance and remain ASP-approved.
- If ragequit occurs, mark the pool account as exited.

### Recommended Frontend Withdrawal UX

- Disable withdraw CTAs unless wallet is connected, account state is loaded, at least one relayer is available, and there is at least one approved non-zero pool account.
- Filter pool-account selectors to the active chain/scope and to accounts with `balance > 0` plus `reviewStatus === APPROVED`.
- Resolve ENS on mainnet before submit, display the resolved address or reverse ENS when helpful, and block unresolved or invalid recipient input.
- Fetch `GET /relayer/details` during the form flow so you can validate `minWithdrawAmount`. If a partial withdrawal would leave a remainder `> 0` and `< minWithdrawAmount`, warn the user before review.
- `GET /{chainId}/public/deposits-larger-than` is useful for showing an anonymity-set estimate while the user edits the amount.
- Request the quote only when the review modal opens, keep a visible countdown, and if the quote expires or no longer matches the current form state, refresh it and require the user to confirm again.
- `extraGas` is an optional gas-token drop for supported non-native assets. Toggling it should invalidate the quote and update fee display.
- If proof generation takes noticeable time, surface progress phases such as `loading_circuits`, `generating_proof`, and `verifying_proof`.

## Deposit

```typescript
// Step 0 (if needed): Generate a BIP-39 mnemonic (skip if user already has one)
// import { generateMnemonic, english } from "viem/accounts";
// const mnemonic = generateMnemonic(english);  // 12-word phrase — store securely

// Step 1: Generate deterministic secrets from a mnemonic
const masterKeys = generateMasterKeys(mnemonic);
const scope = await contracts.getScope(privacyPoolAddress) as unknown as Hash; // getScope returns bigint; cast to branded Hash
// depositIndex is a sequential counter: 0n for your first deposit to this pool, 1n for second, etc.
const { nullifier, secret } = generateDepositSecrets(masterKeys, scope, depositIndex);

// Step 2: Compute precommitment hash (this is what gets submitted on-chain)
const precommitment = hashPrecommitment(nullifier, secret);

// Step 3: Validate amount against the pool's minimum deposit
// The SDK does NOT check this — the contract enforces it on-chain and the tx will revert
// with a confusing error if below minimum. Always check before submitting.
const nativeAsset = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // ETH sentinel address
const assetConfig = await contracts.getAssetConfig(nativeAsset);
if (amount < assetConfig.minimumDepositAmount) {
  throw new Error(`Deposit amount ${amount} is below minimum ${assetConfig.minimumDepositAmount}`);
}

// Step 4: Submit deposit on-chain
// amount is in the token's smallest unit (wei for ETH, token decimals for ERC20)
// ETH: 100000000000000000n = 0.1 ETH (18 decimals)
// USDC: 1000000n = 1 USDC (6 decimals)
const tx = await contracts.depositETH(amount, precommitment);
await tx.wait();

// For ERC20 deposits, approve spending first, then deposit:
// const approveTx = await contracts.approveERC20(entrypointAddress, tokenAddress, amount);
// await approveTx.wait();
// const tx = await contracts.depositERC20(tokenAddress, amount, precommitment);
// await tx.wait();

// Step 5: Capture the label AND committedValue from the Deposited event
// The pool contract generates label = keccak256(scope, nonce) % SNARK_SCALAR_FIELD
// and emits: Deposited(depositor, commitment, label, value, precommitmentHash)
// You must read `label` and `value` from the event logs of the deposit transaction.
// IMPORTANT: The event's `value` is the post-fee committed amount (after vettingFeeBPS
// deduction), which may be less than what you sent. Always use this value, not `amount`.

// Step 6: Reconstruct the full commitment locally using the on-chain label and value
const commitment = getCommitment(committedValue, label, nullifier, secret);

// Step 7 (optional): Generate commitment proof now (needed for ragequit)
const commitmentProof = await sdk.proveCommitment(committedValue, label, nullifier, secret);

// IMPORTANT: Store commitment, masterKeys, label, nullifier, and secret in
// recovery-seed-backed account state. Avoid manual note copy/paste because it exposes raw secrets to the UI,
// including clipboard and XSS-prone surfaces.
```

If the wallet supports batching, approval + deposit can be collapsed into one user action. The same pattern can extend to stake-then-deposit flows for alternative input tokens, as long as the review UI makes the final deposited asset and expected amount explicit.

## Direct Withdrawal (advanced, same-signer recipient only, non-private)

Do not surface this as the default withdrawal path. Use the relayed flow (documented below) unless the signer is also the recipient.

```typescript
// Step 1: Generate new secrets for the change commitment
// withdrawalIndex is a sequential counter: 0n for the first withdrawal from this deposit, 1n for second, etc.
const { nullifier: newNullifier, secret: newSecret } = generateWithdrawalSecrets(
  masterKeys, label, withdrawalIndex
);

// Step 1b: Validate withdrawal amount
// withdrawalAmount must be > 0 and <= the commitment's value.
// Exceeding the committed value causes a cryptic circuit error during proof generation.
const committedValue = "preimage" in commitment ? commitment.preimage.value : commitment.value;
if (withdrawalAmount <= 0n) throw new Error("Withdrawal amount must be > 0");
if (withdrawalAmount > committedValue) {
  throw new Error(`Withdrawal amount ${withdrawalAmount} exceeds committed value ${committedValue}`);
}

// Step 2: Reconstruct the state tree and build Merkle proofs
// (see "Data Sourcing" section below for full details)
const commitmentLabel = "preimage" in commitment ? commitment.preimage.label : commitment.label;
const stateMerkleProof = generateMerkleProof(allCommitmentHashes, commitment.hash);
const aspMerkleProof = generateMerkleProof(aspLabels, commitmentLabel);

// Step 3: Construct the Withdrawal object and compute context
// IMPORTANT: For direct withdrawal, processooor MUST equal the tx signer (msg.sender).
// The contract checks msg.sender == processooor and reverts with InvalidProcessooor otherwise.
// This means direct withdrawals go to the signer's own address only, and the signer submits the
// withdrawal transaction on-chain, so this is not the privacy-preserving frontend path.
// To withdraw to a *different* address, use the relayed withdrawal flow instead (see below).
import { privateKeyToAccount } from "viem/accounts";
const signerAddress = privateKeyToAccount(privateKey).address; // derive signer address from the same key used in createContractInstance
const withdrawal: Withdrawal = { processooor: signerAddress, data: "0x" };
const scope = await contracts.getScope(privacyPoolAddress) as unknown as Hash;
const context = BigInt(calculateContext(withdrawal, scope)); // calculateContext returns hex string; cast to bigint for proveWithdrawal

// Step 4: Generate ZK withdrawal proof
const stateRoot = await contracts.getStateRoot(privacyPoolAddress) as unknown as Hash;
// getStateRoot reads privacyPool.currentRoot(); aspRoot still comes from ASP onchainMtRoot.
const withdrawalProof = await sdk.proveWithdrawal(commitment, {
  context,
  withdrawalAmount,
  stateMerkleProof,
  aspMerkleProof,
  stateRoot,
  stateTreeDepth: 32n, // max tree depth — always 32n (the circuit handles actual depth via siblings)
  aspRoot: aspRoot as unknown as Hash,  // ASP API returns bigint; cast to branded Hash
  aspTreeDepth: 32n,   // max tree depth — always 32n
  newNullifier,
  newSecret,
});

// Step 5: Submit on-chain (direct withdrawal — funds go to signerAddress)
const tx = await contracts.withdraw(withdrawal, withdrawalProof, scope);
await tx.wait();
// For relayed withdrawals (third-party recipient), you must construct a DIFFERENT withdrawal
// object with processooor = entrypointAddress and ABI-encoded RelayData in data.
// See "Constructing the Withdrawal object" section below for the full relay example.
```

### Ragequit

```typescript
// Step 1: Prove ownership of the original commitment (requires label from deposit event)
// Works with both Commitment (nested .preimage) and AccountCommitment (flat shape)
const rqValue = "preimage" in commitment ? commitment.preimage.value : commitment.value;
const rqLabel = "preimage" in commitment ? commitment.preimage.label : commitment.label;
const rqNullifier = "preimage" in commitment ? commitment.preimage.precommitment.nullifier : commitment.nullifier;
const rqSecret = "preimage" in commitment ? commitment.preimage.precommitment.secret : commitment.secret;
const commitmentProof = await sdk.proveCommitment(rqValue, rqLabel, rqNullifier, rqSecret);

// Step 2: Execute ragequit — funds returned to original depositor (public, non-private)
const tx = await contracts.ragequit(commitmentProof, privacyPoolAddress);
await tx.wait();
```

## Data Sourcing

The withdrawal flow requires several inputs sourced from on-chain state and external services:

| Input | Source | How to get it |
|-------|--------|---------------|
| `scope` | Pool contract | `contracts.getScope(privacyPoolAddress)` |
| `stateRoot` | Pool contract | `contracts.getStateRoot(privacyPoolAddress)` → pool `currentRoot()` |
| `allCommitmentHashes` | ASP API (default) or direct RPC/DataService | **Default:** `GET /{chainId}/public/mt-leaves` → `response.stateTreeLeaves` (pre-ordered). **Advanced fallback:** reconstruct from `DataService` events (see below) |
| `aspRoot` | ASP API | `GET /{chainId}/public/mt-roots` → `response.onchainMtRoot`. Requires `X-Pool-Scope` header. This is separate from `stateRoot`; verify it against on-chain `Entrypoint.latestRoot()` before submitting |
| `aspLabels` | ASP API | `GET /{chainId}/public/mt-leaves` → `response.aspLeaves`. Requires `X-Pool-Scope` header. Returns `string[]` of decimal bigint labels |
| `label` | Deposit event | Read from `Deposited` event logs after deposit tx |
| `withdrawal` | Constructed by user | Default frontend path: `{ processooor: entrypointAddress, data: relayData }` (relayed). Advanced fallback: `{ processooor: signerAddress, data: "0x" }` (direct) |
| `context` | Derived | `calculateContext(withdrawal, scope)` |

### Reconstructing the state tree

**Preferred: Use the ASP API.** The `GET /{chainId}/public/mt-leaves` endpoint returns `stateTreeLeaves`, the complete, pre-ordered list of commitment hashes for the pool. This is the simplest and most reliable way to build the state Merkle proof:

```typescript
// Fetch state tree leaves and ASP labels in one call
const aspApiHost = getAspApiHost(chainId); // see getAspApiHost helper in "ASP data" section below
const scope = await contracts.getScope(privacyPoolAddress);
const res = await fetch(`${aspApiHost}/${chainId}/public/mt-leaves`, {
  headers: { "X-Pool-Scope": scope.toString() },
});
const { aspLeaves, stateTreeLeaves } = await res.json();

// Convert to bigint arrays
const allCommitmentHashes: bigint[] = stateTreeLeaves.map((s: string) => BigInt(s));
const aspLabels: bigint[] = aspLeaves.map((s: string) => BigInt(s));

// Build Merkle proofs directly
const commitmentLabel = "preimage" in commitment ? commitment.preimage.label : commitment.label;
const stateMerkleProof = generateMerkleProof(allCommitmentHashes, commitment.hash);
const aspMerkleProof = generateMerkleProof(aspLabels, commitmentLabel);

// Optional but recommended: validate that the ASP-sourced state tree matches on-chain root
const onChainRoot = await contracts.getStateRoot(privacyPoolAddress);
if (stateMerkleProof.root !== onChainRoot) {
  throw new Error("ASP stateTreeLeaves do not match on-chain root — data may be stale or tampered");
}
```

The default path is ASP API. If you need a fallback, use direct RPC via `DataService`.

**Advanced fallback: Reconstruct from on-chain events via RPC.** If the API is unavailable, build the state tree from deposit and withdrawal event logs. Each deposit inserts a `commitment` leaf; each withdrawal inserts a `newCommitment` leaf (the change commitment). Ragequit does NOT insert a leaf — it only spends a nullifier. Leaves must be merged in **on-chain insertion order** (by block number, then log index within the block). The SDK event types don't expose `logIndex`, so the best available approach is to sort by `blockNumber` and rely on stable sort to preserve relative order. Since `DataService` returns events via `getLogs` (which preserves log ordering), each array from `getDeposits()` and `getWithdrawals()` is already internally ordered. Spread deposits before withdrawals and stable-sort by block — this is correct for the common case (a commitment must exist before it can be spent). Always validate the reconstructed root against the on-chain pool root (`contracts.getStateRoot(privacyPoolAddress)` -> `privacyPool.currentRoot()`) to catch rare same-block interleaving mismatches.

```typescript
// Use the deployment start block for the chain (see Supported Networks table above).
// DataService fetches logs in chunked, rate-limited ranges by default, but using 0n
// would still scan from genesis and be unnecessarily slow.
const startBlock = 22153709n; // mainnet — see Supported Networks table for other chains
const dataService = new DataService([{ chainId, rpcUrl, privacyPoolAddress, startBlock }]);
const pool: PoolInfo = { chainId, address: privacyPoolAddress, scope, deploymentBlock: startBlock };

// Fetch all events from the pool
const deposits = await dataService.getDeposits(pool);
const withdrawals = await dataService.getWithdrawals(pool);
// Also available: const ragequits = await dataService.getRagequits(pool);
// getWithdrawals and getRagequits accept an optional fromBlock parameter for incremental fetching:
//   const newWithdrawals = await dataService.getWithdrawals(pool, lastProcessedBlock + 1n);
//   const newRagequits = await dataService.getRagequits(pool, lastProcessedBlock + 1n);
// If your RPC provider is strict, pass a second constructor arg with per-chain log fetch
// overrides (blockChunkSize, concurrency, chunkDelayMs, retryOnFailure, maxRetries).

// Merge leaves in on-chain insertion order (by block number).
// Both arrays are already in log order from getLogs. Use a stable merge so that
// same-block events from each array keep their relative order.
const depositLeaves = deposits.map(d => ({ hash: d.commitment, blockNumber: d.blockNumber }));
const withdrawalLeaves = withdrawals.map(w => ({ hash: w.newCommitment, blockNumber: w.blockNumber }));
const allLeaves = [...depositLeaves, ...withdrawalLeaves]
  .sort((a, b) => (a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : 0));
// Note: JavaScript's Array.sort is stable (ES2019+), so same-blockNumber items
// preserve their relative order from the spread. Since deposits are spread first,
// same-block deposits appear before same-block withdrawals, matching on-chain order
// (a commitment must be inserted before it can be spent in the same block).
//
// Caveat: the SDK event types don't expose logIndex, so if unrelated deposits and
// withdrawals interleave within the same block, this ordering may not match on-chain
// insertion order exactly. Always validate the reconstructed root (see below) and
// re-fetch events if it doesn't match.

const allCommitmentHashes: bigint[] = allLeaves.map(l => l.hash);

// Generate Merkle proof for your specific commitment
const stateMerkleProof = generateMerkleProof(allCommitmentHashes, commitment.hash);
// Returns LeanIMTMerkleProof<bigint> with: { root, leaf, index, siblings }
// IMPORTANT: Always validate — if stateMerkleProof.root !== the on-chain pool root
// (contracts.getStateRoot(privacyPoolAddress) -> privacyPool.currentRoot()),
// your tree is stale or misordered. Re-fetch events and rebuild. If the root still
// doesn't match after a fresh fetch, same-block interleaving may be the cause —
// try swapping the order of deposit/withdrawal leaves that share the same blockNumber.
```

### ASP data

The `aspRoot` and `aspLabels` come from the Association Set Provider (ASP), operated by 0xbow. The ASP screens deposits for compliance and publishes a Merkle tree of approved **labels** (not commitment hashes). The ZK circuit verifies that the deposit's `label` is a leaf in the ASP tree. Since the `label` stays the same across partial withdrawals, a single ASP approval covers the original deposit and all its subsequent change commitments. Most deposits are approved within 1 hour, though some may take up to 7 days. The ASP can also retroactively remove a label from the approved set — if removed, private withdrawal fails (the label will be absent from `aspLeaves`) but ragequit (public exit) always remains available. **Pre-withdrawal safety check:** Always verify your deposit's label is still present in `aspLeaves` before generating a withdrawal proof. If the label has been removed since your last check, the ASP Merkle proof won't include your label. Even if the label is removed AFTER you generate a proof but BEFORE you submit, the proof may still succeed if the on-chain ASP root hasn't been updated yet — but if the root has changed, you'll get `IncorrectASPRoot` and must regenerate with fresh ASP data.

ASP data is available through the public HTTP API below.

Base URLs:
- Mainnet: `https://api.0xbow.io`
- Testnet: `https://dw.0xbow.io`
- Swagger docs: `https://api.0xbow.io/api-docs` (live responses differ from the published schema on some endpoints, including `mt-roots`, event listings, and `pool-info`, so use the concrete response shapes documented here when parsing responses)

> **Note:** `request.0xbow.io` is a partner-only host (API-key gated) and does **not** serve the public `mt-roots` / `mt-leaves` endpoints documented below. Only use `api.0xbow.io` (mainnet) or `dw.0xbow.io` (testnet) for ASP data.

**Host selection helper** (used in all code samples below):

```typescript
function getAspApiHost(chainId: number): string {
  const hosts: Record<number, string> = {
    1:        "https://api.0xbow.io",  // Ethereum Mainnet
    42161:    "https://api.0xbow.io",  // Arbitrum
    10:       "https://api.0xbow.io",  // OP Mainnet
    11155111: "https://dw.0xbow.io",   // Sepolia testnet
    11155420: "https://dw.0xbow.io",   // OP Sepolia testnet
  };
  const host = hosts[chainId];
  if (!host) throw new Error(`No ASP API host configured for chainId ${chainId}`);
  return host;
}
```

#### `GET /{chainId}/public/mt-roots`: ASP Merkle root

Returns the current ASP tree root for a pool. **Required header:** `X-Pool-Scope` (scope as decimal string).

```typescript
const aspApiHost = getAspApiHost(chainId); // see helper above
const scope = await contracts.getScope(privacyPoolAddress);
const res = await fetch(`${aspApiHost}/${chainId}/public/mt-roots`, {
  headers: { "X-Pool-Scope": scope.toString() },
});
const { mtRoot, createdAt, onchainMtRoot } = await res.json();
// mtRoot: string — latest ASP Merkle root (decimal bigint string) from the database
// createdAt: string — ISO timestamp of this root
// onchainMtRoot: string — the root value currently committed on-chain via Entrypoint.latestRoot()
//
// IMPORTANT: The proof's aspRoot must match Entrypoint.latestRoot(). Use onchainMtRoot for the
// proof — it reflects what the contract will validate against. mtRoot may be ahead of
// onchainMtRoot if the ASP has computed a new root that hasn't been pushed on-chain yet.
// The mt-leaves endpoint returns leaves corresponding to mtRoot, so if mtRoot !== onchainMtRoot,
// wait and re-fetch until they converge before building the proof.
const aspRoot = BigInt(onchainMtRoot) as unknown as Hash;
```

#### `GET /{chainId}/public/mt-leaves`: ASP labels + state tree leaves

Returns both the ASP-approved labels and the state tree commitment hashes for a pool. **Required header:** `X-Pool-Scope` (scope as decimal string).

```typescript
const aspApiHost = getAspApiHost(chainId); // see helper above
const res = await fetch(`${aspApiHost}/${chainId}/public/mt-leaves`, {
  headers: { "X-Pool-Scope": scope.toString() },
});
const { aspLeaves, stateTreeLeaves } = await res.json();
// aspLeaves: string[] — approved labels (decimal bigint strings), in tree insertion order
// stateTreeLeaves: string[] — all commitment hashes (decimal bigint strings), in tree insertion order
const aspLabels: bigint[] = aspLeaves.map((s: string) => BigInt(s));
const allCommitmentHashes: bigint[] = stateTreeLeaves.map((s: string) => BigInt(s));
```

**Important notes:**
- The `X-Pool-Scope` value must be a **decimal string**. Hex or other non-decimal values will not match any pool (the API treats the header as a literal string lookup, so a hex-encoded scope returns 404, not a validation error).
- Both endpoints are unauthenticated (no API key required) on the mainnet and testnet hosts.
- No pagination. The full leaf arrays are returned in a single response.
- The ASP root submitted in the proof **must exactly match** the on-chain `Entrypoint.latestRoot()`. Any difference will cause the withdrawal to revert with `IncorrectASPRoot`. Use `onchainMtRoot` from the `mt-roots` response (not `mtRoot`) as your proof's `aspRoot`. Always verify `BigInt(onchainMtRoot) === Entrypoint.latestRoot()` before submitting. If `mtRoot !== onchainMtRoot`, the leaves may not yet reflect the on-chain state. Wait and re-fetch until they converge.
- If `X-Pool-Scope` is missing, the API currently returns HTTP 400 with a message like `"Pool scope is required in X-Pool-Scope header"`. If the header is present but does not match a known decimal scope value (including hex-encoded scope), the API returns 404. Do not hardcode the full error body. Match on status code and handle gracefully.
- Rate-limit details are not published. Treat HTTP 403, 429, or any equivalent throttle response as a backoff signal and retry with exponential delay.

**Checking if a deposit is ASP-approved:**

To check whether a deposit has been approved for private withdrawal, fetch the ASP labels and look for the deposit's `label`:

```typescript
const aspApiHost = getAspApiHost(chainId);
const scope = await contracts.getScope(privacyPoolAddress);
const res = await fetch(`${aspApiHost}/${chainId}/public/mt-leaves`, {
  headers: { "X-Pool-Scope": scope.toString() },
});
const { aspLeaves } = await res.json();
const labelStr = label.toString(); // label from your deposit event
const isApproved = aspLeaves.includes(labelStr);
// If not approved: wait and re-check (most deposits approved within 1 hour, up to 7 days).
// While unapproved, ragequit is the only exit path.
// If no deposits have been approved yet (new pool), aspLeaves will be empty
// and generateMerkleProof will throw MERKLE_ERROR.
```

#### `GET /{chainId}/health/liveness`: ASP availability check

Returns the current health status of the ASP API for a given chain. Use this before making ASP data calls to verify the service is reachable.

```typescript
const aspApiHost = getAspApiHost(chainId);
const res = await fetch(`${aspApiHost}/${chainId}/health/liveness`);
const { status } = await res.json();
// status: "ok" when healthy
if (status !== "ok") throw new Error(`ASP API unhealthy for chain ${chainId}`);
```

#### `GET /{chainId}/health/asp`: ASP pool leaf counts

Returns pool-level leaf counts, useful for sanity-checking whether the ASP is indexing a given pool.

```typescript
const res = await fetch(`${aspApiHost}/${chainId}/health/asp`);
const { status, currentLeaves } = await res.json();
// currentLeaves: Array<{ poolId: number, totalLeaves: number }>
// Example: [{ poolId: 1, totalLeaves: 6229 }, { poolId: 6, totalLeaves: 749 }]
```

#### `GET /global/public/entrypoints`: Programmatic chain discovery

Returns all chains with their entrypoint contract addresses and deployment start blocks. Useful for dynamically determining which chains are supported.

```typescript
const res = await fetch(`${aspApiHost}/global/public/entrypoints`);
const { chains } = await res.json();
// chains: Record<string, { entrypoint: string, fromBlock: number, chainId: string }>
// Example: { ethereum: { entrypoint: "0x6818...", fromBlock: 22167294, chainId: "1" }, ... }
```

> **Note:** Treat `GET /global/public/entrypoints` as discovery data. Validate chains against the **Supported Networks** table before using them. For this SDK workflow, filter to the chains listed in the **Supported Networks** table below (Ethereum, Arbitrum, OP Mainnet, Sepolia, OP Sepolia) unless you have separately validated additional chains. **Important:** The `fromBlock` in this response is the entrypoint deployment block, which may be later than the optimal `startBlock` for event scanning. Always use the `startBlock` values from the **Supported Networks** table for `DataService` — using the entrypoints `fromBlock` could miss early deposit events.

#### `GET /{chainId}/public/deposits-larger-than`: Anonymity set size

Returns the number of deposits above a given amount threshold for a pool. **Required header:** `X-Pool-Scope` (scope as decimal string). **Required query:** `amount` (decimal bigint string in wei, e.g. `"1000000000000000000"`). Useful for agents assessing anonymity set quality before initiating a withdrawal.

```typescript
const aspApiHost = getAspApiHost(chainId);
const scope = await contracts.getScope(privacyPoolAddress);
const res = await fetch(
  `${aspApiHost}/${chainId}/public/deposits-larger-than?amount=1000000000000000000`,
  { headers: { "X-Pool-Scope": scope.toString() } }
);
const { eligibleDeposits, totalDeposits, percentage, rank, uniqueAmountsAbove } = await res.json();
// eligibleDeposits: number — count of deposits >= the threshold
// totalDeposits: number — total deposit count in the pool
// percentage: number — eligibleDeposits / totalDeposits * 100
// rank: number — ordinal rank of this amount among unique deposit amounts
// uniqueAmountsAbove: number — count of distinct deposit amounts above the threshold
```

**On-chain/IPFS (supplemental, not canonical client source):**

- Latest root: `Entrypoint.latestRoot()` (selector: `0xd7b0fef1`).
- Historical root access: admin-only.
- CID source: `associationSets(index).ipfsCID` returns the IPFS CID containing the label set for a given root index.

### Constructing the Withdrawal object

```typescript
interface Withdrawal {
  processooor: Address;  // Direct: signer's own address (msg.sender). Relayed: MUST be the Entrypoint address.
  data: Hex;             // "0x" for direct withdrawals; ABI-encoded RelayData for relayed
}
```

Direct withdrawal (advanced only):

```typescript
const withdrawal: Withdrawal = { processooor: signerAddress, data: "0x" };
```

Relayed withdrawal (production default):

```typescript
import { encodeAbiParameters } from "viem";
// processooor MUST be the Entrypoint address (not the relayer).
// The actual recipient and fee recipient are encoded in the data field as RelayData.
// Fee is bounded by maxRelayFeeBPS from getAssetConfig().
const relayData = encodeAbiParameters(
  [
    { name: "recipient", type: "address" },       // final recipient of withdrawn funds
    { name: "feeRecipient", type: "address" },     // relayer address (receives the fee)
    { name: "relayFeeBPS", type: "uint256" },      // fee in basis points (e.g. 50 = 0.5%)
  ],
  [recipientAddress, relayerAddress, relayFeeBPS] // relayerAddress = feeReceiverAddress from GET /relayer/details
);
const withdrawal: Withdrawal = { processooor: entrypointAddress, data: relayData };
```

### Relayer API

The relayer is a **separate service** from the ASP API and is not hosted on `api.0xbow.io` or `dw.0xbow.io`.

Base URLs:
- Mainnet: `https://fastrelay.xyz`
- Testnet: `https://testnet-relayer.privacypools.com`

**Host selection helper** (mirrors the ASP helper pattern):

```typescript
function getRelayerHost(chainId: number): string {
  const hosts: Record<number, string> = {
    1:        "https://fastrelay.xyz",                    // Ethereum Mainnet
    42161:    "https://fastrelay.xyz",                    // Arbitrum
    10:       "https://fastrelay.xyz",                    // OP Mainnet
    11155111: "https://testnet-relayer.privacypools.com", // Sepolia testnet
    11155420: "https://testnet-relayer.privacypools.com", // OP Sepolia testnet
  };
  const host = hosts[chainId];
  if (!host) throw new Error(`No relayer host configured for chainId ${chainId}`);
  return host;
}
```

The public production relayer is operated by Fat Solutions. The relayer code is open-source (`packages/relayer`) and anyone can host their own. The relayer supports EVM chains and assets currently served by `fastrelay.xyz`; verify each chain/asset pair with `GET /relayer/details?chainId={chainId}&assetAddress={asset}` before use.

Request `/relayer/quote` on the review step, start a visible countdown, and discard the quote whenever amount, recipient, relayer, or `extraGas` changes.

The API matches the OSS relayer contract (`packages/relayer`) exactly:

- `POST /relayer/quote`
- `POST /relayer/request`
- `GET /relayer/details`

Example `POST /relayer/quote` without `recipient` (fee estimate only, no signed commitment):

```json
{
  "chainId": 11155111,
  "amount": "1000000000000000000",
  "asset": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  "extraGas": false
}
```

`extraGas`: when `true`, requests an additional native gas-token drop as part of the relayed withdrawal. The quote includes both the extra funding and the extra execution cost. The current website exposes this only for supported non-native assets and refreshes the quote whenever the toggle changes. Native-asset quotes force `extraGas = false`.

Response (values are dynamic and vary with gas price and relayer config):

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

Example `POST /relayer/quote` with `recipient` (returns a signed `feeCommitment` to pass through to `/relayer/request`):

```json
{
  "chainId": 11155111,
  "amount": "1000000000000000000",
  "asset": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  "extraGas": false,
  "recipient": "0xRecipientAddress"
}
```

Response:

```json
{
  "baseFeeBPS": "10",
  "feeBPS": "17",
  "gasPrice": "1089675357",
  "detail": { "relayTxCost": { "gas": "650000", "eth": "708288982050000" } },
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

Example `POST /relayer/request` (schema: `zRelayRequest` in `packages/relayer/src/schemes/relayer/request.scheme.ts`):

```json
{
  "chainId": 11155111,
  "scope": "123456789012345678901234567890",
  "withdrawal": {
    "processooor": "0x6818809eefce719e480a7526d76bd3e561526b46",
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

**Schema notes:**
- `scope`: decimal bigint string (not hex)
- `publicSignals`: must be exactly 8 elements (string array)
- `proof.pi_a` / `pi_c`: 3-element string tuples; `proof.pi_b`: 3×2-element string tuples. The relayer only requires `pi_a`, `pi_b`, `pi_c`. Extra fields like `protocol` and `curve` from the `Groth16Proof` type are accepted and ignored
- `feeCommitment` is optional at schema level, but for production relayed withdrawals it should be included from `/relayer/quote` to lock a signed fee. When present, ALL 6 fields are required: `expiration`, `withdrawalData`, `asset`, `extraGas`, `amount`, `signedRelayerCommitment`
- The `feeCommitment` expires **60 seconds** after the quote response. The full quote → proof generation → request submission flow must complete within this window. Proof generation typically takes 5-15 seconds in Node.js (varies by machine). If the commitment has expired, re-fetch a new quote before retrying. The relayer API does not support cancellation. If the commitment has expired, re-quote.
- The `feeCommitment` fields come directly from the `/relayer/quote` response. Pass them through unchanged

Example response:

```json
{
  "success": true,
  "txHash": "0x...",
  "timestamp": 1744676669549,
  "requestId": "uuid"
}
```

Example `GET /relayer/details?chainId=11155111&assetAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` response:

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

Recommended form pattern: compare the intended post-withdrawal remainder against `minWithdrawAmount`. If the remainder would be non-zero but below the minimum, warn before review and offer alternatives such as withdrawing less, withdrawing max, or leaving the remainder for a later public exit.

### End-to-end relayed withdrawal

This is the recommended privacy-preserving flow: withdraw to a **different address** via the relayer. The steps are: (1) get a relayer fee quote with a signed commitment, (2) construct the relay Withdrawal object, (3) generate the ZK proof, (4) submit to the relayer. The entire flow must complete within 60 seconds (the feeCommitment TTL).

**Recommended default:** use the hosted relayer (`https://fastrelay.xyz`) for production agent and human+agent workflows. Self-relay and direct withdrawal should be treated as advanced non-private options.

```typescript
// Prerequisites: you have commitment, masterKeys, label from your deposit,
// and aspRoot/aspLabels/allCommitmentHashes from the ASP API (see Data Sourcing above).
// Resolve ENS or other human-readable recipient input to a final address before this flow.

// Step 1: Get a relayer fee quote WITH recipient (returns signed feeCommitment)
// Production UX pattern: do this on the review step, not earlier in the form flow.
const relayerHost = getRelayerHost(1); // mainnet; helper handles testnets too
const nativeAsset = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const quoteRes = await fetch(`${relayerHost}/relayer/quote`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chainId: 1,
    amount: String(withdrawalAmount),
    asset: nativeAsset,
    extraGas: false,
    recipient: recipientAddress,  // the final recipient of withdrawn funds
  }),
});
if (!quoteRes.ok) throw new Error(`Relayer quote request failed: ${quoteRes.status}`);
const quote = await quoteRes.json();
// quote.feeCommitment expires in 60 seconds — complete the remaining steps quickly

// Step 1b: Get relayer details for the canonical fee receiver and limits
const detailsRes = await fetch(
  `${relayerHost}/relayer/details?chainId=1&assetAddress=${nativeAsset}`
);
if (!detailsRes.ok) throw new Error(`Relayer details request failed: ${detailsRes.status}`);
const details = await detailsRes.json();
if (withdrawalAmount < BigInt(details.minWithdrawAmount)) {
  throw new Error(
    `Withdrawal amount ${withdrawalAmount} is below relayer minimum ${details.minWithdrawAmount}`
  );
}
const committedValue = "preimage" in commitment ? commitment.preimage.value : commitment.value;
const remainingBalance = committedValue - withdrawalAmount;
if (remainingBalance > 0n && remainingBalance < BigInt(details.minWithdrawAmount)) {
  throw new Error(
    `Remaining balance ${remainingBalance} is below relayer minimum ${details.minWithdrawAmount}`
  );
}

// Step 1c: Validate that the quoted fee is within the on-chain maximum
const assetConfig = await contracts.getAssetConfig(nativeAsset);
if (BigInt(quote.feeBPS) > assetConfig.maxRelayFeeBPS) {
  throw new Error(
    `Quoted fee ${quote.feeBPS} BPS exceeds on-chain max ${assetConfig.maxRelayFeeBPS} BPS`
  );
}

// Step 2: Construct the relay Withdrawal object
// processooor MUST be entrypointAddress (NOT the relayer, NOT the recipient)
import { encodeAbiParameters } from "viem";
const relayData = encodeAbiParameters(
  [
    { name: "recipient", type: "address" },
    { name: "feeRecipient", type: "address" },
    { name: "relayFeeBPS", type: "uint256" },
  ],
  [recipientAddress, details.feeReceiverAddress, BigInt(quote.feeBPS)]
);
const withdrawal: Withdrawal = { processooor: entrypointAddress, data: relayData };

// Step 3: Generate the ZK proof (same as direct withdrawal, but with relay-specific context)
const scope = await contracts.getScope(privacyPoolAddress) as unknown as Hash;
const context = BigInt(calculateContext(withdrawal, scope));
const { nullifier: newNullifier, secret: newSecret } = generateWithdrawalSecrets(
  masterKeys, label, withdrawalIndex
);
const stateRoot = await contracts.getStateRoot(privacyPoolAddress) as unknown as Hash;
const commitmentLabel = "preimage" in commitment ? commitment.preimage.label : commitment.label;
const stateMerkleProof = generateMerkleProof(allCommitmentHashes, commitment.hash);
const aspMerkleProof = generateMerkleProof(aspLabels, commitmentLabel);

const withdrawalProof = await sdk.proveWithdrawal(commitment, {
  context,
  withdrawalAmount,
  stateMerkleProof,
  aspMerkleProof,
  stateRoot,
  stateTreeDepth: 32n,
  aspRoot: aspRoot as unknown as Hash,
  aspTreeDepth: 32n,
  newNullifier,
  newSecret,
});

// Step 4: Submit to the relayer (NOT on-chain directly)
const requestRes = await fetch(`${relayerHost}/relayer/request`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chainId: 1,
    scope: scope.toString(),  // decimal string
    withdrawal: {
      processooor: entrypointAddress,
      data: relayData,
    },
    proof: withdrawalProof.proof,
    publicSignals: withdrawalProof.publicSignals,
    feeCommitment: quote.feeCommitment,  // pass through unchanged from quote response
  }),
});
if (!requestRes.ok) {
  // Relayer returns JSON error bodies with { message, error?, statusCode? } on failure.
  // Common: 400 (bad proof/inputs), 422 (expired feeCommitment), 503 (relayer at capacity).
  const errBody = await requestRes.json().catch(() => ({}));
  throw new Error(`Relayer request failed (${requestRes.status}): ${errBody.message ?? "unknown"}`);
}
const result = await requestRes.json();
// result: { success: true, txHash: "0x...", timestamp: ..., requestId: "..." }

// Step 5: Wait for the relay transaction to be mined
// The relayer returns a txHash but the tx may still be pending — wait for confirmation.
import { createPublicClient, http } from "viem";
const publicClient = createPublicClient({ chain: mainnet, transport: http(rpcUrl) });
const receipt = await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });
if (receipt.status !== "success") {
  throw new Error(`Relay transaction reverted: ${result.txHash}`);
}
// After success, persist the new change commitment in your local pool-account tree.
// If the quote expired or the user changed amount/recipient/extraGas during review,
// refresh the quote and require another confirm click before proving/submitting.
```

### Reading the label and committed value from deposit events

The `label` and `value` (post-fee committed amount) are generated on-chain during deposit. You must read them from the `Deposited` event emitted by the pool contract.

**Option A: From the transaction receipt (viem)**

```typescript
import { decodeEventLog, parseAbi } from "viem";

// Note: the 5th arg is named _precommitmentHash in the contract (IPrivacyPool.sol).
// The SDK's DataService internally parses it as _merkleRoot — this is a naming mismatch
// in the SDK, but the value is the same. Use the contract name when decoding manually.
const depositedEvent = parseAbi([
  "event Deposited(address indexed _depositor, uint256 _commitment, uint256 _label, uint256 _value, uint256 _precommitmentHash)"
]);

const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
for (const log of receipt.logs) {
  try {
    const decoded = decodeEventLog({ abi: depositedEvent, data: log.data, topics: log.topics });
    const label = decoded.args._label;              // bigint
    const committedValue = decoded.args._value;      // bigint (post-fee amount)
    break;
  } catch { /* not this event */ }
}
```

**Option B: From DataService (simpler, fetches all deposits)**

```typescript
const deposits = await dataService.getDeposits(pool);
const myDeposit = deposits.find(d => d.transactionHash === tx.hash);
if (!myDeposit) throw new Error("Deposit not found — tx may not be indexed yet");
const label = myDeposit.label;              // bigint
const committedValue = myDeposit.value;     // bigint (post-fee amount)
```

**Other event ABIs for manual receipt decoding:**

```typescript
import { parseAbi } from "viem";

// Withdrawn event (emitted by the pool contract on withdrawal)
const withdrawnEvent = parseAbi([
  "event Withdrawn(address indexed _processooor, uint256 _value, uint256 _spentNullifier, uint256 _newCommitment)"
]);

// Ragequit event (emitted by the pool contract on ragequit)
const ragequitEvent = parseAbi([
  "event Ragequit(address indexed _ragequitter, uint256 _commitment, uint256 _label, uint256 _value)"
]);

// Key contract function ABIs (for direct contract interaction without the SDK):
// Note: IERC20 is `address` at the ABI level; param names match IEntrypoint.sol exactly.
const entrypointAbi = parseAbi([
  "function deposit(uint256 _precommitment) payable",
  "function deposit(address _asset, uint256 _value, uint256 _precommitment)",
  "function relay((address processooor, bytes data) _withdrawal, (uint256[2] _pA, uint256[2][2] _pB, uint256[2] _pC, uint256[8] _pubSignals) _proof, uint256 _scope)",
  "function latestRoot() view returns (uint256)",
]);
const poolAbi = parseAbi([
  "function withdraw((address processooor, bytes data) _withdrawal, (uint256[2] _pA, uint256[2][2] _pB, uint256[2] _pC, uint256[8] _pubSignals) _proof)",
  "function ragequit((uint256[2] _pA, uint256[2][2] _pB, uint256[2] _pC, uint256[4] _pubSignals) _commitmentProof)",
  "function SCOPE() view returns (uint256)",
  "function currentRoot() view returns (uint256)",
  "function currentTreeSize() view returns (uint256)",
]);
// Full ABIs are available in the contracts package artifacts: packages/contracts/
```

### Recovering deposits from a mnemonic

To find which deposits belong to a given mnemonic, compute the expected precommitment hash for each sequential deposit index and match it against on-chain deposit events:

```typescript
const masterKeys = generateMasterKeys(mnemonic);
const scope = await contracts.getScope(privacyPoolAddress) as unknown as Hash;
const allDeposits = await dataService.getDeposits(pool);

const myDeposits = [];
let consecutiveMisses = 0;
const MAX_CONSECUTIVE_MISSES = 10; // tolerate gaps from failed txs (matches SDK behavior)
for (let i = 0n; ; i++) {
  const { nullifier, secret } = generateDepositSecrets(masterKeys, scope, i);
  const precommitment = hashPrecommitment(nullifier, secret);
  const match = allDeposits.find(d => d.precommitment === precommitment);
  if (!match) {
    consecutiveMisses++;
    if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) break;
    continue;
  }
  consecutiveMisses = 0;
  myDeposits.push({ ...match, nullifier, secret, index: i });
}
// myDeposits now contains all your deposits with their secrets for withdrawal/ragequit

// After recovery, determine the correct withdrawalIndex for each deposit.
// withdrawalIndex is a global counter per label — count prior withdrawals to find the next index.
const allWithdrawals = await dataService.getWithdrawals(pool);
const spentNullifiers = new Set(allWithdrawals.map(w => w.spentNullifier.toString()));

// Note: spentNullifier = Poseidon(nullifier). The SDK does not export Poseidon.
// Install circomlibjs for manual matching (or use AccountService in production).
import { buildPoseidon } from "circomlibjs";
const poseidon = await buildPoseidon();

for (const dep of myDeposits) {
  // withdrawalIndex is global per label: 0n, 1n, 2n, ...
  // Find the first index whose nullifier hash is NOT already spent.
  let wi = 0n;
  while (true) {
    const { nullifier: wNullifier } = generateWithdrawalSecrets(masterKeys, dep.label, wi);
    const wNullifierHash = BigInt(poseidon.F.toString(poseidon([wNullifier])));
    if (!spentNullifiers.has(wNullifierHash.toString())) break;
    wi++;
  }
  (dep as any).nextWithdrawalIndex = wi;
}
// For production recovery flows, use AccountService — it tracks withdrawal state automatically
// and provides getSpendableCommitments() and createWithdrawalSecrets(commitment) methods.
```

> **Determining `withdrawalIndex` after recovery:** The `withdrawalIndex` is a global counter per label — it does NOT reset for change commitments. After recovering deposits, you need to know how many withdrawals have already been made from each label to avoid reusing an index (which generates invalid secrets). The simplest production approach is `AccountService`, which tracks withdrawal state automatically via `createWithdrawalSecrets(commitment)`. For manual tracking, scan `WithdrawalEvent`s and match `spentNullifier` values against derived nullifier hashes for each sequential index until no match is found.

### AccountService (production account tracking)

`AccountService` manages deposit/withdrawal state automatically. It is the recommended way to track `withdrawalIndex`, spendable commitments, and change commitments in production.

```typescript
import { AccountService, DataService } from "@0xbow/privacy-pools-core-sdk";

// Option A: Initialize from a mnemonic (fresh start)
// The constructor alone does NOT scan on-chain events — it creates a blank account state.
const dataService = new DataService([{ chainId, rpcUrl, privacyPoolAddress, startBlock }]);
const accountService = new AccountService(dataService, { mnemonic });

// Option B: Initialize from an existing account state (e.g., loaded from storage)
// PrivacyPoolAccount is the serializable internal state object — see SDK types for its shape.
// const accountService = new AccountService(dataService, { account: savedAccount });

// Recommended: Initialize with on-chain event history to discover existing deposits.
// initializeWithEvents scans on-chain events to find deposits, compute withdrawal history,
// and build the internal commitment tracking state. Use this for existing wallets.
// const { account: accountService, errors } =
//   await AccountService.initializeWithEvents(dataService, { mnemonic }, pools);
// if (errors.length > 0) {
//   // Some pools failed to sync; retry with the same account + failed pools.
// }

// Key methods:
// - getSpendableCommitments(): Map<bigint, AccountCommitment[]>
//     Returns a map of scope → spendable commitments (excludes zero-value and spent)
// - createDepositSecrets(scope, index?): auto-tracks deposit index per scope
// - createWithdrawalSecrets(commitment): auto-tracks withdrawalIndex per label
// - getDepositEvents(pool), getWithdrawalEvents(pool), getRagequitEvents(pool): fetch events
//
// Persisting state between sessions:
// NOTE: PrivacyPoolAccount contains bigint and Map values. Plain JSON.stringify will fail.
// const serialized = JSON.stringify(accountService.account, (_key, value) => {
//   if (typeof value === "bigint") return { __type: "bigint", value: value.toString() };
//   if (value instanceof Map) return { __type: "map", value: Array.from(value.entries()) };
//   return value;
// });
// localStorage.setItem("pp-account", serialized);
//
// const savedState = localStorage.getItem("pp-account");
// if (savedState) {
//   const parsed = JSON.parse(savedState, (_key, value) => {
//     if (value?.__type === "bigint") return BigInt(value.value);
//     if (value?.__type === "map") return new Map(value.value);
//     return value;
//   });
//   const restored = new AccountService(dataService, { account: parsed });
// }
```

## Contract Read Methods

`ContractInteractionsService` (returned by `sdk.createContractInstance()`) provides these read methods:

| Method | Returns | Description |
|--------|---------|-------------|
| `getScope(poolAddress)` | `bigint` | Pool's unique scope identifier |
| `getStateRoot(poolAddress)` | `bigint` | Current state Merkle root of the pool (`currentRoot()`). |
| `getStateSize(poolAddress)` | `bigint` | Current number of leaves in the state tree |
| `getAssetConfig(assetAddress)` | `AssetConfig` | Pool address, minimum deposit, fee config |
| `getScopeData(scope)` | `{ poolAddress, assetAddress }` | Reverse lookup: scope → pool + asset addresses (note: `poolAddress` here is the same value as `AssetConfig.pool`) |

## Contract Write Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `depositETH(amount, precommitment)` | `bigint, bigint` | Deposit ETH into the pool |
| `depositERC20(tokenAddress, amount, precommitment)` | `Address, bigint, bigint` | Deposit ERC20 tokens |
| `approveERC20(spenderAddress, tokenAddress, amount)` | `Address, Address, bigint` | Approve ERC20 spending (call before depositERC20) |
| `withdraw(withdrawal, proof, scope)` | `Withdrawal, WithdrawalProof, Hash` | Direct withdrawal. Internally resolves `scope` → pool address via `getScopeData()` and calls the **pool** contract's `withdraw()`. |
| `relay(withdrawal, proof, scope)` | `Withdrawal, WithdrawalProof, Hash` | Relayed withdrawal. Calls `relay()` on the **entrypoint** contract (not the pool). **Default path:** use the HTTP relayer flow (`fastrelay.xyz`) in this guide. Can be called by anyone; the contract only checks that `processooor == entrypointAddress`, not who `msg.sender` is. Self-relay (paying gas yourself) is supported but should be treated as an advanced non-private path. |
| `ragequit(commitmentProof, poolAddress)` | `CommitmentProof, Address` | Emergency public exit |

All write methods return `Promise<{ hash: string; wait: () => Promise<void> }>`. The `hash` is a hex tx hash string (e.g. `"0xabc..."`).

## Proof Verification (off-chain)

`PrivacyPoolSDK` provides methods to verify proofs locally before submitting on-chain:

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `sdk.verifyCommitment(proof)` | `CommitmentProof` | `Promise<boolean>` | Verify a commitment proof locally |
| `sdk.verifyWithdrawal(proof)` | `WithdrawalProof` | `Promise<boolean>` | Verify a withdrawal proof locally |

## Supported Networks

| Network | Chain ID | viem import | Entrypoint (Proxy) | `startBlock` |
|---------|----------|-------------|-------------------|-------------|
| Ethereum Mainnet | 1 | `import { mainnet } from "viem/chains"` | `0x6818809eefce719e480a7526d76bd3e561526b46` | `22153709n` |
| Arbitrum | 42161 | `import { arbitrum } from "viem/chains"` | `0x44192215fed782896be2ce24e0bfbf0bf825d15e` | `404391795n` |
| OP Mainnet | 10 | `import { optimism } from "viem/chains"` | `0x44192215fed782896be2ce24e0bfbf0bf825d15e` | `144288139n` |
| Sepolia (testnet) | 11155111 | `import { sepolia } from "viem/chains"` | `0x34a2068192b1297f2a7f85d7d8cde66f8f0921cb` | `8461450n` |
| OP Sepolia (testnet) | 11155420 | `import { optimismSepolia } from "viem/chains"` | `0x54aca0d27500669fa37867233e05423701f11ba1` | `32854673n` |

Privacy Pools is also deployed on Starknet, but Starknet is **not currently supported by this SDK** (`@0xbow/privacy-pools-core-sdk`). Starknet integration requires a separate SDK (not viem-based). Engineering has indicated a public Starknet SDK is planned but not yet released.

> **Testnet deployments:** Sepolia (`11155111`) and OP Sepolia (`11155420`) are for development/testing. Both use `dw.0xbow.io` for ASP API and `testnet-relayer.privacypools.com` for relayer API.  
> Sepolia ETH pool: `0x644d5a2554d36e27509254f32ccfebe8cd58861f`  
> OP Sepolia ETH pool: `0x9fa2c482313b75e5bc2297cc0d666ddec19d641e`  
> OP Sepolia WETH pool: `0x6d79e6062c193f6ac31ca06d98d86dc370eedda6`

Full pool addresses and asset addresses: https://docs.privacypools.com/deployments

## Architecture

- **Entrypoint Contract**: Single entry point per network. Routes deposits and relayed withdrawals to the correct pool. You initialize the SDK with this address.
- **PrivacyPool Contracts**: One per asset (ETH, USDC, etc.). Hold funds, manage state tree, generate labels, enforce nullifier checks. Each pool has a unique `scope` identifier. Use `getAssetConfig(assetAddress)` to find the pool for a given token, or `getScopeData(scope)` to go from scope to pool address.
- **Commitment Circuit**: Computes commitment and nullifier hashes from deposit inputs.
- **Withdrawal Circuit**: Proves commitment ownership and ASP set membership privately.
- **LeanIMT**: Lean Incremental Merkle Tree for efficient on-chain state and membership proofs.
- **ASP (Association Set Provider)**: Operated by 0xbow. Screens deposits for compliance and publishes Merkle roots of approved labels for private withdrawals.

## Key Types

```typescript
type Hash = bigint;    // Branded bigint for commitment/Merkle hashes (TypeScript: `bigint & { __brand }`)
type Secret = bigint;  // Branded bigint for nullifier/secret values (TypeScript: `bigint & { __brand }`)
// Note: Hash and Secret are branded types. SDK functions return properly branded values,
// but if you construct a raw bigint (e.g. from readContract), cast it: `value as unknown as Hash`.

interface MasterKeys { masterNullifier: Secret; masterSecret: Secret }

interface Commitment {
  hash: Hash;
  nullifierHash: Hash;
  preimage: {
    value: bigint;
    label: bigint;
    precommitment: { hash: Hash; nullifier: Secret; secret: Secret };
  };
}

// AccountCommitment is a flat structure used by AccountService for tracking.
// proveWithdrawal() accepts both Commitment and AccountCommitment.
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

// From snarkjs — used in proof objects
type PublicSignals = string[];  // array of decimal bigint strings (exactly 8 elements for withdrawal proofs)
interface Groth16Proof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: string;  // "groth16"
  curve: string;     // "bn128"
}

interface CommitmentProof { proof: Groth16Proof; publicSignals: PublicSignals }
interface WithdrawalProof { proof: Groth16Proof; publicSignals: PublicSignals }
interface Withdrawal { processooor: Address; data: Hex }

interface PoolInfo { chainId: number; address: Hex; scope: Hash; deploymentBlock: bigint }
// vettingFeeBPS: deposit fee in basis points, deducted on deposit (100 = 1%).
//   Committed value = amount - (amount * vettingFeeBPS / 10000).
// maxRelayFeeBPS: maximum relayer fee for relayed withdrawals.
interface AssetConfig { pool: Address; minimumDepositAmount: bigint; vettingFeeBPS: bigint; maxRelayFeeBPS: bigint }

// Event types returned by DataService
interface DepositEvent {
  depositor: string;       // depositor address (lowercase)
  commitment: Hash;        // the on-chain commitment hash
  label: Hash;             // the on-chain generated label
  value: bigint;           // post-fee committed amount (after vettingFeeBPS deduction)
  precommitment: Hash;     // precommitment hash (matches hashPrecommitment output)
  blockNumber: bigint;
  transactionHash: Hex;
}

interface WithdrawalEvent {
  withdrawn: bigint;           // amount withdrawn
  spentNullifier: Hash;        // nullifier of the spent commitment
  newCommitment: Hash;         // change commitment hash (remaining balance)
  blockNumber: bigint;
  transactionHash: Hex;
}

interface RagequitEvent {
  ragequitter: string;         // ragequitter address (lowercase)
  commitment: Hash;            // the commitment being exited
  label: Hash;                 // the commitment's label
  value: bigint;               // amount recovered
  blockNumber: bigint;
  transactionHash: Hex;
}
```

**Linking deposits to withdrawals:** These three values are related but **not identical**:
- `DepositEvent.precommitment` = `Commitment.nullifierHash` = `Poseidon(nullifier, secret)`: the precommitment hash submitted on-chain during deposit.
- `WithdrawalEvent.spentNullifier` = `Poseidon(nullifier)`: the circuit's nullifier hash (single input, not the precommitment).

To match a withdrawal to its source deposit, compute `Poseidon(nullifier)` from the deposit's nullifier and compare against `withdrawalEvent.spentNullifier`. You cannot match directly against `depositEvent.precommitment` because they are different hashes. **Note:** The SDK does not export Poseidon. To compute this hash, install `circomlibjs` (or `maci-crypto`, which the SDK uses internally) and call `poseidon([nullifier])`:

```typescript
// npm install circomlibjs
import { buildPoseidon } from "circomlibjs";
const poseidon = await buildPoseidon();
const nullifier = "preimage" in commitment
  ? commitment.preimage.precommitment.nullifier
  : commitment.nullifier;
const nullifierHash = BigInt(
  poseidon.F.toString(poseidon([nullifier]))
);
const isMatch = nullifierHash === withdrawalEvent.spentNullifier;
```

## Error Handling

The SDK uses typed errors for proof and data operations, but contract write methods throw generic `Error`:

| Error Class | When | Common Codes |
|-------------|------|-------------|
| `ProofError` | Proof generation or verification fails | `PROOF_GENERATION_FAILED`, `PROOF_VERIFICATION_FAILED`, `INVALID_PROOF` |
| `SDKError` | Base class; DataService failures | `NETWORK_ERROR`, `INVALID_INPUT` |
| `PrivacyPoolError` | Merkle proof and crypto operations | `MERKLE_ERROR` |
| `ContractError` | Contract read methods when data is invalid | `CONTRACT_ERROR` (helper constructors include `assetNotFound`, `scopeNotFound`) |
| `Error` (generic) | Contract write methods (`deposit`, `withdraw`, `ragequit`, etc.) | Wraps the underlying viem/RPC error message |

**Important:** `PrivacyPoolError` extends `Error` directly (NOT `SDKError`). It is thrown by `generateMerkleProof` and other crypto functions, but it is **not exported** from the SDK's public API. You cannot use `instanceof PrivacyPoolError`. Instead, check for the `code` property:

Common failure modes:
- **`MERKLE_ERROR`**: Leaf not found in tree. The commitment is not in the provided leaf set (wrong pool, stale data, or commitment not yet indexed). Thrown as `PrivacyPoolError` (has `.code === "MERKLE_ERROR"`).
- **`PROOF_GENERATION_FAILED`**: Circuit inputs are invalid. Check that value, label, nullifier, and secret match the original deposit.
- **Contract reverts**: On-chain tx revert, typically a spent nullifier (double-withdraw attempt) or invalid proof. Contract write methods throw generic `Error` with a message like `"Failed to Withdraw: ..."`.
- **`PrecommitmentAlreadyUsed`**: On-chain revert when attempting to deposit with a precommitment hash that was already used by a previous deposit. Generate a fresh precommitment (new `depositIndex`) before retrying.

**Common contract revert reasons** (appear inside the generic `Error` message from contract write methods):
- `NullifierAlreadySpent`: Double-withdraw attempt. The commitment was already spent.
- `IncorrectASPRoot`: The proof's ASP root does not match `Entrypoint.latestRoot()`. Re-fetch leaves and root from the ASP API, rebuild Merkle proofs, and **re-generate the ZK proof**. The ASP root is baked into the proof, so you cannot re-submit the old proof with a new root.
- `InvalidProcessooor`: For direct withdrawal, `processooor` does not match `msg.sender`. For relay, `processooor` does not match the entrypoint address.
- `InvalidProof`: The ZK proof failed on-chain verification. Check circuit inputs.
- `PrecommitmentAlreadyUsed`: Duplicate precommitment hash on deposit.
- `OnlyOriginalDepositor`: Ragequit called from a different address than the original depositor.
- `NoRootsAvailable`: `Entrypoint.latestRoot()` called before any ASP root has been pushed on-chain.

```typescript
try {
  const proof = await sdk.proveWithdrawal(commitment, input);
  const tx = await contracts.withdraw(withdrawal, proof, scope);
  await tx.wait();
} catch (error) {
  if (error instanceof ProofError) {
    // Bad circuit inputs — check commitment secrets match deposit
  } else if (error instanceof SDKError) {
    // DataService failures (network, invalid input, etc.)
  } else if (error instanceof Error && "code" in error) {
    // PrivacyPoolError (not exported — check by duck-typing the `code` property)
    const code = (error as any).code;
    if (code === "MERKLE_ERROR") {
      // Leaf not found in tree — wrong pool, stale data, or commitment not indexed
    }
  } else {
    // On-chain revert or unknown error
  }
}
```

## Key Constraints

- Withdrawals require inclusion in the ASP-approved set. Most deposits are approved within 1 hour; some may take up to 7 days. Until approved, the only exit path is ragequit.
- **Root freshness**: The contract accepts any of the last 64 state roots (historical buffer), so a slight delay between building your state tree and submitting is fine. For deterministic agent execution, prefer targeting the latest pool root (`stateMerkleProof.root === contracts.getStateRoot(poolAddress)` -> `privacyPool.currentRoot()`) before submit. However, the ASP root **must exactly match** the on-chain `Entrypoint.latestRoot()`. Any difference will cause the withdrawal to revert with `IncorrectASPRoot`. There is no tolerance window for ASP root mismatch. Use `onchainMtRoot` (not `mtRoot`) from the `mt-roots` response as your proof's `aspRoot`, and always verify `BigInt(onchainMtRoot) === Entrypoint.latestRoot()` before submitting. If `mtRoot !== onchainMtRoot`, wait and re-fetch until they converge.
- Ragequit is always available as a public fallback path. It works on both original deposits and change commitments (from partial withdrawals), but can only be called by the original depositor address (`OnlyOriginalDepositor` revert otherwise). **After ragequit, the commitment's nullifier is spent on-chain.** Attempting a private withdrawal of the same commitment will revert with `NullifierAlreadySpent`. These are mutually exclusive exit paths. Use one or the other, never both.
- Partial withdrawals are supported. `withdrawalAmount` can be less than the committed value. After a partial withdrawal, the old commitment is spent and a new "change commitment" is inserted into the state tree with the remaining balance. To continue withdrawing from the change commitment, reconstruct it: `const changeCommitment = getCommitment(existingValue - withdrawalAmount, label, newNullifier, newSecret)`. The `label` stays the same as the original deposit. **Critically:** `newNullifier` and `newSecret` here are the values generated by the `generateWithdrawalSecrets(masterKeys, label, withdrawalIndex)` call for the withdrawal that **created** this change commitment. If you lose them, re-derive with the same `withdrawalIndex` used in that withdrawal. **Important:** `withdrawalIndex` is a global counter across all withdrawals sharing the same label. It does not reset for each change commitment. If your first withdrawal used index 0n, the next withdrawal (from the resulting change commitment) must use index 1n, then 2n, etc. **Also important:** After each withdrawal, the state tree has a new leaf (the change commitment). You must re-fetch `stateTreeLeaves` from the ASP API (or re-scan events) before building a proof against the change commitment — the old leaf set is stale.
- There is no protocol-enforced limit on the number of partial withdrawals from a single deposit chain, as long as the remaining balance is > 0.
- Batch withdrawals are not supported by the protocol contracts or SDK APIs. Each transaction can process exactly one commitment spend (one `withdraw`/`relay` call with one proof).
- Full withdrawals (entire balance) still create a zero-value change commitment on-chain (it is inserted into the state tree), but it is not spendable. The SDK's account tracking automatically filters out zero-value commitments.
- Both ETH and ERC20 pools are supported (use different deposit methods).
- Protocol is non-custodial: users must store commitment secrets, labels, and master keys safely. Never log `Commitment` objects or `MasterKeys`. They contain nullifier and secret values that control fund access. The same mnemonic can safely be used across different chains/pools because `generateDepositSecrets` incorporates the pool's unique `scope`, producing different secrets per pool.
- The `label` is generated on-chain during deposit. It is not a user-provided input.

## Repository

https://github.com/0xbow-io/privacy-pools-core

Monorepo packages:

- `packages/circuits`: ZK circuits (commitment + withdrawal)
- `packages/contracts`: Solidity smart contracts (Entrypoint, PrivacyPool, State, verifiers)
- `packages/relayer`: Withdrawal relayer service
- `packages/sdk`: TypeScript SDK (`@0xbow/privacy-pools-core-sdk`)
- `docs`: Docusaurus documentation site

## Further Reading

- Full docs: https://docs.privacypools.com
- Agent quickstart: https://docs.privacypools.com/skills-core.md
- LLM full index: https://docs.privacypools.com/llms-full.txt
- Contracts reference: https://docs.privacypools.com/reference/contracts
- Circuits reference: https://docs.privacypools.com/reference/circuits
- SDK reference: https://docs.privacypools.com/reference/sdk
