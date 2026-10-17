// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Stands in for pallet-revive's System precompile in local tests, at the same address.
/// hashBlake256 is a real blake2b-256 built on the EVM's BLAKE2 F precompile (EIP-152), so
/// tests hash exactly what Portaldot hashes. sr25519 cannot run here: signatures are accepted
/// only if the test registered that exact (signature, message, key), and the real check is
/// exercised against Portaldot itself by scripts/onchain-check.ts.
contract MockSystem {
    mapping(bytes32 => bool) private _ok;

    /// @dev blake2b IV, little-endian words, with h0 ^= 0x01010020 (no key, 32-byte digest).
    bytes private constant H0 =
        hex"28c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b";

    function hashBlake256(bytes memory data) external view returns (bytes32 out) {
        bytes memory h = H0;
        uint256 len = data.length;
        uint256 blocks = len == 0 ? 1 : (len + 127) / 128;
        for (uint256 i; i < blocks; i++) {
            uint256 start = i * 128;
            uint256 n = len - start < 128 ? len - start : 128;
            bytes memory m = new bytes(128);
            for (uint256 k; k < n; k++) {
                m[k] = data[start + k];
            }
            bytes memory input = abi.encodePacked(
                uint32(12), h, m, _le64(uint64(start + n)), uint64(0), i == blocks - 1 ? bytes1(0x01) : bytes1(0x00)
            );
            (bool ok, bytes memory res) = address(9).staticcall(input);
            require(ok && res.length == 64, "blake2f");
            h = res;
        }
        assembly {
            out := mload(add(h, 32))
        }
    }

    function allow(uint8[64] calldata signature, bytes calldata message, bytes32 publicKey) external {
        _ok[keccak256(abi.encode(signature, message, publicKey))] = true;
    }

    function sr25519Verify(uint8[64] calldata signature, bytes calldata message, bytes32 publicKey)
        external
        view
        returns (bool)
    {
        return _ok[keccak256(abi.encode(signature, message, publicKey))];
    }

    function _le64(uint64 v) private pure returns (bytes8 r) {
        for (uint256 i; i < 8; i++) {
            r |= bytes8(bytes1(uint8(v >> (8 * i)))) >> (8 * i);
        }
    }
}
