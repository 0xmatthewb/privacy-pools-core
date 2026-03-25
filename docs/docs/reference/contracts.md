---
title: Contracts Interfaces
sidebar_position: 6
description: "Contract interface reference for Privacy Pools components, including structs, events, and function signatures."
keywords:
  - privacy pools
  - contract interfaces
  - solidity
  - abi
  - entrypoint
  - privacypool
  - events
---

## IPrivacyPool

Core interface for privacy pools smart contracts that handle deposits and withdrawals.

```solidity
interface IPrivacyPool {
    struct Withdrawal {
        address processooor;    // Allowed address to process withdrawal
        bytes data;             // Encoded arbitrary data for Entrypoint
    }

    // Core Functions
    function deposit(
        address depositor,
        uint256 value,
        uint256 precommitment
    ) external payable returns (uint256 commitment);

    function withdraw(
        Withdrawal memory w,
        ProofLib.WithdrawProof memory p
    ) external;

    function ragequit(ProofLib.RagequitProof memory p) external;

    // View Functions
    function SCOPE() external view returns (uint256);
    function ASSET() external view returns (address);
    function currentRoot() external view returns (uint256);
}
```

### IPrivacyPool Parameters

| Function | Parameter | Description |
|---|---|---|
| `deposit` | `depositor` | Address credited as the original depositor (controls ragequit eligibility) |
| | `value` | Deposit amount before vetting fee deduction |
| | `precommitment` | `Poseidon(nullifier, secret)` — must be unique across all deposits. Reverts with `PrecommitmentAlreadyUsed` if reused. |
| | Returns `commitment` | The label assigned to this deposit: `keccak256(scope, nonce) % SNARK_SCALAR_FIELD` |
| `withdraw` | `w` | `Withdrawal` struct: `processooor` must equal `msg.sender` for direct calls |
| | `p` | ZK proof with 8 public signals (see [ProofLib](#prooflib)) |
| `ragequit` | `p` | Commitment proof with 4 public signals. Only callable by the original depositor of the label. |
| `SCOPE()` | — | Unique pool identifier: `keccak256(poolAddress, chainId, asset) % SNARK_SCALAR_FIELD` |
| `currentRoot()` | — | Current state Merkle tree root (used in withdrawal proofs) |

## IEntrypoint

Central registry and coordinator for privacy pools.

```solidity
interface IEntrypoint {
    struct AssetConfig {
        IPrivacyPool pool;
        uint256 minimumDepositAmount;
        uint256 vettingFeeBPS;
        uint256 maxRelayFeeBPS;
    }

    struct RelayData {
        address recipient;
        address feeRecipient;
        uint256 relayFeeBPS;
    }

    // Registry Functions
    function registerPool(
        IERC20 asset,
        IPrivacyPool pool,
        uint256 minimumDepositAmount,
        uint256 vettingFeeBPS,
        uint256 maxRelayFeeBPS
    ) external;

    function deposit(uint256 precommitment) external payable returns (uint256);

    function deposit(
        IERC20 asset,
        uint256 value,
        uint256 precommitment
    ) external returns (uint256);

    function relay(
        IPrivacyPool.Withdrawal calldata withdrawal,
        ProofLib.WithdrawProof calldata proof,
        uint256 scope
    ) external;

    // ASP Root Management
    function updateRoot(uint256 root, string memory ipfsCID) external returns (uint256 index);

    // View Functions
    function scopeToPool(uint256 scope) external view returns (IPrivacyPool);
    function assetConfig(IERC20 asset) external view returns (
        IPrivacyPool pool,
        uint256 minimumDepositAmount,
        uint256 vettingFeeBPS,
        uint256 maxRelayFeeBPS
    );
    function latestRoot() external view returns (uint256);

    // Historical root access
    function rootByIndex(uint256 index) external view returns (uint256 root);
    function associationSets(uint256 index) external view returns (
        uint256 root, string memory ipfsCID, uint256 timestamp
    );

    // Precommitment tracking
    function usedPrecommitments(uint256 precommitment) external view returns (bool);
}
```

### IEntrypoint Parameters

| Function | Parameter | Description |
|---|---|---|
| `deposit` (ETH) | `precommitment` | `Poseidon(nullifier, secret)`. Send ETH as `msg.value`. |
| `deposit` (ERC20) | `asset` | ERC20 token address. Requires prior approval. |
| | `value` | Amount to deposit (before fee). |
| | `precommitment` | `Poseidon(nullifier, secret)`. |
| `relay` | `withdrawal` | `Withdrawal` struct with `processooor` set to the Entrypoint address and `data` set to ABI-encoded `RelayData`. |
| | `proof` | ZK proof from `proveWithdrawal()`. |
| | `scope` | Pool scope (identifies which pool to withdraw from). |
| `latestRoot()` | — | Latest ASP-approved root. Withdrawal proofs must use this exact value. |
| `usedPrecommitments()` | `precommitment` | Returns `true` if the precommitment has been used in a prior deposit. |

`IPrivacyPool.currentRoot()` is the state-tree root used in withdrawal proofs. `IEntrypoint.latestRoot()` is separate: the latest ASP-approved root that must match ASP `onchainMtRoot`.

`IPrivacyPool.withdraw()` is the direct pool path: caller must equal `Withdrawal.processooor`, so funds go to that signer. `IEntrypoint.relay()` is the relayed path: `Withdrawal.processooor` must be the Entrypoint, and recipient plus fee routing comes from `RelayData`.

Deposits and relayed withdrawals go through the Entrypoint proxy. Use the **Entrypoint (Proxy)** address from [Deployments](/deployments) for these operations. Ragequit calls go directly to the pool contract address.

## Events

Integrator-relevant events emitted during deposits, withdrawals, and ragequit operations.

```solidity
// IPrivacyPool
event Deposited(address indexed _depositor, uint256 _commitment, uint256 _label, uint256 _value, uint256 _precommitmentHash);
event Withdrawn(address indexed _processooor, uint256 _value, uint256 _spentNullifier, uint256 _newCommitment);
event Ragequit(address indexed _ragequitter, uint256 _commitment, uint256 _label, uint256 _value);

// IState
event LeafInserted(uint256 _index, uint256 _leaf, uint256 _root);

// IEntrypoint
event WithdrawalRelayed(address indexed _relayer, address indexed _recipient, IERC20 indexed _asset, uint256 _amount, uint256 _feeAmount);
```

## ProofLib

`ProofLib` defines the Groth16 proof structs used by `withdraw()`, `relay()`, and `ragequit()`. These structs carry the proof components and the public signals that the on-chain verifier checks.

### WithdrawProof

```solidity
struct WithdrawProof {
    uint256[2] pA;
    uint256[2][2] pB;
    uint256[2] pC;
    uint256[8] pubSignals;
}
```

| Index | Signal | Description |
|---|---|---|
| 0 | `newCommitmentHash` | Hash of the change commitment created for remaining funds |
| 1 | `existingNullifierHash` | Nullifier hash of the commitment being spent |
| 2 | `withdrawnValue` | Amount being withdrawn |
| 3 | `stateRoot` | Pool state Merkle root at proof generation time |
| 4 | `stateTreeDepth` | Depth of the state tree (typically `32`) |
| 5 | `ASPRoot` | ASP-approved Merkle root — must equal `Entrypoint.latestRoot()` |
| 6 | `ASPTreeDepth` | Depth of the ASP tree (typically `32`) |
| 7 | `context` | Binds the proof to specific withdrawal parameters: `keccak256(withdrawal, scope) % SNARK_SCALAR_FIELD` |

### RagequitProof

```solidity
struct RagequitProof {
    uint256[2] pA;
    uint256[2][2] pB;
    uint256[2] pC;
    uint256[4] pubSignals;
}
```

| Index | Signal | Description |
|---|---|---|
| 0 | `commitmentHash` | Hash of the commitment being ragequit |
| 1 | `nullifierHash` | `Poseidon(nullifier)` of the commitment |
| 2 | `value` | Full remaining value of the commitment |
| 3 | `label` | Deposit label — contract checks `depositors[label] == msg.sender` |

:::warning B-coordinate swapping
When converting a snarkjs Groth16 proof to the Solidity struct format, the inner arrays of `pB` must have their elements reversed: `pB[i] = [proof.pi_b[i][1], proof.pi_b[i][0]]`. This is required because snarkjs and the Solidity verifier use different coordinate orderings.
:::

### Accessor Functions

ProofLib provides typed accessors for each public signal. These are `internal pure` library functions used by the pool contract, not directly callable by external integrators. They are listed here for reference when reading the contract source:

**WithdrawProof:** `newCommitmentHash()`, `existingNullifierHash()`, `withdrawnValue()`, `stateRoot()`, `stateTreeDepth()`, `ASPRoot()`, `ASPTreeDepth()`, `context()`

**RagequitProof:** `commitmentHash()`, `nullifierHash()`, `value()`, `label()`

For the full integration recipe, see [Frontend Integration](/build/integration). For contract errors, see [Errors and Constraints](/reference/errors).
