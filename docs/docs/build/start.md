---
sidebar_label: Start Here
sidebar_position: 1
title: Start Here
description: Choose the right integration path for your Privacy Pools project.
keywords: [privacy pools, getting started, integration, frontend, agent]
---

Privacy Pools is a smart-contract protocol for compliant private transactions on Ethereum. Users deposit into a shared pool and withdraw privately, using zero-knowledge proofs and Association Set Providers (ASPs) to prove their funds are not linked to illicit activity. The SDK is TypeScript-based and uses viem.

Pick the path that matches what you are building.

## Frontend or App Integration

You are building a wallet, dapp, or any user-facing interface that deposits, withdraws, or manages Privacy Pool accounts.

**Read order:**

| # | Page | Covers |
|---|------|--------|
| 1 | [Frontend Integration](/build/integration) | Wallet connection, deposit, relayed withdrawal, ragequit |
| 2 | [UX Patterns](/build/ux-patterns) | Account management, deposit, withdrawal, and ragequit frontend patterns |
| 3 | [Deployments](/deployments) | Chain addresses and `startBlock` values |
| 4 | [SDK Utilities](/reference/sdk) | Types and functions |
| 5 | [Protocol flows](/protocol/deposit) | Deposit, withdrawal, and ragequit mechanics |

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
