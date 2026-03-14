# Privacy Pools Agent Quickstart (skills-core)

> Concise operational guide for autonomous agents and human+agent workflows.
> Canonical deep reference: https://docs.privacypools.com/skills.md
> SDK: `@0xbow/privacy-pools-core-sdk`

## Read Order

1. Use this file for the operational flow and safety-critical rules.
2. Read `https://docs.privacypools.com/deployments` for chain addresses and start blocks.
3. Read `https://docs.privacypools.com/skills.md` only for advanced implementation details and edge cases.

## Scope

This guide keeps the production integration path small:

- account bootstrap and recovery
- deposit (ETH/ERC20) and pool-account tracking
- private withdrawal (relayed frontend default)
- ragequit fallback
- ASP and relayer integration rules

## Non-Negotiable Rules

### Account and Recovery

- Frontends should use mnemonic-backed pool-account state. This keeps secret-bearing notes out of copy/paste flows, clipboard surfaces, and other XSS-prone UI where raw secrets can be exposed.
- Wallet-signature onboarding is only safe when the wallet can reproduce the same EIP-712 signature for the same payload twice. Require a backup/download step, use the current derivation flow for new accounts, only expose any older restore path for existing legacy accounts, and fall back to manual 12- or 24-word mnemonic setup/load when that deterministic signer path is unavailable.
- Manual recovery phrase entry must be sanitized before use, and clipboard-first UX should be avoided.

### Private Withdrawal

- Production frontend default is relayed withdrawal because it is the privacy-preserving path. Direct withdrawal is an advanced non-private option.
- Direct `PrivacyPool.withdraw()` requires `processooor == msg.sender`, so funds go to the signer. The relay path instead uses `Entrypoint.relay()` with `processooor = entrypointAddress` and recipient routing encoded in `withdrawal.data`.
- Only offer private withdrawal from pool accounts with `balance > 0` and `reviewStatus === APPROVED`.
- Resolve and validate the final recipient before requesting a quote or generating a proof. Unresolved ENS or invalid address input must block the withdrawal flow.
- Request relayer quotes only when the user enters the review step. If amount, recipient, relayer, or `extraGas` changes, or if the quote expires, discard it, re-quote, and require the user to confirm again.
- Fetch `minWithdrawAmount` from `GET /relayer/details` and warn if a partial withdrawal would leave a non-zero remainder below that minimum.
- If you expose `extraGas`, treat it as an optional gas-token drop for supported non-native assets and include it in quote invalidation plus review-step fee display.
- `feeCommitment` from relayer quote expires in ~60 seconds; request quotes as late as possible and ensure quote -> proof -> request fits inside this window.

### Roots and State

- `X-Pool-Scope` header must be a decimal bigint string (`scope.toString()`), not hex.
- Use `onchainMtRoot` from ASP `mt-roots` as proof `aspRoot`.
- Require exact equality: `BigInt(onchainMtRoot) === Entrypoint.latestRoot()`.
- Use `contracts.getStateRoot(poolAddress)` for `stateRoot`; it reads the pool's `currentRoot()`, not `Entrypoint.latestRoot()`.
- If you need an explicit RPC fallback for state reconstruction, use `DataService` with the deployment `startBlock`; never scan from `0n`.

### Transaction Validation

- Validate `withdrawalAmount > 0n && withdrawalAmount <= committedValue` before proof generation.
- Validate `amount >= minimumDepositAmount` before any deposit.
- Ragequit and private withdrawal are mutually exclusive on the same commitment (`NullifierAlreadySpent`).
- After partial withdrawal, refresh tree data before next proof (new change commitment leaf is inserted).

## Network and Host Selection

Use deployment addresses from:

- https://docs.privacypools.com/deployments

ASP host helper:

```typescript
function getAspApiHost(chainId: number): string {
  const productionChainIds = new Set([1, 10, 42161]);
  const testnetChainIds = new Set([11155111, 11155420]);
  if (productionChainIds.has(chainId)) return "https://api.0xbow.io";
  if (testnetChainIds.has(chainId)) return "https://dw.0xbow.io";
  throw new Error(`No ASP API host configured for chainId ${chainId}`);
}
```

Relayer host helper:

```typescript
function getRelayerHost(chainId: number): string {
  const productionChainIds = new Set([1, 10, 42161]);
  const testnetChainIds = new Set([11155111, 11155420]);
  if (productionChainIds.has(chainId)) return "https://fastrelay.xyz";
  if (testnetChainIds.has(chainId)) return "https://testnet-relayer.privacypools.com";
  throw new Error(`No relayer host configured for chainId ${chainId}`);
}
```

Production default: use `fastrelay.xyz` for relayed withdrawals. Direct withdrawal is supported but is an advanced non-private option.

## Happy Path Flows

### Account Bootstrap (Frontend Default)

1. Create or load a mnemonic-backed account before the user can deposit or withdraw.
2. If you offer wallet-based onboarding, gate it by wallet capability, derive the recovery seed from deterministic EIP-712 signatures, use the current derivation flow for new accounts, and require a backup step before proceeding. Only expose any older restore path when restoring an existing legacy account.
3. If the wallet cannot produce deterministic signatures, fall back to manual mnemonic creation/load.
4. Use the mnemonic/account state to reconstruct pool accounts across sessions; do not ask users to manually carry notes.

For ready-to-use SDK setup and relay payload construction, see `SDK Quick Start` and `Constructing the Withdrawal object` in `https://docs.privacypools.com/skills.md`.

### Deposit (ETH)

