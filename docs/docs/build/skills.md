---
sidebar_label: Skill Library
sidebar_position: 5
title: Skill Library
slug: /build/skills
description: Task-specific skill files that agents can load for Privacy Pools integration, deposit, withdrawal, and ragequit workflows.
keywords: [privacy pools, skills, agent, deposit, withdrawal, ragequit, SKILL.md]
---

Skills are focused, task-specific instruction files that agents can load to complete Privacy Pools integration work. Each skill contains the context, rules, and references an agent needs for a single workflow.

## How to Use Skills

Load the skill file for the task you are working on: paste it into context, fetch it by URL, or point your IDE agent at `.agents/skills/` in the repo root. See [Agent Workflows](/build/agents) for tool-specific setup.

Skills are focused workflow guides. For full API reference and error handling, see the [Reference](/reference/sdk) pages.

## Available Skills

| Skill | When to use | Link |
|---|---|---|
| **Integration** | Starting a new integration, onboarding to the protocol, or planning the full deposit-to-withdrawal flow | [View skill](https://docs.privacypools.com/agent-skills/privacy-pools-integration/SKILL.md) |
| **Deposit** | Implementing the deposit path: secret generation, precommitment, transaction submission, and event tracking | [View skill](https://docs.privacypools.com/agent-skills/privacy-pools-deposit/SKILL.md) |
| **Withdrawal** | Implementing the private withdrawal path: ASP root verification, relayer quoting, proof generation, and relay submission | [View skill](https://docs.privacypools.com/agent-skills/privacy-pools-withdraw/SKILL.md) |
| **Ragequit** | Implementing the ragequit public exit: commitment proof, on-chain exit, and depositor-only access control | [View skill](https://docs.privacypools.com/agent-skills/privacy-pools-ragequit/SKILL.md) |
