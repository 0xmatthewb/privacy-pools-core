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

New to Privacy Pools? Start here for the product-level picture, then follow the lifecycle and core concepts pages. If you are integrating the protocol into an app, move from here into [Build](/build).

Privacy Pools lets users deposit into shared pools, wait for ASP review, then withdraw privately through a relayer. That is the intended path for most users. If private withdrawal is unavailable, the original depositor can still [ragequit](/protocol/ragequit) publicly back to the deposit address.

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

## Four ideas worth keeping in mind

- Deposits are public. Privacy starts at withdrawal time, not deposit time.
- ASP approval unlocks the private withdrawal path, but it does not block deposits.
- Ragequit preserves self-custody with a public exit back to the deposit address.
- The recovery phrase and the deposit wallet control different exit paths, and both matter.
