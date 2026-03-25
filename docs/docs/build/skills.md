---
sidebar_label: Skill Library
sidebar_position: 5
title: Skill Library
slug: /build/skills
description: Task-specific skill files that agents can load for Privacy Pools integration, deposit, withdrawal, and ragequit workflows.
keywords: [privacy pools, skills, agent, deposit, withdrawal, ragequit, SKILL.md]
---

Skills are focused, task-specific instruction files for Privacy Pools integration work. Each skill contains the context, rules, and references needed for a single workflow. They work for both human developers (paste into context or fetch by URL) and AI coding agents (auto-discovered from the repo's `.agents/skills/` directory).

## How to Use Skills

Load the skill file for the task you are working on: paste it into context, fetch it by URL, or point your IDE agent at `.agents/skills/` in the repo root. See [Agent Setup](/build/agents) for tool-specific setup.

Skills are focused workflow guides. For full API reference and error handling, see the [Reference](/reference/sdk) pages.

## Available Skills

| Skill | Purpose | Slug | Local path | Hosted |
|---|---|---|---|---|
| **Integration** | End-to-end integration planning and architecture | `privacy-pools-integration` | `.agents/skills/privacy-pools-integration/SKILL.md` | [View](https://docs.privacypools.com/agent-skills/privacy-pools-integration/SKILL.md) |
| **Deposit** | Deposit flow implementation | `privacy-pools-deposit` | `.agents/skills/privacy-pools-deposit/SKILL.md` | [View](https://docs.privacypools.com/agent-skills/privacy-pools-deposit/SKILL.md) |
| **Withdrawal** | Relayed withdrawal implementation | `privacy-pools-withdraw` | `.agents/skills/privacy-pools-withdraw/SKILL.md` | [View](https://docs.privacypools.com/agent-skills/privacy-pools-withdraw/SKILL.md) |
| **Ragequit** | Ragequit (public exit) implementation | `privacy-pools-ragequit` | `.agents/skills/privacy-pools-ragequit/SKILL.md` | [View](https://docs.privacypools.com/agent-skills/privacy-pools-ragequit/SKILL.md) |
