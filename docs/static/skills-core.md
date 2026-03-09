# Privacy Pools Agent Quickstart (skills-core)

> Concise operational guide for autonomous agents and human+agent workflows.
> Canonical deep reference: https://docs.privacypools.com/skills.md
> SDK: `@0xbow/privacy-pools-core-sdk`

## Read Order

1. Read this file first for flow and safety-critical rules.
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

- Frontends should use mnemonic-backed pool-account state. It gives users a better UX without pushing secret-bearing notes through copy/paste flows.
- Production frontend default is relayed withdrawal because it is the privacy-preserving path. Self-relay and direct withdrawal are advanced non-private options.
- Wallet-signature onboarding is only safe when the wallet produces deterministic EIP-712 signatures. Smart/contract wallets, Coinbase Wallet, and unsupported WalletConnect sessions should fall back to manual 12- or 24-word mnemonic setup/load. Sign the same payload twice, version the derivation, and require a backup/download step before proceeding.
- Manual recovery phrase entry must be sanitized before use, and clipboard-first UX should be avoided.
- Only offer private withdrawal from pool accounts with `balance > 0` and `reviewStatus === APPROVED`.
- Resolve and validate the final recipient before requesting a quote or generating a proof. Unresolved ENS or invalid address input must block the withdrawal flow.
- Request relayer quotes only when the user enters the review step. If amount, recipient, relayer, or `extraGas` changes, or if the quote expires, discard it, re-quote, and require the user to confirm again.
- Fetch `minWithdrawAmount` from `GET /relayer/details` and warn if a partial withdrawal would leave a non-zero remainder below that minimum.
- If you expose `extraGas`, treat it as an optional gas-token drop for supported non-native assets and include it in quote invalidation plus review-step fee display.
- `X-Pool-Scope` header must be a decimal bigint string (`scope.toString()`), not hex.
- Use `onchainMtRoot` from ASP `mt-roots` as proof `aspRoot`.
- Require exact equality: `BigInt(onchainMtRoot) === Entrypoint.latestRoot()`.
- Use `contracts.getStateRoot(poolAddress)` for `stateRoot`; it reads the pool's `currentRoot()`, not `Entrypoint.latestRoot()`.
- If you need an explicit RPC fallback for state reconstruction, use `DataService` with the deployment `startBlock`; never scan from `0n`.
- Validate `withdrawalAmount > 0n && withdrawalAmount <= committedValue` before proof generation.
- Validate `amount >= minimumDepositAmount` before any deposit.
- `feeCommitment` from relayer quote expires in ~60 seconds; request quotes as late as possible and ensure quote -> proof -> request fits inside this window.
- Ragequit and private withdrawal are mutually exclusive on the same commitment (`NullifierAlreadySpent`).
- After partial withdrawal, refresh tree data before next proof (new change commitment leaf is inserted).

## Network and Host Selection

Use deployment addresses from:

- https://docs.privacypools.com/deployments

ASP host helper:

```typescript
function getAspApiHost(chainId: number): string {
  const hosts: Record<number, string> = {
    1: "https://api.0xbow.io",        // Ethereum mainnet
    42161: "https://api.0xbow.io",    // Arbitrum
    10: "https://api.0xbow.io",       // OP mainnet
    11155111: "https://dw.0xbow.io",  // Sepolia
    11155420: "https://dw.0xbow.io",  // OP Sepolia
  };
  const host = hosts[chainId];
  if (!host) throw new Error(`No ASP API host configured for chainId ${chainId}`);
  return host;
}
```

Relayer host helper:

```typescript
function getRelayerHost(chainId: number): string {
  const hosts: Record<number, string> = {
    1: "https://fastrelay.xyz",
    42161: "https://fastrelay.xyz",
    10: "https://fastrelay.xyz",
    11155111: "https://testnet-relayer.privacypools.com",
    11155420: "https://testnet-relayer.privacypools.com",
  };
  const host = hosts[chainId];
  if (!host) throw new Error(`No relayer host configured for chainId ${chainId}`);
  return host;
}
```

Production default: use `fastrelay.xyz` for relayed withdrawals. Self-relay and direct withdrawal are supported for deliberate cases, but they are not the privacy-preserving frontend path.

## Happy Path Flows

### Account Bootstrap (Frontend Default)

1. Create or load a mnemonic-backed account before the user can deposit or withdraw.
2. If you offer wallet-based onboarding, gate it by wallet capability, derive a versioned recovery seed from deterministic EIP-712 signatures, and require a backup step before proceeding.
3. If the wallet cannot produce deterministic signatures, fall back to manual mnemonic creation/load.
4. Use the mnemonic/account state to reconstruct pool accounts across sessions; do not ask users to manually carry notes.

For copy-paste SDK setup and relay payload construction, use `SDK Quick Start` and `Constructing the Withdrawal object` in `https://docs.privacypools.com/skills.md`.

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

Advanced self-relay and direct-withdrawal flows are documented in `https://docs.privacypools.com/skills.md`. Treat them as non-private options rather than the default frontend path.

### Direct Withdrawal (Rare / Advanced)

Use direct withdrawal only when recipient should be the tx signer and the loss of privacy is explicitly accepted:

- set `withdrawal.processooor` to signer address (`msg.sender`)
- call `contracts.withdraw(withdrawal, proof, scope)`
- do not expose this as the default frontend action

### Ragequit (Public Fallback)

Use when private withdrawal is unavailable (e.g., ASP not approved or label removed):

1. Generate commitment proof.
2. Call `contracts.ragequit(commitmentProof, privacyPoolAddress)`.
3. Clearly warn the user that ragequit is public and returns funds to the original depositor path.

Ragequit is public and irreversible for that commitment (nullifier is spent).

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
