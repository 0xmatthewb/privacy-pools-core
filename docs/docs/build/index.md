---
title: Build with Privacy Pools
slug: /build
description: Recommended onboarding and implementation path for developers, builders, integrators, and agent-assisted workflows.
keywords:
  - privacy pools
  - build
  - integration
  - onboarding
  - frontend
  - agents
---

This section is for teams integrating Privacy Pools into wallets, dapps, backend services, or agent workflows.

## Recommended read order

1. [Start Here](/build/start) for prerequisites, shared terminology, and the build sequence.
2. [Using Privacy Pools](/protocol) for the product lifecycle your UI should reflect.
3. [Deployments](/deployments) for contract addresses and `startBlock` values.
4. [Frontend Integration](/build/integration) for the implementation recipe.
5. [UX Patterns](/build/ux-patterns) for approval states, recovery, quotes, and withdrawal edge cases.

## If you are using agents

1. [Agent Setup](/build/agents) for Claude, Codex, and repo-entry guidance.
2. [Skill Library](/build/skills) for task-specific instructions.
3. [Frontend Integration](/build/integration) for the canonical implementation path.
4. [Deployments](/deployments) for contract addresses and chain metadata.

## Production checklist

- Initialize `DataService` with the correct chain-specific `startBlock`.
- Serve the circuit artifacts before attempting proof generation.
- Require the recovery phrase to be saved before the first deposit.
- Quote late in the withdrawal flow and discard quotes when inputs change or expire.
- Verify ASP root parity before generating a withdrawal proof.
- Keep ragequit available as the public fallback path.
