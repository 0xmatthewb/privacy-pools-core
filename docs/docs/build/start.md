---
sidebar_label: Start Here
sidebar_position: 1
title: Start Here
description: Quickstart and implementation path for a Privacy Pools integration.
keywords: [privacy pools, getting started, integration, frontend, agent]
---

Privacy Pools has three user-facing flows: public deposits, private withdrawals (after ASP approval), and ragequit (a public exit back to the deposit address). Your integration needs to support all three.

## What is public and what is private

| Flow | Public | Private |
|------|--------|---------|
| Deposit | Asset, amount, depositor, on-chain commitment | The secrets that allow a later spend |
| Relayed withdrawal | Relayer transaction and recipient payout | Which deposit funded the withdrawal |
| Ragequit | Depositor and exit are linked on-chain | Nothing (ragequit is fully public) |

## Before you start

1. Pick your target chain and asset. Get the `Entrypoint`, `PrivacyPool`, and `startBlock` from [Deployments](/deployments).
2. Host the six circuit artifacts (`commitment.wasm/zkey/vkey`, `withdraw.wasm/zkey/vkey`) so the SDK can load them at runtime.
3. The default onboarding path derives a recovery phrase from a wallet signature (EIP-712). Fall back to manual mnemonic entry if the wallet cannot produce a deterministic signature. Either way, users must save their recovery phrase before the first deposit.
4. Read [Using Privacy Pools](/protocol) so the product lifecycle is clear before you write code.

## Build path

1. Follow [Frontend Integration](/build/integration) for the complete deposit, withdrawal, and ragequit recipe.
2. Layer in approval states, quote refresh, and recovery handling from [UX Patterns](/build/ux-patterns).
3. Use [Technical Reference](/reference) when you need exact types, schemas, or contract details.

## Key terms

| Term | Meaning |
|------|---------|
| **Scope** | `uint256` that identifies a pool. Derived from pool address, chain ID, and asset. Passed in API headers and proof inputs. |
| **Label** | Per-deposit identifier assigned on-chain. The ASP approves deposits by including labels in its Merkle tree. |
| **Recovery phrase** | BIP-39 mnemonic that derives all deposit secrets. Loss means no private withdrawal. |
| **Deposit wallet** | The address that made the original deposit. Required for ragequit even if the recovery phrase is available. |

## Other paths

- Using an AI coding agent? See [Agent Setup](/build/agents) and [Skill Library](/build/skills).
- Contributing to the codebase? See [Contributing](/build/contributing).
