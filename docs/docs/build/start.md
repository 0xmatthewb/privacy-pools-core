---
sidebar_label: Start Here
sidebar_position: 1
title: Start Here
description: Quickstart and implementation path for a Privacy Pools integration.
keywords: [privacy pools, getting started, integration, frontend, agent]
---

Privacy Pools lets users deposit assets publicly, wait for ASP approval, then withdraw them privately through a relayer. If approval is delayed or privacy is not needed, the original depositor can ragequit and exit publicly. This page is the fastest path from zero to a first working integration.

:::info
These docs cover SDK v1.2.0 (`@0xbow/privacy-pools-core-sdk`).
:::

## What You Are Building

- A public deposit flow from the user's wallet
- A private relayed withdrawal flow after ASP approval
- A public ragequit fallback for the original depositor

## Public vs Private

| Flow | What is public | What stays private |
|------|----------------|-------------------|
| Deposit | The asset, amount, depositor, and on-chain commitment | The secrets that allow a later spend |
| Relayed withdrawal | The relayer transaction and recipient payout | Which deposit funded the withdrawal |
| Ragequit | The depositor and exit are linked on-chain | No private spend path is preserved |

## Minimum Prerequisites

Make sure you have these five inputs first:

1. The target chain and asset you want to support.
2. The correct `Entrypoint`, `PrivacyPool`, and `startBlock` values once you are ready to wire that chain. Use [Deployments](/deployments) as the lookup page for those values.
3. Hosted circuit artifacts for the SDK's `Circuits` loader.
4. A plan for both private withdrawal and public [ragequit](/protocol/ragequit).
5. A user-facing recovery flow before the first deposit.

## Quickstart Path

1. Read [Using Privacy Pools](/protocol) to understand the lifecycle your product needs to reflect.
2. Follow [Frontend Integration](/build/integration) for the first working deposit, approval, withdrawal, and ragequit pass.
3. Add approval, recovery, quote-refresh, and status handling from [UX Patterns](/build/ux-patterns).
4. Use [Technical Reference](/reference) when you need exact types, schemas, or contract behavior.

Use [Deployments](/deployments) when you need chain addresses, chain metadata, or `startBlock` for the specific network you are wiring.

## First Implementation Pass

1. Serve the circuit artifacts and initialize `PrivacyPoolSDK` plus `DataService`.
2. Create or restore a mnemonic-backed account with `AccountService`.
3. Implement deposit and persist the confirmed `label` plus post-fee `committedValue`.
4. Show the deposit as pending until ASP approval converges on-chain.
5. Implement relayed withdrawal from approved, non-zero pool accounts.
6. Keep ragequit visible as the public fallback path for the original depositor.

## Core Concepts

| Term | Meaning |
|------|---------|
| **Scope** | Unique identifier for each pool, derived from the asset and contract address. Used in API headers and proof inputs. |
| **Label** | Per-deposit identifier. The ASP approves deposits by adding the label to the approved set. |
| **Recovery phrase** | BIP-39 mnemonic that derives all deposit secrets. If lost, funds cannot be withdrawn privately. |
| **Deposit wallet** | The wallet that made the original deposit. It is required for ragequit, even if the recovery phrase is still available. |

## What To Open Next

- [Using Privacy Pools](/protocol) if you are shaping the user journey and need the lifecycle in one place
- [Frontend Integration](/build/integration) if you are ready to wire the real integration
- [Technical Reference](/reference) if you need exact SDK, API, or chain details

## Other Paths

- If you are using an AI coding agent, finish this page once, then open [Agent Setup](/build/agents) and the [Skill Library](/build/skills).
- If you are working on the repo itself, start with [Contributing](/build/contributing), then use [Protocol Components](/layers) and [Technical Reference](/reference) as needed.
