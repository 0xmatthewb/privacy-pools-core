---
sidebar_label: Start Here
sidebar_position: 1
title: Start Here
description: Choose the right integration path for your Privacy Pools project.
keywords: [privacy pools, getting started, integration, frontend, agent]
---

Privacy Pools is a smart-contract protocol for compliant private transactions on Ethereum. Users deposit into a shared pool and withdraw privately, using zero-knowledge proofs and Association Set Providers (ASPs) to prove their funds are not linked to illicit activity. The SDK is TypeScript-based and uses viem.

## Key Concepts

| Term | Meaning |
|------|---------|
| **Scope** | Unique identifier for each pool, derived from the asset and contract address. Used in API headers and proof inputs. |
| **Commitment** | Poseidon hash of a deposit's value, label, nullifier, and secret. The on-chain record of a deposit. |
| **Label** | Per-deposit identifier. The ASP approves deposits by adding their label to the approved set. |
| **ASP** | Association Set Provider: off-chain service that evaluates deposits and maintains an approved Merkle tree. |
| **Recovery phrase** | BIP-39 mnemonic that derives all deposit secrets. If lost, funds cannot be withdrawn privately. Must be saved before depositing. |

## Frontend or App Integration

You are building a wallet, dapp, or any user-facing interface that deposits, withdraws, or manages Privacy Pool accounts.

**Read order:**

| # | Page | Covers |
|---|------|--------|
| 1 | [Using Privacy Pools](/protocol) | Lifecycle: deposit, approval, withdrawal, ragequit |
| 2 | [Frontend Integration](/build/integration) | SDK setup, deposit, relayed withdrawal, ragequit |
| 3 | [UX Patterns](/build/ux-patterns) | Account management and frontend patterns |
| 4 | [Deployments](/deployments) | Chain addresses and `startBlock` values |
| 5 | [SDK Utilities](/reference/sdk) | Types and functions |

## Agent Workflows

You are using an AI coding agent or LLM-powered tool to integrate Privacy Pools.

| # | Page | Covers |
|---|------|--------|
| 1 | [Skill Library](/build/skills) | Load the skill file for your task |
| 2 | [Frontend Integration](/build/integration) | SDK patterns, deposit/withdrawal implementation |
| 3 | [Deployments](/deployments) | Chain addresses and `startBlock` values |
| 4 | [Agent Workflows](/build/agents) | Tool-specific setup (Claude Code, Codex, etc.) |

## Contributing

You want to work on the Privacy Pools core codebase: contracts, circuits, SDK, relayer, or documentation.

| # | Page | Covers |
|---|------|--------|
| 1 | [Contributing](/build/contributing) | Repo structure, local setup, build and test commands |
| 2 | [Contracts](/layers/contracts) and [ZK Circuits](/layers/zk) | Layer-specific reference |
| 3 | [SDK Utilities](/reference/sdk) | SDK reference |
