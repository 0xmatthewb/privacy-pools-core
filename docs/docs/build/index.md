---
title: Build with Privacy Pools
slug: /build
description: Recommended onboarding and implementation path for integrators, including guidance for developers using AI coding agents.
keywords:
  - privacy pools
  - build
  - integration
  - onboarding
  - frontend
  - agents
---

Everything you need to add Privacy Pools to a wallet, dapp, or other product. Start with the read order below and open reference pages when you need exact details.

## Read in this order

1. [Start Here](/build/start) for prerequisites, shared terminology, and the build sequence.
2. [Using Privacy Pools](/protocol) for the product lifecycle your UI should reflect.
3. [Frontend Integration](/build/integration) for the implementation recipe.
4. [UX Patterns](/build/ux-patterns) for approval states, recovery, quotes, and withdrawal edge cases.
5. [Technical Reference](/reference) when you need exact SDK, API, contract, or deployment details.

[Deployments](/deployments) is the lookup page for chain addresses, chain metadata, and `startBlock`. Use it when you are wiring a specific target chain, not as an onboarding step by itself.

## If you are using agents

1. [Agent Setup](/build/agents) for Claude, Codex, and repo-entry guidance.
2. [Skill Library](/build/skills) for task-specific instructions.
3. [Frontend Integration](/build/integration) for the canonical implementation path.
4. [Technical Reference](/reference) and [Deployments](/deployments) when the task needs exact values.

## Production checklist

- Serve the circuit artifacts before attempting proof generation.
- Require the recovery phrase to be saved before the first deposit.
- Pull the target chain's `Entrypoint`, `PrivacyPool`, and `startBlock` from [Deployments](/deployments) when wiring the integration.
- Quote late in the withdrawal flow and discard quotes when inputs change or expire.
- Verify ASP root parity before generating a withdrawal proof.
- Keep ragequit available as the public exit path for the original depositor.
