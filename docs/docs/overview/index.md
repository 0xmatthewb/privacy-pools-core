---
title: Overview
slug: /overview
description: Start here if you are new to Privacy Pools and want the shortest path to understanding the product and protocol.
keywords:
  - privacy pools
  - overview
  - start here
  - onboarding
  - private withdrawals
  - public deposits
---

Privacy Pools lets users deposit into shared pools, wait for ASP approval, then withdraw privately through a relayer. If a deposit isn't approved, the original depositor can always [ragequit](/protocol/ragequit) back to the deposit address.

## Read in this order

1. [What is Privacy Pools?](/overview/what-is-privacy-pools) for the product-level picture.
2. [Using Privacy Pools](/protocol) for the deposit -> approval -> withdrawal / ragequit lifecycle.
3. [Core Concepts](/overview/core-concepts) for commitments, labels, nullifiers, trees, and relayers.
4. [Build](/build) if you are integrating the protocol into an app or workflow.

## Choose your path

| Goal | Best page |
|---|---|
| Understand what the user experience is supposed to be | [Using Privacy Pools](/protocol) |
| Integrate deposits and withdrawals into an app | [Build](/build) |
| Set up Claude, Codex, or other coding agents | [Agent Setup](/build/agents) |
| Look up addresses, APIs, SDK behavior, or schemas | [Technical Reference](/reference/sdk) and [Deployments](/deployments) |

## Keep in mind

- Deposits are public. Privacy starts at withdrawal time, not deposit time.
- ASP approval is required for private withdrawal. Deposits that are not approved can only be reclaimed publicly via ragequit.
- Ragequit lets the original depositor exit publicly, but it creates an on-chain link to the deposit.
- The recovery phrase and the deposit wallet control different exit paths, and both matter.
