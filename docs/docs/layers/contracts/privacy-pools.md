---
title: Privacy Pools
description: "Technical reference for PrivacyPool contracts handling deposits, withdrawals, commitments, nullifiers, and proof validation for ETH and ERC20 pools."
keywords:
  - privacy pools
  - privacypool
  - commitments
  - nullifiers
  - withdrawal
  - deposit
  - solidity
---


The PrivacyPool contract is an abstract contract that implements core privacy pools functionality for both native ETH and ERC20 tokens. It:

1. Manages commitments and nullifiers
2. Processes deposits and withdrawals
3. Handles merkle tree state
4. Validates zero-knowledge proofs

The contract extends the State base contract which manages the merkle tree and nullifier state.

## Key Components

### State Management

Inherits state variables from the State contract, including pool-specific immutables:

```solidity
uint32 public constant ROOT_HISTORY_SIZE = 64;
IEntrypoint public immutable ENTRYPOINT;
IVerifier public immutable WITHDRAWAL_VERIFIER;
IVerifier public immutable RAGEQUIT_VERIFIER;
uint256 public immutable SCOPE;    // keccak256(address(this), chainId, asset) % SNARK_SCALAR_FIELD
address public immutable ASSET;
uint256 public nonce;
bool public dead;
```

## Core Data Structures

### Withdrawal Struct

```solidity
struct Withdrawal {
    address processooor;  // Allowed address to process withdrawal
    bytes data;           // Direct: empty. Relayed: RelayData consumed by Entrypoint
}
```

## Core Functionality

### 1. Deposit Processing

```solidity
function deposit(
    address _depositor,
    uint256 _value,
    uint256 _precommitmentHash
) external payable onlyEntrypoint returns (uint256 _commitment)
```

The deposit flow:

1. Validates pool is active and deposit value is within bounds
2. Computes unique label from scope and pre-incremented nonce (`uint256(keccak256(abi.encodePacked(SCOPE, ++nonce))) % Constants.SNARK_SCALAR_FIELD`)
3. Records depositor address (for ragequit authorization)
4. Computes commitment hash (`Poseidon(value, label, precommitment)`)
5. Inserts commitment into the Merkle tree
6. Pulls funds from the Entrypoint

### 2. Withdrawal Processing

```solidity
function withdraw(
    Withdrawal memory _withdrawal,
    ProofLib.WithdrawProof memory _proof
) external validWithdrawal(_withdrawal, _proof)
```

Handles withdrawals by:

1. Validating withdrawal proof
2. Verifying state root and ASP root
3. Spending nullifier hash
4. Inserting new commitment
5. Transferring funds to `processooor`

For direct withdrawals, `processooor` must equal `msg.sender`, so the pool pays the signer directly. For relayed withdrawals, `processooor` is the Entrypoint, which receives the pool payout and then routes funds to the final recipient.

### 3. Ragequit Functionality

```solidity
function ragequit(ProofLib.RagequitProof memory _proof) external
```

Allows original depositors to publicly reclaim funds at any time (no ASP check):

1. Verify caller is original depositor (`OnlyOriginalDepositor`)
2. Verify Groth16 proof (`InvalidProof`)
3. Verify commitment exists in state tree (`InvalidCommitment`)
4. Spend nullifier hash (`NullifierAlreadySpent`)
5. Transfer committed value back to depositor

### 4. Wind Down Capability

```solidity
function windDown() external onlyEntrypoint
```

Allows graceful shutdown:

1. Marks pool as dead
2. Prevents new deposits
3. Allows existing withdrawals

### Security Features

1. **Access Control**
   - `onlyEntrypoint` modifier for sensitive operations
   - `validWithdrawal` modifier for proof validation

2. **Withdrawal Validation**

```solidity
modifier validWithdrawal(Withdrawal memory _withdrawal, ProofLib.WithdrawProof memory _proof) {
    // Check caller is the allowed processooor
    if (msg.sender != _withdrawal.processooor) revert InvalidProcessooor();

    // Verify context integrity
    if (_proof.context() != uint256(keccak256(abi.encode(_withdrawal, SCOPE))) % SNARK_SCALAR_FIELD) {
        revert ContextMismatch();
    }

    // Check tree depths are within bounds
    if (_proof.stateTreeDepth() > MAX_TREE_DEPTH || _proof.ASPTreeDepth() > MAX_TREE_DEPTH) revert InvalidTreeDepth();

    // Validate roots
    if (!_isKnownRoot(_proof.stateRoot())) revert UnknownStateRoot();
    if (_proof.ASPRoot() != ENTRYPOINT.latestRoot()) revert IncorrectASPRoot();
    _;
}
```

3. **Proof Verification**
   - Validates zero-knowledge proofs using Groth16 verifiers
   - Verifies nullifier hash uniqueness
   - Checks commitment existence

### Asset Handling

The contract is abstract and requires implementation of two key functions:

```solidity
function _pull(address _sender, uint256 _value) internal virtual;
function _push(address _recipient, uint256 _value) internal virtual;
```

These are implemented differently for:

- Native ETH (PrivacyPoolSimple)
- ERC20 tokens (PrivacyPoolComplex)

The PrivacyPool contract provides a foundation for implementing privacy-preserving asset pools with strong security guarantees and efficient state management. It is designed to be extended for specific asset types while maintaining consistent privacy and security properties.
