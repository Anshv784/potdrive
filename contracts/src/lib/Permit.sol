// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Readable sr25519 permits
/// @notice Builds the exact text a Polkadot wallet shows and signs, so a contract can check a
/// signature made by a normal wallet popup. Polkadot extensions sign raw messages wrapped in
/// `<Bytes>…</Bytes>`; the contract rebuilds that wrapper byte for byte.
library Permit {
    bytes16 private constant HEX = "0123456789abcdef";
    bytes32 private constant B32 = "abcdefghijklmnopqrstuvwxyz234567";

    error BadText();

    function hex32(bytes32 v) internal pure returns (bytes memory out) {
        out = new bytes(66);
        out[0] = "0";
        out[1] = "x";
        for (uint256 i; i < 32; i++) {
            out[2 + i * 2] = HEX[uint8(v[i]) >> 4];
            out[3 + i * 2] = HEX[uint8(v[i]) & 0x0f];
        }
    }

    function hexAddress(address a) internal pure returns (bytes memory out) {
        bytes20 v = bytes20(a);
        out = new bytes(42);
        out[0] = "0";
        out[1] = "x";
        for (uint256 i; i < 20; i++) {
            out[2 + i * 2] = HEX[uint8(v[i]) >> 4];
            out[3 + i * 2] = HEX[uint8(v[i]) & 0x0f];
        }
    }

    function decimal(uint256 v) internal pure returns (bytes memory out) {
        if (v == 0) return "0";
        uint256 n;
        for (uint256 t = v; t > 0; t /= 10) n++;
        out = new bytes(n);
        for (; v > 0; v /= 10) out[--n] = bytes1(uint8(48 + v % 10));
    }

    /// @notice The CIDv1 text a person sees in the Drive: "b" + base32(0x01 ‖ codec ‖ blake2b-256 multihash).
    function cid(uint8 codec, bytes32 digest) internal pure returns (bytes memory out) {
        bytes memory raw = abi.encodePacked(uint8(0x01), codec, uint8(0xa0), uint8(0xe4), uint8(0x02), uint8(0x20), digest);
        out = new bytes(1 + (raw.length * 8 + 4) / 5);
        out[0] = "b";
        uint256 buffer;
        uint256 bits;
        uint256 o = 1;
        for (uint256 i; i < raw.length; i++) {
            buffer = (buffer << 8) | uint8(raw[i]);
            bits += 8;
            while (bits >= 5) {
                bits -= 5;
                out[o++] = B32[(buffer >> bits) & 31];
            }
        }
        if (bits > 0) out[o] = B32[(buffer << (5 - bits)) & 31];
    }

    /// @dev Free text goes on its own line, so it must not be able to start another one.
    function line(string memory s) internal pure returns (bytes memory) {
        bytes memory b = bytes(s);
        for (uint256 i; i < b.length; i++) {
            if (b[i] == 0x0a || b[i] == 0x0d) revert BadText();
        }
        return b;
    }

    function wrap(bytes memory message) internal pure returns (bytes memory) {
        return abi.encodePacked("<Bytes>", message, "</Bytes>");
    }

    /// @notice The address pallet-revive gives a Substrate account: the first 20 bytes for
    /// Ethereum-derived accounts (padded with 0xEE), otherwise keccak256(account)[12..].
    function addressOf(bytes32 account) internal pure returns (address) {
        if (uint96(uint256(account)) == 0xeeeeeeeeeeeeeeeeeeeeeeee) return address(bytes20(account));
        return address(uint160(uint256(keccak256(abi.encodePacked(account)))));
    }
}
