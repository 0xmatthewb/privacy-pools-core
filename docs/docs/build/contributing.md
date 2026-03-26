---
sidebar_label: Contributing
sidebar_position: 6
title: Contributing
slug: /build/contributing
description: How to set up the Privacy Pools monorepo, run tests, and contribute to the project.
keywords: [privacy pools, contributing, monorepo, testing, development]
---

## Prerequisites

- Node.js (v20 or later)
- Yarn (v1.22 or later)
- Foundry (for smart contracts)
- Docker (for running the relayer)
- Circom (for zero-knowledge circuits)

## Project Structure

All packages live under `packages/` in the monorepo:

- [`contracts`](/layers/contracts) — Solidity (Entrypoint, pools, verifiers)
- [`circuits`](/layers/zk) — Circom (commitment, withdrawal, Merkle inclusion)
- [`sdk`](/reference/sdk) — TypeScript SDK for integrators
- [`relayer`](/reference/relayer-api) — Relay service for private withdrawals

## Installation

1. Clone the repository:

```bash
git clone https://github.com/0xbow-io/privacy-pools-core.git
cd privacy-pools-core
```

2. Install dependencies:

```bash
yarn install
```

## Building and Testing Packages

### Contracts

```bash
cd packages/contracts

# Build contracts
yarn build

# Run tests
yarn test

# Run unit tests
yarn test:unit

# Run integration tests
yarn test:integration

# Run coverage
yarn coverage

# Lint
yarn lint:check
yarn lint:fix
```

`yarn test` and `yarn test:integration` source `.env` if present and run Forge with `--ffi`, because the contract suite exercises external proof-generator helpers.

### Circuits

```bash
cd packages/circuits

# Compile circuits
yarn compile

# Run tests
yarn test

# Run specific test suites
yarn test:merkle
yarn test:withdraw
yarn test:commitment

# Setup
yarn setup:all  # Sets up all circuits
yarn setup:ptau  # Generate Powers of Tau
yarn setup:withdraw  # Setup withdrawal circuit
yarn setup:commitment  # Setup commitment circuit
yarn setup:merkle  # Setup merkle tree circuit

# Generate groth16 verifier contracts
yarn gencontract:withdraw
yarn gencontract:commitment
```

### SDK

```bash
cd packages/sdk

# Build SDK
yarn build

# Build with circuit artifacts
yarn build:bundle

# Run tests
yarn test

# Run coverage
yarn test:cov

# Type checking
yarn check-types

# Lint and format
yarn lint
yarn format
```

### Relayer

```bash
cd packages/relayer

# Build
yarn build

# Start the relayer
yarn start

# Build and start
yarn build:start

# Run with TypeScript
yarn start:ts

# Docker commands
yarn docker:build
yarn docker:run

# Tests
yarn test
yarn test:cov
```

## Quick Test Commands

Run all tests from the repo root:

```bash
yarn
yarn workspace @0xbow/privacy-pools-core-sdk test
yarn workspace @privacy-pool-core/contracts test
yarn workspace @privacy-pool-core/circuits test
yarn workspace @privacy-pool-core/relayer test
```

Build the docs site:

```bash
cd docs && yarn build
```

## Environment Setup

### Contracts

```bash
# packages/contracts/.env
ETHEREUM_MAINNET_RPC=          # required
ETHEREUM_SEPOLIA_RPC=          # required

GNOSIS_RPC=                    # optional
GNOSIS_CHIADO_RPC=             # optional

ETHERSCAN_API_KEY=             # optional (for contract verification)

DEPLOYER_ADDRESS=              # required
OWNER_ADDRESS=                 # required
POSTMAN_ADDRESS=               # required

ENTRYPOINT_ADDRESS=            # required
WITHDRAWAL_VERIFIER_ADDRESS=   # required
RAGEQUIT_VERIFIER_ADDRESS=     # required
```

### SDK

The SDK ships a `.env.example` with an optional `HYPERSYNC_API_KEY`. No `.env` is required to build or run the test suite.

### Relayer

The example below targets a local Anvil node. For testnet or mainnet, replace `rpc_url`, `signer_private_key`, and the contract addresses with values from [Deployments](/deployments).

```json
{
  "defaults": {
    "fee_receiver_address": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "signer_private_key": "<ANVIL_PRIVATE_KEY>",
    "entrypoint_address": "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853"
  },
  "chains": [
    {
      "chain_id": "31337",
      "chain_name": "localhost",
      "rpc_url": "http://0.0.0.0:8545",
      "max_gas_price": "2392000000",
      "native_currency": { "name": "Ether", "symbol": "ETH", "decimals": 18 },
      "supported_assets": [
        {
          "asset_address": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
          "asset_name": "Test Token",
          "fee_bps": "1000",
          "min_withdraw_amount": "100"
        }
      ]
    }
  ],
  "sqlite_db_path": "/tmp/pp_relayer.sqlite",
  "cors_allow_all": true,
  "allowed_domains": ["http://localhost:3000"]
}
```

## Docs Site

The documentation site uses Docusaurus v3.7.0 with `onBrokenLinks: "throw"`.

```bash
cd docs
yarn build
```

## Next Steps

| Topic | Page |
|---|---|
| Contract and pool architecture deep-dive | [Smart Contracts Layer](/layers/contracts) |
| ZK circuit internals | [Zero Knowledge Layer](/layers/zk) |
| SDK types, methods, and account reconstruction | [SDK Utilities](/reference/sdk) |
