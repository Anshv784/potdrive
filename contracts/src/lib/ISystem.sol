// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice pallet-revive's System precompile. Portaldot V3 enables it at 0x…0900:
/// runtime functions a plain EVM chain does not have, executed natively.
interface ISystem {
    /// @notice blake2b-256, the hash TransactionStorage indexes stored data under.
    function hashBlake256(bytes memory input) external pure returns (bytes32 digest);

    /// @notice Verifies a Substrate sr25519 signature, the key type Polkadot wallets use.
    function sr25519Verify(uint8[64] calldata signature, bytes calldata message, bytes32 publicKey)
        external
        view
        returns (bool);
}

ISystem constant SYSTEM = ISystem(0x0000000000000000000000000000000000000900);
