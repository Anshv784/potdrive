// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @dev What is being registered: a dag-pb root block (proven on chain), or a single raw block
/// identified by its digest and size (up to 1 MiB, too large to hash in a transaction).
struct Upload {
    bytes rootNode;
    bytes32 leaf;
    uint64 leafSize;
}

struct Meta {
    bool isPrivate;
    string name;
    string mime;
    bytes32 parent; // previous version's root, or zero
}
