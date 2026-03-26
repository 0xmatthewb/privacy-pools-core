---
sidebar_label: Start Here
sidebar_position: 1
title: Start Here
description: Onboarding checklist and recommended implementation path for a Privacy Pools integration.
keywords: [privacy pools, getting started, integration, frontend, agent]
---

Privacy Pools lets users deposit assets publicly, then withdraw them privately using zero-knowledge proofs. The TypeScript SDK (`viem`-based) handles deposits, withdrawals, and the public ragequit fallback.

:::info
These docs cover SDK v1.2.0 (`@0xbow/privacy-pools-core-sdk`).
:::

## Before You Write Code

Make sure you have all five of these inputs first:

1. The target chain and asset from [Deployments](/deployments).
2. The correct `Entrypoint`, `PrivacyPool`, and `startBlock` values.
3. Hosted circuit artifacts for the SDK's `Circuits` loader.
4. A plan for both private withdrawal and public [ragequit](/protocol/ragequit).
5. A user-facing recovery flow before the first deposit.

## Recommended Build Path

1. Read [Using Privacy Pools](/protocol) to understand the product behavior before writing code.
2. Copy addresses and `startBlock` values from [Deployments](/deployments).
3. Implement the happy path from [Frontend Integration](/build/integration).
4. Add approval, recovery, quote-refresh, and status handling from [UX Patterns](/build/ux-patterns).
5. Use [Technical Reference](/reference/sdk), [ASP API](/reference/asp-api), and [Relayer API](/reference/relayer-api) when you need exact types and schemas.

## Core Concepts

| Term | Meaning |
|------|---------|
| **Scope** | Unique identifier for each pool, derived from the asset and contract address. Used in API headers and proof inputs. |
| **Commitment** | A hash that records a deposit on-chain. Derived from the deposit's value, label, and secrets. |
| **Label** | Per-deposit identifier. The ASP approves deposits by adding their label to the approved set. |
| **ASP** | Association Set Provider: off-chain service that evaluates deposits and maintains an approved Merkle tree. |
| **Recovery phrase** | BIP-39 mnemonic that derives all deposit secrets. If lost, funds cannot be withdrawn privately. Must be saved before depositing. |

## Frontend or App Integration

For teams building wallets, dapps, or other user-facing interfaces.

**Read order:**

| # | Page | Covers |
|---|------|--------|
| 1 | [Using Privacy Pools](/protocol) | Lifecycle: deposit, approval, withdrawal, ragequit |
| 2 | [Deployments](/deployments) | Chain addresses and `startBlock` values |
| 3 | [Frontend Integration](/build/integration) | SDK setup, deposit, relayed withdrawal, ragequit |
| 4 | [UX Patterns](/build/ux-patterns) | Account management and frontend patterns |
| 5 | [SDK Utilities](/reference/sdk) | Types and functions |

## Agent Workflows

For developers using AI coding agents or LLM-powered tools.

| # | Page | Covers |
|---|------|--------|
| 1 | [Agent Setup](/build/agents) | Runtime setup (Claude Code, Codex, etc.) |
| 2 | [Skill Library](/build/skills) | Load the skill file for your task |
| 3 | [Frontend Integration](/build/integration) | SDK patterns, deposit/withdrawal implementation |
| 4 | [Deployments](/deployments) | Chain addresses and `startBlock` values |

## Contributing

For contributors working on the core codebase.

| # | Page | Covers |
|---|------|--------|
| 1 | [Contributing](/build/contributing) | Repo structure, local setup, build and test commands |
| 2 | [Contracts](/layers/contracts) and [ZK Circuits](/layers/zk) | Layer-specific reference |
| 3 | [SDK Utilities](/reference/sdk) | SDK reference |
