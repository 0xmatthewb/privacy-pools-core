---
sidebar_label: Skill Library
sidebar_position: 4
title: Skill Library
slug: /build/skills
---

# Skill Library

Skills are focused, task-specific instruction files that agents can load to complete Privacy Pools integration work. Each skill contains the context, rules, and references an agent needs for a single workflow.

## How to Use Skills

Load the skill file for the task you are working on. Each skill is a self-contained markdown document hosted at a stable URL. Agents can fetch and read the skill directly, or human developers can point their agent session at the relevant skill.

Skills complement the docs -- they do not replace them. For the full integration guide, see [Frontend Integration](/build/integration). For the deep SDK and API reference, see [skills.md](https://docs.privacypools.com/skills.md).

## Available Skills

### privacy-pools-integration

**Purpose:** End-to-end integration planning for Privacy Pools.

**When to use:** Starting a new integration, onboarding to the protocol, or planning the full deposit-to-withdrawal flow for a frontend or backend.

**Skill file:** [`/agent-skills/privacy-pools-integration/SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-integration/SKILL.md)

---

### privacy-pools-deposit

**Purpose:** Deposit flow implementation.

**When to use:** Implementing the deposit path -- secret generation, precommitment, transaction submission, and event tracking.

**Skill file:** [`/agent-skills/privacy-pools-deposit/SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-deposit/SKILL.md)

---

### privacy-pools-withdraw

**Purpose:** Relayed withdrawal implementation.

**When to use:** Implementing the private withdrawal path -- ASP root verification, relayer quoting, proof generation, and relay submission.

**Skill file:** [`/agent-skills/privacy-pools-withdraw/SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-withdraw/SKILL.md)

---

### privacy-pools-ragequit

**Purpose:** Ragequit (emergency public exit) implementation.

**When to use:** Implementing the ragequit fallback -- commitment proof, on-chain exit, and depositor-only access control.

**Skill file:** [`/agent-skills/privacy-pools-ragequit/SKILL.md`](https://docs.privacypools.com/agent-skills/privacy-pools-ragequit/SKILL.md)
