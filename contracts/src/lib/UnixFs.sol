// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title UnixFS root decoder
/// @notice Parses an IPFS dag-pb node (protobuf) and its UnixFS payload, and checks it is a
/// well-formed PotDrive root: every link a CIDv1 over blake2b-256, file sizes consistent,
/// directory names canonical. What it returns is derived from the bytes, not claimed.
/// @dev Wire format: PBNode { 2: repeated PBLink Links; 1: bytes Data }
///      PBLink { 1: bytes Hash; 2: string Name; 3: uint64 Tsize }
///      UnixFS Data { 1: Type; 2: bytes Data; 3: uint64 filesize; 4: repeated uint64 blocksizes; … }
/// Written for small bytecode, since Revive charges a deposit per byte of code: bytes are read
/// with one unchecked helper after explicit bounds checks, and each link is packed in one word.
library UnixFs {
    uint8 internal constant RAW = 0x55;
    uint8 internal constant DAG_PB = 0x70;

    uint8 internal constant KIND_DIRECTORY = 1;
    uint8 internal constant KIND_FILE = 2;

    /// @dev A CIDv1 link is 38 bytes: 0x01, codec, 0xa0e40220 (blake2b-256 multihash, 32 bytes), digest.
    uint256 private constant CID_LEN = 38;

    struct Node {
        uint8 kind; // KIND_FILE or KIND_DIRECTORY
        uint64 size; // file: bytes of content; directory: cumulative Tsize of entries
        uint32 links;
    }

    error Malformed(uint256 offset);
    error BadLink(uint256 index);
    error Unsupported(uint256 unixfsType);
    error SizeMismatch();
    error NotCanonical(uint256 index);

    /// @dev Unchecked read; every caller bounds `i` against the field it is inside.
    function _at(bytes memory b, uint256 i) private pure returns (uint256 v) {
        assembly ("memory-safe") {
            v := byte(0, mload(add(add(b, 0x20), i)))
        }
    }

    function _varint(bytes memory b, uint256 i, uint256 end) private pure returns (uint256 v, uint256) {
        for (uint256 shift; shift < 64; shift += 7) {
            if (i >= end) break;
            uint256 x = _at(b, i++);
            v |= (x & 0x7f) << shift;
            if (x < 0x80) return (v, i);
        }
        revert Malformed(i);
    }

    /// @dev One field: its number, wire type, and value bounds ([s, next) for bytes; s = varint start).
    function _field(bytes memory b, uint256 i, uint256 end)
        private
        pure
        returns (uint256 field, uint256 wire, uint256 s, uint256 next)
    {
        uint256 key;
        (key, s) = _varint(b, i, end);
        (field, wire) = (key >> 3, key & 7);
        if (wire == 2) {
            uint256 len;
            (len, s) = _varint(b, s, end);
            next = s + len;
            if (next > end) revert Malformed(s);
        } else if (wire == 0) {
            (, next) = _varint(b, s, end);
        } else {
            revert Malformed(i);
        }
    }

    /// @dev Packs a link: codec (8 bits) | tsize << 8 (64) | name start << 72 (64) | name length << 136.
    function _link(bytes memory b, uint256 i, uint256 end, uint256 index) private pure returns (uint256 packed) {
        bool hashed;
        while (i < end) {
            (uint256 field, uint256 wire, uint256 s, uint256 next) = _field(b, i, end);
            if (field == 1 && wire == 2) {
                uint256 head;
                assembly ("memory-safe") {
                    head := shr(208, mload(add(add(b, 0x20), s))) // first 6 bytes
                }
                uint256 codec = (head >> 32) & 0xff;
                if (next - s != CID_LEN || head & 0xff00ffffffff != 0x0100a0e40220 || (codec != RAW && codec != DAG_PB)) {
                    revert BadLink(index);
                }
                packed |= codec;
                hashed = true;
            } else if (field == 2 && wire == 2) {
                packed |= (s << 72) | ((next - s) << 136);
            } else if (field == 3 && wire == 0) {
                (uint256 t,) = _varint(b, s, next);
                packed |= uint256(uint64(t)) << 8;
            } else {
                revert Malformed(i);
            }
            i = next;
        }
        if (!hashed) revert BadLink(index);
    }

    function _tsize(uint256 l) private pure returns (uint256) {
        return uint64(l >> 8);
    }

    /// @notice Decodes and validates a PotDrive root node.
    function parse(bytes memory b) internal pure returns (Node memory node) {
        uint256 end = b.length;
        uint256[] memory links = new uint256[](end / CID_LEN + 1);
        uint256 n;
        uint256 ds;
        uint256 de;
        for (uint256 i; i < end;) {
            (uint256 field, uint256 wire, uint256 s, uint256 next) = _field(b, i, end);
            if (wire != 2) revert Malformed(i);
            if (field == 2) {
                links[n] = _link(b, s, next, n);
                n++;
            } else if (field == 1 && de == 0) {
                (ds, de) = (s, next);
            } else {
                revert Malformed(i);
            }
            i = next;
        }
        if (de == 0 || n == 0) revert Malformed(end);
        node.links = uint32(n);

        // UnixFS payload. Blocksizes (field 4) may be unpacked or packed; each must equal its
        // link's Tsize and point at a raw leaf.
        uint256 utype = type(uint256).max;
        uint256 filesize;
        uint256 sizes;
        uint256 sum;
        for (uint256 i = ds; i < de;) {
            (uint256 field, uint256 wire, uint256 s, uint256 next) = _field(b, i, de);
            if (field == 1 && wire == 0) {
                (utype,) = _varint(b, s, next);
            } else if (field == 3 && wire == 0) {
                (filesize,) = _varint(b, s, next);
            } else if (field == 4) {
                for (uint256 j = s; j < next;) {
                    uint256 bs;
                    (bs, j) = _varint(b, j, next);
                    if (sizes >= n || links[sizes] & 0xff != RAW || _tsize(links[sizes]) != bs) revert SizeMismatch();
                    sum += bs;
                    sizes++;
                }
            }
            // other UnixFS fields (data, hashType, fanout, mode, mtime) carry nothing we rely on
            i = next;
        }

        if (utype == KIND_FILE) {
            // A flat file: one raw leaf per blocksize, in order, adding up to filesize.
            if (sizes != n || sum != filesize || filesize == 0) revert SizeMismatch();
            (node.kind, node.size) = (KIND_FILE, uint64(filesize));
        } else if (utype == KIND_DIRECTORY) {
            // Entries named, no slashes, in strictly ascending byte order (canonical UnixFS).
            uint256 total;
            for (uint256 k; k < n; k++) {
                uint256 at = uint64(links[k] >> 72);
                uint256 len = links[k] >> 136;
                if (len == 0) revert NotCanonical(k);
                for (uint256 c; c < len; c++) {
                    if (_at(b, at + c) == 0x2f) revert NotCanonical(k);
                }
                if (k > 0) {
                    uint256 pat = uint64(links[k - 1] >> 72);
                    uint256 plen = links[k - 1] >> 136;
                    uint256 c;
                    while (c < len && c < plen && _at(b, pat + c) == _at(b, at + c)) c++;
                    // previous must sort strictly first: it is a proper prefix, or its next byte is lower
                    if (c == plen ? c == len : c == len || _at(b, pat + c) > _at(b, at + c)) revert NotCanonical(k);
                }
                total += _tsize(links[k]);
            }
            (node.kind, node.size) = (KIND_DIRECTORY, uint64(total));
        } else {
            revert Unsupported(utype);
        }
    }

    /// @notice The codec and blake2b-256 digest of link `index`: what that block must hash to.
    function linkAt(bytes memory b, uint256 index) internal pure returns (uint8 codec, bytes32 digest) {
        uint256 n;
        for (uint256 i; i < b.length;) {
            (uint256 field, uint256 wire, uint256 s, uint256 next) = _field(b, i, b.length);
            if (field == 2 && wire == 2 && n++ == index) {
                for (uint256 j = s; j < next;) {
                    (uint256 f,, uint256 hs, uint256 hn) = _field(b, j, next);
                    if (f == 1) {
                        _link(b, s, next, index); // validates the CID
                        codec = uint8(_at(b, hs + 1));
                        assembly ("memory-safe") {
                            digest := mload(add(add(b, 0x20), add(hs, 6)))
                        }
                        return (codec, digest);
                    }
                    j = hn;
                }
            }
            i = next;
        }
        revert BadLink(index);
    }
}
