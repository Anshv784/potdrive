// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SYSTEM} from "./lib/ISystem.sol";
import {UnixFs} from "./lib/UnixFs.sol";
import {Permit} from "./lib/Permit.sol";

/// @title PotDrive verifier
/// @notice Stateless checks over files stored on Portaldot. Deploy it once and any contract can
/// consume a stored file's bytes trustlessly with proveBlock. The registry does not depend on
/// it, so nobody has to pay its deposit for PotDrive itself to work.
contract PotDriveVerifier {
    /// @notice Hashes a root block with Portaldot's blake2b-256 and decodes it.
    function inspect(bytes calldata rootNode) external pure returns (bytes32 root, UnixFs.Node memory node) {
        return (SYSTEM.hashBlake256(rootNode), UnixFs.parse(rootNode));
    }

    /// @notice True if `data` is block `index` of the file whose root block is `rootNode`.
    function proveBlock(bytes32 root, bytes calldata rootNode, uint256 index, bytes calldata data)
        external
        pure
        returns (bool)
    {
        if (SYSTEM.hashBlake256(rootNode) != root) return false;
        (, bytes32 digest) = UnixFs.linkAt(rootNode, index);
        return SYSTEM.hashBlake256(data) == digest;
    }
}

/// @title One-shot on-chain check
/// @notice Never deployed: run its creation code through eth_call and Portaldot's runtime hashes
/// the block, decodes it, checks an optional sr25519 signature, and returns the report as the
/// call's result. Free, and executed by the chain itself rather than by PotDrive's servers.
contract PotDriveCheck {
    struct Report {
        bytes32 root; // blake2b-256 of `block_`, from the System precompile
        uint8 kind; // 0 raw block, 1 directory, 2 file
        uint64 size;
        uint32 links;
        bool signatureValid;
        uint256 chainId;
        uint256 blockNumber;
    }

    /// @param message the text the wallet showed; checked wrapped in <Bytes>…</Bytes>
    constructor(bytes memory block_, bool dagPb, bytes32 signer, bytes memory signature, bytes memory message) {
        Report memory r;
        r.root = SYSTEM.hashBlake256(block_);
        if (dagPb) {
            UnixFs.Node memory n = UnixFs.parse(block_);
            (r.kind, r.size, r.links) = (n.kind, n.size, n.links);
        } else {
            (r.size, r.links) = (uint64(block_.length), 1);
        }
        if (signer != bytes32(0)) r.signatureValid = Permit.verify(signature, Permit.wrap(message), signer);
        (r.chainId, r.blockNumber) = (block.chainid, block.number);
        bytes memory out = abi.encode(r);
        assembly ("memory-safe") {
            return(add(out, 0x20), mload(out))
        }
    }
}
