// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {blake2b256} from "./lib/ISystem.sol";
import {UnixFs} from "./lib/UnixFs.sol";
import {Permit} from "./lib/Permit.sol";
import {Upload, Meta} from "./lib/Types.sol";

interface IRegistry {
    function register(Upload calldata u, Meta calldata m, address owner, bytes32 signer) external payable returns (bytes32);
}

/// @title Gasless registration with Polkadot wallet signatures
/// @notice A Polkadot account signs a readable permit in its normal wallet popup; anyone (a
/// sponsor relay) submits it here and pays. The contract rebuilds the exact text the wallet
/// showed, checks the sr25519 signature with Portaldot's System precompile, and registers the
/// file for that account's Revive address. Optional: the registry works without it, so its
/// deposit is only paid once gasless uploads are switched on.
contract PotDrivePermits {
    IRegistry public immutable registry;
    /// @notice Next permit nonce for each Substrate public key.
    mapping(bytes32 => uint64) public nonces;

    error BadSignature();
    error PermitExpired();

    constructor(IRegistry registry_) {
        registry = registry_;
    }

    /// @param signature 64-byte sr25519 signature over `Permit.registerText`, as wallets sign it
    /// @param extra appended to the text verbatim: the sponsor's own terms (upload key, budget)
    function register(
        Upload calldata u,
        Meta calldata m,
        bytes32 signer,
        uint32 deadline,
        bytes calldata signature,
        bytes calldata extra
    ) external payable returns (bytes32) {
        if (block.number > deadline) revert PermitExpired();
        (bytes32 root, uint8 codec) = u.rootNode.length > 0 ? (blake2b256(u.rootNode), UnixFs.DAG_PB) : (u.leaf, UnixFs.RAW);
        bytes memory text = Permit.registerText(root, codec, m, address(registry), nonces[signer]++, deadline, extra);
        if (!Permit.verify(signature, text, signer)) revert BadSignature();
        return registry.register{value: msg.value}(u, m, Permit.addressOf(signer), signer);
    }

    /// @notice The exact bytes a wallet's signature is checked over (the text it showed, wrapped
    /// in <Bytes>…</Bytes>), for the next nonce of `signer`.
    function permitText(Upload calldata u, Meta calldata m, bytes32 signer, uint32 deadline, bytes calldata extra)
        external
        view
        returns (bytes memory)
    {
        (bytes32 root, uint8 codec) = u.rootNode.length > 0 ? (blake2b256(u.rootNode), UnixFs.DAG_PB) : (u.leaf, UnixFs.RAW);
        return Permit.registerText(root, codec, m, address(registry), nonces[signer], deadline, extra);
    }
}