1. Derive deposit secrets from mnemonic + scope + depositIndex.
2. Compute precommitment.
3. Validate minimum deposit via `getAssetConfig`.
4. If you expose `Use max`, reserve gas for native-asset deposits and account for vetting-fee math before computing the submitted amount.
5. Call `depositETH`.
6. Parse `Deposited` event and capture:
   - `label`
   - committed `value` (post-fee value)
7. Reconstruct commitment locally from `value`, `label`, `nullifier`, `secret`.
8. Persist the resulting pool account in local account state and communicate that indexing plus ASP review may lag briefly after confirmation.
9. Private withdrawal should only be offered once ASP approval exists.

### Relayed Withdrawal (Default)

1. Select a spendable pool account with `balance > 0` and `reviewStatus === APPROVED`.
2. Resolve the recipient to a final address before the review step. Reverse ENS display and anonymity-set hints are optional but helpful.
3. Load `scope` and the current pool state root (`contracts.getStateRoot(poolAddress)` -> `currentRoot()`).
4. Fetch ASP roots and leaves:
   - `GET /{chainId}/public/mt-roots`
   - `GET /{chainId}/public/mt-leaves`
5. Verify root contract parity:
   - `BigInt(onchainMtRoot) === Entrypoint.latestRoot()`
6. Build state and ASP Merkle proofs from returned leaves.
7. Fetch relayer details and request a quote only on the review step:
   - `GET /relayer/details` (returns `feeReceiverAddress` and `minWithdrawAmount`)
   - `POST /relayer/quote` (returns signed `feeCommitment`)
8. Validate relayer minimums, remainder warnings, optional `extraGas`, and on-chain max relay fee bounds.
9. Build withdrawal object for relay using fee data from step 7 (`processooor = entrypointAddress` and encoded relay data).
10. Generate ZK proof (context is derived from the withdrawal object).
11. Submit request before expiry (~60s). If the quote refreshes because inputs changed or time elapsed, require the user to review and confirm again:
   - `POST /relayer/request`
12. Wait for receipt, verify success, then insert the change commitment back into the same pool-account tree.

Advanced direct-withdrawal details are documented in `https://docs.privacypools.com/skills.md`. Direct withdrawal is non-private and should not be the default frontend path.

### Direct Withdrawal (Rare / Advanced)

Use direct withdrawal only when the recipient is the tx signer and the loss of privacy is explicitly accepted:

- set `withdrawal.processooor` to signer address (`msg.sender`)
- call `contracts.withdraw(withdrawal, proof, scope)`
- do not expose this as the default frontend action

### Ragequit (Public Fallback)

Use when private withdrawal is unavailable (e.g., ASP not approved or label removed):

1. Generate commitment proof.
2. Call `contracts.ragequit(commitmentProof, privacyPoolAddress)`.
3. Clearly warn the user that ragequit is public and returns funds to the original depositor path.

Ragequit is public and irreversible for that commitment (nullifier is spent).

## UX Patterns

- `GET /{chainId}/public/deposits-larger-than` can show an anonymity-set estimate while the user edits the withdrawal amount.
- `POST /relayer/quote` without `recipient` can be used earlier in the form for a fee estimate. Request the signed `feeCommitment` only after the final recipient is known on review.
- ENS resolution should use mainnet (`chainId = 1`) even when the active pool is on another EVM chain.
- If proof generation can take noticeable time, surface progress phases such as `loading_circuits`, `generating_proof`, and `verifying_proof`.
- If the wallet supports batching, combining approval + deposit into one user action is a good upgrade. The same pattern can extend to stake-then-deposit flows as long as the final deposited asset and expected amount are explicit in review UI.
- Handle wallet rejections and user cancellations gracefully.

## Required Runtime Validations

Before any withdrawal attempt:

- verify selected pool account still has `balance > 0` and `reviewStatus === APPROVED`
- verify target commitment exists in current state leaves
- verify label exists in current ASP leaves
- verify recipient is a final valid address (not unresolved ENS input)
- if using `DataService` fallback, keep scans bounded to the deployment `startBlock`
- keep root domains separate: state-tree parity is against pool `currentRoot()`, ASP parity is against `Entrypoint.latestRoot()`
- prefer `stateMerkleProof.root === privacyPool.currentRoot()` before submit for deterministic execution (the protocol accepts recent historical roots, but current-root parity is the safest default)

Before relayed submit:

- verify quote TTL still valid
- verify quote matches the current amount, recipient, relayer, and extra-gas selection
- verify remaining balance is `0` or `>= minWithdrawAmount`, or the user has explicitly chosen a later public exit for the remainder
- verify relayer fee bounds (`feeBPS <= maxRelayFeeBPS`)
- verify asset + chain support via `GET /relayer/details`

## High-Signal Error Triage

- `MERKLE_ERROR`: leaf not present in provided leaves (wrong pool, stale data, or missing indexing).
- `IncorrectASPRoot`: ASP root mismatch; re-fetch roots/leaves and regenerate proof.
- `InvalidProcessooor`: direct vs relayed `processooor` mismatch.
- `NullifierAlreadySpent`: commitment already exited (withdraw or ragequit already happened).
- `PrecommitmentAlreadyUsed`: duplicate deposit precommitment; increment deposit index and retry.

## Canonical References

- Deep operational reference: https://docs.privacypools.com/skills.md
- Deployments and start blocks: https://docs.privacypools.com/deployments
- SDK reference: https://docs.privacypools.com/reference/sdk
- Contracts reference: https://docs.privacypools.com/reference/contracts
- Full LLM index: https://docs.privacypools.com/llms-full.txt
