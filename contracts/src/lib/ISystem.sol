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

/// @notice blake2b-256 through the System precompile, with the call assembled by hand
/// (smaller than the ABI encoder, which matters on Revive where code costs a deposit per byte).
function blake2b256(bytes memory data) view returns (bytes32 digest) {
    assembly ("memory-safe") {
        let len := mload(data)
        let ptr := mload(0x40)
        mstore(ptr, shl(224, 0xc7dff686)) // hashBlake256(bytes)
        mstore(add(ptr, 4), 0x20)
        mstore(add(ptr, 0x24), len)
        for { let k := 0 } lt(k, len) { k := add(k, 0x20) } {
            mstore(add(add(ptr, 0x44), k), mload(add(add(data, 0x20), k)))
        }
        mstore(add(add(ptr, 0x44), len), 0)
        let ok := staticcall(gas(), 0x0000000000000000000000000000000000000900, ptr, add(0x44, and(add(len, 31), not(31))), 0, 0x20)
        if iszero(and(ok, gt(returndatasize(), 31))) { revert(0, 0) }
        digest := mload(0)
    }
}
