// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Meta} from "./Types.sol";

/// @title Readable sr25519 permits
/// @notice Builds the exact text a Polkadot wallet shows and signs, so a contract can check a
/// signature made by a normal wallet popup. Polkadot extensions sign raw messages wrapped in
/// `<Bytes>…</Bytes>`; the text is built inside that wrapper, so it is checked byte for byte.
/// @dev Written for small bytecode (Revive charges a deposit per byte of code): one buffer,
/// one write cursor, word-sized copies, and the precompile call assembled by hand.
library Permit {
    bytes16 private constant HEX = "0123456789abcdef";
    bytes32 private constant B32 = "abcdefghijklmnopqrstuvwxyz234567";
    address private constant SYSTEM = 0x0000000000000000000000000000000000000900;
    /// @dev sr25519Verify(uint8[64],bytes,bytes32)
    uint256 private constant VERIFY = 0x307a575d;

    error BadText();

    // ---- writers: each appends at offset p of t's payload and returns the new offset ----
    // Buffers are allocated with slack, so the word-sized copies may run past the end safely.

    function _put(bytes memory t, uint256 p, bytes memory s) private pure returns (uint256) {
        assembly ("memory-safe") {
            let dst := add(add(t, 0x20), p)
            let n := mload(s)
            for { let k := 0 } lt(k, n) { k := add(k, 0x20) } { mstore(add(dst, k), mload(add(add(s, 0x20), k))) }
            p := add(p, n)
        }
        return p;
    }

    function _byte(bytes memory t, uint256 p, uint256 c) private pure returns (uint256) {
        assembly ("memory-safe") {
            mstore8(add(add(t, 0x20), p), c)
        }
        return p + 1;
    }

    /// @dev "0x" + lowercase hex of the first n bytes of v.
    function _hex(bytes memory t, uint256 p, bytes32 v, uint256 n) private pure returns (uint256) {
        p = _put(t, p, "0x");
        for (uint256 i; i < n; i++) {
            p = _byte(t, p, uint8(HEX[uint8(v[i]) >> 4]));
            p = _byte(t, p, uint8(HEX[uint8(v[i]) & 15]));
        }
        return p;
    }

    function _dec(bytes memory t, uint256 p, uint256 v) private pure returns (uint256) {
        uint256 digits = 1;
        for (uint256 x = v; x >= 10; x /= 10) digits++;
        for (uint256 i = digits; i > 0; v /= 10) _byte(t, p + --i, 48 + v % 10);
        return p + digits;
    }

    /// @dev CIDv1 text: "b" + base32(0x01 ‖ codec ‖ 0xa0e40220 ‖ digest), lowercase, unpadded.
    function _cid(bytes memory t, uint256 p, uint8 codec, bytes32 digest) private pure returns (uint256) {
        p = _byte(t, p, 0x62);
        bytes memory raw = abi.encodePacked(uint8(1), codec, uint32(0xa0e40220), digest);
        uint256 buffer;
        uint256 bits;
        for (uint256 i; i < raw.length; i++) {
            buffer = (buffer << 8) | uint8(raw[i]);
            bits += 8;
            while (bits >= 5) {
                bits -= 5;
                p = _byte(t, p, uint8(B32[(buffer >> bits) & 31]));
            }
        }
        return bits > 0 ? _byte(t, p, uint8(B32[(buffer << (5 - bits)) & 31])) : p;
    }

    /// @dev Free text goes on its own line, so it must not be able to start another one.
    function _line(bytes memory t, uint256 p, bytes calldata s) private pure returns (uint256) {
        for (uint256 i; i < s.length; i++) {
            if (s[i] == 0x0a || s[i] == 0x0d) revert BadText();
        }
        return _put(t, p, s);
    }

    // ---- public pieces ----

    /// @notice The CIDv1 text a person sees in the Drive.
    function cid(uint8 codec, bytes32 digest) internal pure returns (bytes memory t) {
        t = new bytes(96);
        uint256 p = _cid(t, 0, codec, digest);
        assembly ("memory-safe") {
            mstore(t, p)
        }
    }

    /// @notice The address pallet-revive gives a Substrate account: the first 20 bytes for
    /// Ethereum-derived accounts (padded with 0xEE), otherwise keccak256(account)[12..].
    function addressOf(bytes32 account) internal pure returns (address) {
        if (uint96(uint256(account)) == 0xeeeeeeeeeeeeeeeeeeeeeeee) return address(bytes20(account));
        return address(uint160(uint256(keccak256(abi.encodePacked(account)))));
    }

    /// @notice "<Bytes>" + text + "</Bytes>", how Polkadot wallets sign raw text.
    function wrap(bytes memory text) internal pure returns (bytes memory t) {
        t = new bytes(text.length + 48);
        uint256 p = _put(t, _put(t, 0, "<Bytes>"), text);
        p = _put(t, p, "</Bytes>");
        assembly ("memory-safe") {
            mstore(t, p)
        }
    }

    /// @notice The text a Polkadot wallet signs to let anyone register an upload for its owner,
    /// already wrapped in <Bytes>…</Bytes>. `extra` is appended verbatim (a sponsor's own terms).
    function registerText(
        bytes32 root,
        uint8 codec,
        Meta calldata m,
        address registry,
        uint64 nonce,
        uint32 deadline,
        bytes calldata extra
    ) internal view returns (bytes memory t) {
        t = new bytes(480 + bytes(m.name).length + bytes(m.mime).length + extra.length);
        uint256 p = _cid(t, _put(t, 0, "<Bytes>PotDrive: store and register a file\ncid: "), codec, root);
        p = _line(t, _put(t, p, "\nname: "), bytes(m.name));
        p = _line(t, _put(t, p, "\ntype: "), bytes(m.mime));
        p = _put(t, p, m.isPrivate ? bytes("\nprivate: yes\nprevious: ") : bytes("\nprivate: no\nprevious: "));
        p = m.parent == bytes32(0) ? _put(t, p, "none") : _hex(t, p, m.parent, 32);
        p = _hex(t, _put(t, p, "\nregistry: "), bytes32(bytes20(registry)), 20);
        p = _dec(t, _put(t, p, "\nchain: "), block.chainid);
        p = _dec(t, _put(t, p, "\nnonce: "), nonce);
        p = _dec(t, _put(t, p, "\nvalid until block: "), deadline);
        if (extra.length > 0) p = _put(t, _byte(t, p, 0x0a), extra);
        p = _put(t, p, "</Bytes>");
        assembly ("memory-safe") {
            mstore(t, p)
        }
    }

    /// @notice Checks a 64-byte sr25519 signature through the System precompile. The call data
    /// (a uint8[64] is 64 ABI words) is assembled directly rather than through the ABI encoder.
    function verify(bytes memory signature, bytes memory message, bytes32 publicKey) internal view returns (bool ok) {
        if (signature.length != 64) return false;
        assembly ("memory-safe") {
            let len := mload(message)
            let ptr := mload(0x40)
            mstore(ptr, shl(224, VERIFY))
            for { let i := 0 } lt(i, 64) { i := add(i, 1) } {
                mstore(add(add(ptr, 4), shl(5, i)), byte(0, mload(add(add(signature, 0x20), i))))
            }
            mstore(add(ptr, 0x804), 0x840) // offset of `message`
            mstore(add(ptr, 0x824), publicKey)
            mstore(add(ptr, 0x844), len)
            for { let k := 0 } lt(k, len) { k := add(k, 0x20) } {
                mstore(add(add(ptr, 0x864), k), mload(add(add(message, 0x20), k)))
            }
            mstore(add(add(ptr, 0x864), len), 0) // zero the ABI padding after the message
            let size := add(0x864, and(add(len, 31), not(31)))
            // Yul evaluates arguments right to left, so the call must be its own statement.
            let success := staticcall(gas(), SYSTEM, ptr, size, 0, 0x20)
            ok := and(success, and(gt(returndatasize(), 31), eq(mload(0), 1)))
        }
    }
}
