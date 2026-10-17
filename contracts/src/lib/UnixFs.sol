// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title UnixFS root decoder
/// @notice Parses an IPFS dag-pb node (protobuf) and its UnixFS payload, and checks it is a
/// well-formed PotDrive root: every link a CIDv1 over blake2b-256, file sizes consistent,
/// directory names canonical. What it returns is derived from the bytes, not claimed.
/// @dev Wire format: PBNode { 2: repeated PBLink Links; 1: bytes Data }
///      PBLink { 1: bytes Hash; 2: string Name; 3: uint64 Tsize }
///      UnixFS Data { 1: Type; 2: bytes Data; 3: uint64 filesize; 4: repeated uint64 blocksizes; … }
library UnixFs {
    uint8 internal constant RAW = 0x55;
    uint8 internal constant DAG_PB = 0x70;

    uint8 internal constant KIND_DIRECTORY = 1;
    uint8 internal constant KIND_FILE = 2;

    /// @dev A CIDv1 link: version, codec, blake2b-256 multihash code (varint 0xb220), length.
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

    // ---- protobuf primitives ----

    function _varint(bytes memory b, uint256 i) private pure returns (uint256 v, uint256 next) {
        uint256 shift;
        while (true) {
            if (i >= b.length || shift > 63) revert Malformed(i);
            uint8 x = uint8(b[i++]);
            v |= uint256(x & 0x7f) << shift;
            if (x < 0x80) return (v, i);
            shift += 7;
        }
    }

    /// @dev Reads a field key and, for length-delimited fields, the bounds of its value.
    function _field(bytes memory b, uint256 i, uint256 end)
        private
        pure
        returns (uint256 field, uint256 wire, uint256 start, uint256 next)
    {
        uint256 key;
        (key, i) = _varint(b, i);
        field = key >> 3;
        wire = key & 7;
        if (wire == 2) {
            uint256 len;
            (len, start) = _varint(b, i);
            next = start + len;
            if (next > end) revert Malformed(start);
        } else if (wire == 0) {
            start = i;
            (, next) = _varint(b, i);
        } else {
            revert Malformed(i);
        }
    }

    // ---- links ----

    /// @dev Checks the Hash bytes at [s, s+len) are a CIDv1 over blake2b-256 and returns codec and digest.
    function _cid(bytes memory b, uint256 s, uint256 len, uint256 index) private pure returns (uint8 codec, bytes32 digest) {
        if (len != CID_LEN) revert BadLink(index);
        codec = uint8(b[s + 1]);
        if (
            uint8(b[s]) != 0x01 || (codec != RAW && codec != DAG_PB) || uint8(b[s + 2]) != 0xa0 || uint8(b[s + 3]) != 0xe4
                || uint8(b[s + 4]) != 0x02 || uint8(b[s + 5]) != 0x20
        ) revert BadLink(index);
        assembly ("memory-safe") {
            digest := mload(add(add(b, 0x20), add(s, 6)))
        }
    }

    struct Link {
        uint8 codec;
        bytes32 digest;
        uint256 nameStart;
        uint256 nameLen;
        uint64 tsize;
    }

    function _link(bytes memory b, uint256 i, uint256 end, uint256 index) private pure returns (Link memory l) {
        bool hasHash;
        while (i < end) {
            (uint256 field, uint256 wire, uint256 s, uint256 next) = _field(b, i, end);
            if (field == 1 && wire == 2) {
                (l.codec, l.digest) = _cid(b, s, next - s, index);
                hasHash = true;
            } else if (field == 2 && wire == 2) {
                (l.nameStart, l.nameLen) = (s, next - s);
            } else if (field == 3 && wire == 0) {
                (uint256 t,) = _varint(b, s);
                l.tsize = uint64(t);
            } else {
                revert Malformed(i);
            }
            i = next;
        }
        if (!hasHash) revert BadLink(index);
    }

    /// @dev Strict byte order of two names inside `b`, as UnixFS sorts directory entries.
    function _less(bytes memory b, uint256 a, uint256 al, uint256 c, uint256 cl) private pure returns (bool) {
        uint256 n = al < cl ? al : cl;
        for (uint256 k; k < n; k++) {
            uint8 x = uint8(b[a + k]);
            uint8 y = uint8(b[c + k]);
            if (x != y) return x < y;
        }
        return al < cl;
    }

    // ---- node ----

    struct Data {
        uint256 utype;
        uint256 filesize;
        uint256 sizes; // blocksizes seen
        uint256 sum;
    }

    /// @dev First pass: the links, and where the UnixFS payload sits.
    function _links(bytes memory b) private pure returns (Link[] memory links, uint256 n, uint256 ds, uint256 de) {
        uint256 end = b.length;
        bool hasData;
        links = new Link[](end / CID_LEN + 1);
        uint256 i;
        while (i < end) {
            (uint256 field, uint256 wire, uint256 s, uint256 next) = _field(b, i, end);
            if (wire != 2) revert Malformed(i);
            if (field == 2) {
                links[n] = _link(b, s, next, n);
                n++;
            } else if (field == 1 && !hasData) {
                (ds, de, hasData) = (s, next, true);
            } else {
                revert Malformed(i);
            }
            i = next;
        }
        if (!hasData || n == 0) revert Malformed(end);
    }

    /// @dev Reads one blocksize and checks it against the matching link.
    function _blockSize(bytes memory b, uint256 j, Link[] memory links, uint256 n, Data memory d)
        private
        pure
        returns (uint256)
    {
        uint256 bs;
        (bs, j) = _varint(b, j);
        if (d.sizes >= n || links[d.sizes].codec != RAW || links[d.sizes].tsize != bs) revert SizeMismatch();
        d.sum += bs;
        d.sizes++;
        return j;
    }

    /// @dev Second pass: the UnixFS payload. Blocksizes may be unpacked or packed.
    function _data(bytes memory b, uint256 i, uint256 end, Link[] memory links, uint256 n)
        private
        pure
        returns (Data memory d)
    {
        d.utype = type(uint256).max;
        while (i < end) {
            (uint256 field, uint256 wire, uint256 s, uint256 next) = _field(b, i, end);
            if (field == 1 && wire == 0) {
                (d.utype,) = _varint(b, s);
            } else if (field == 3 && wire == 0) {
                (d.filesize,) = _varint(b, s);
            } else if (field == 4 && wire == 0) {
                _blockSize(b, s, links, n, d);
            } else if (field == 4) {
                for (uint256 j = s; j < next;) {
                    j = _blockSize(b, j, links, n, d);
                }
            }
            // other UnixFS fields (data, hashType, fanout, mode, mtime) carry nothing we rely on
            i = next;
        }
    }

    /// @dev Directory entries: named, no slashes, strictly sorted. Returns the cumulative size.
    function _directory(bytes memory b, Link[] memory links, uint256 n) private pure returns (uint256 total) {
        for (uint256 k; k < n; k++) {
            Link memory l = links[k];
            if (l.nameLen == 0) revert NotCanonical(k);
            for (uint256 c; c < l.nameLen; c++) {
                if (b[l.nameStart + c] == "/") revert NotCanonical(k);
            }
            if (k > 0 && !_less(b, links[k - 1].nameStart, links[k - 1].nameLen, l.nameStart, l.nameLen)) {
                revert NotCanonical(k);
            }
            total += l.tsize;
        }
    }

    /// @notice Decodes and validates a PotDrive root node.
    function parse(bytes memory b) internal pure returns (Node memory node) {
        (Link[] memory links, uint256 n, uint256 ds, uint256 de) = _links(b);
        Data memory d = _data(b, ds, de, links, n);
        node.links = uint32(n);
        if (d.utype == KIND_FILE) {
            // A flat file: one raw leaf per blocksize, in order, adding up to filesize.
            if (d.sizes != n || d.sum != d.filesize || d.filesize == 0) revert SizeMismatch();
            node.kind = KIND_FILE;
            node.size = uint64(d.filesize);
        } else if (d.utype == KIND_DIRECTORY) {
            node.kind = KIND_DIRECTORY;
            node.size = uint64(_directory(b, links, n));
        } else {
            revert Unsupported(d.utype);
        }
    }

    /// @notice The blake2b-256 digest and codec of link `index`, i.e. what that block must hash to.
    function linkAt(bytes memory b, uint256 index) internal pure returns (uint8 codec, bytes32 digest) {
        uint256 end = b.length;
        uint256 i;
        uint256 n;
        while (i < end) {
            (uint256 field, uint256 wire, uint256 s, uint256 next) = _field(b, i, end);
            if (field == 2 && wire == 2) {
                if (n == index) {
                    Link memory l = _link(b, s, next, n);
                    return (l.codec, l.digest);
                }
                n++;
            }
            i = next;
        }
        revert BadLink(index);
    }
}
