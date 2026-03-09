---
name: privacy-pools
description: Integrate with Privacy Pools for deposits, relayed private withdrawals, and ragequit fallback using @0xbow/privacy-pools-core-sdk plus ASP and relayer APIs. Use when building autonomous agents, backend services, or human+agent workflows that need correct end-to-end execution, proof generation inputs, safe frontend defaults, and on-chain/API safety checks.
---

# Privacy Pools Integration Skill

Use this skill to route Privacy Pools work through the docs below.

## Read Order

If you are running inside the `privacy-pools-core` repository, start with the local docs:

1. Read `docs/docs/protocol/integrations.md` for the integration happy path.
2. Read `docs/static/skills-core.md` for the short operational path.
3. Read relevant sections of `docs/static/skills.md` for implementation depth.
4. Read `docs/docs/deployments.md` for chain-specific contract addresses and `startBlock`.

Outside the repository, use the published docs:

1. Read https://docs.privacypools.com/protocol/integrations for the integration happy path.
2. Read https://docs.privacypools.com/skills-core.md for the short operational path.
3. Read relevant sections of https://docs.privacypools.com/skills.md for implementation depth.
4. Read https://docs.privacypools.com/deployments for chain-specific contract addresses and `startBlock`.

## Happy Path Defaults

- Model user state as a mnemonic-backed account with pool-account tracking; this gives a better UX without pushing secret-bearing notes through copy/paste or other UI surfaces where they can be exposed, including XSS or clipboard risks.
- Production frontend default is relayed withdrawals because that is the privacy-preserving withdrawal path. Self-relay and direct withdrawal are advanced non-private options.
- When onboarding from a wallet, use deterministic EIP-712 signature-based seed derivation with an explicit backup step; otherwise fall back to manual mnemonic setup/load.
- Only offer private withdrawal from pool accounts with positive balance and ASP approval.
- Request relayer quotes on the review step, invalidate them when amount, recipient, relayer, or `extraGas` changes, and warn if a partial withdrawal would leave a remainder below the relayer minimum.

## Standard Workflow

1. Identify chain, asset, pool address, and entrypoint from deployments.
2. Establish the recovery/account model first: wallet-derived seed when deterministic and supported, otherwise manual mnemonic fallback.
3. Derive deposit secrets and submit deposit.
4. Parse `Deposited` event and persist `label` + committed value into pool-account state.
5. Refresh pool-account and review state across chain/scope combinations; deposits that are marked approved but not yet present in current ASP leaves should still be treated as pending.
6. Fetch ASP roots/leaves, verify ASP root parity with on-chain `Entrypoint.latestRoot()`, and read the pool state root separately via `contracts.getStateRoot(poolAddress)` (`currentRoot()`).
7. Resolve and validate the recipient, fetch relayer details plus `minWithdrawAmount`, and build Merkle proofs for a spendable approved pool account.
8. Use the relayer flow by default (`fastrelay.xyz` on production chains), requesting the quote on the review step and persisting the change commitment back into pool-account state after success.
9. Use ragequit as public fallback if private withdrawal cannot proceed.
10. If the task explicitly needs self-relay or direct withdrawal, consult the deep reference rather than turning them into the default UI path.

## Required Guards

- Use mnemonic/account-backed pool-account state plus on-chain events; do not design around secret-bearing note copy/paste workflows.
- Offer relayed withdrawals by default. If self-relay or direct withdrawal is exposed, present it as advanced and non-private.
- Wallet-signature seed derivation requires deterministic EIP-712 signing. Sign the same payload twice, version the derivation, require a backup step, and fall back to manual mnemonic setup/load when unsupported.
- Manual recovery phrase entry must be sanitized before use.
- Only privately withdraw from balances with `balance > 0` and `reviewStatus === APPROVED`.
- Resolve and validate the recipient before requesting a quote or generating a proof.
- Fetch `minWithdrawAmount` and warn if a partial withdrawal would leave a non-zero remainder below it.
- If an explicit state-reconstruction fallback is required, use direct RPC/DataService with deployment `startBlock`.
- `X-Pool-Scope` must be decimal bigint string.
- Do not confuse roots: `stateRoot` comes from `privacyPool.currentRoot()` via `getStateRoot(poolAddress)`, while `aspRoot` comes from ASP `onchainMtRoot` and must match `Entrypoint.latestRoot()`.
- `onchainMtRoot` must equal `Entrypoint.latestRoot()` exactly.
- If you reconstruct from on-chain events, initialize `DataService` with the deployment `startBlock`; do not scan from `0n`.
- `withdrawalAmount` must be `> 0` and `<= commitment value`.
- Minimum deposit must be checked before deposit transaction.
- Relayer quote TTL is short (~60 seconds), so quote and request must be near-contiguous and tied to the current amount, recipient, relayer, and `extraGas` choice.
- After partial withdrawal, refresh leaf data before generating the next proof.

## Output Expectations

When asked to implement or review an integration:

- provide copy-pasteable code and commands
- include exact data sources for every proof input
- recommend the safe default UX path and call out anti-patterns to avoid
- keep fallback behavior minimal and purposeful
- avoid inventing addresses or API fields not in canonical docs
