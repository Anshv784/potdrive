// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {blake2b256} from "./lib/ISystem.sol";
import {UnixFs} from "./lib/UnixFs.sol";
import {Upload, Meta} from "./lib/Types.sol";

/// @title PotDrive registry
/// @notice Ownership and keep-alive for files stored in Portaldot's native TransactionStorage.
/// The contract does not take an uploader's word for what a file is: it hashes the root block
/// with Portaldot's own blake2b-256 (the System precompile, the hash TransactionStorage indexes
/// data under), parses the IPFS dag-pb / UnixFS structure, and records the size and block count
/// the bytes prove. Gasless registration lives in an optional module, PotDrivePermits, which
/// checks a Polkadot wallet's sr25519 signature and registers on that account's behalf.
/// @dev Revive charges a deposit per byte of code and storage, so this contract is kept lean:
/// read-only verification lives in PotDriveVerifier / PotDriveCheck (which run through eth_call
/// without being deployed), a record is two packed slots, and names, types and version links
/// live in event logs, which cost no deposit.
contract PotDriveRegistry {
    /// @dev TransactionStorage.RetentionPeriod on Portaldot V3 (blocks, ~7 days).
    uint32 public constant RETENTION = 100_800;
    /// @dev A renewal may only be claimed this close to expiry (~2 days).
    uint32 public constant RENEW_WINDOW = 28_800;

    uint8 internal constant PRIVATE = 1;
    uint8 internal constant UNLISTED = 2;
    /// @dev Size and blocks were derived on chain from the root block.
    uint8 internal constant PROVEN = 4;

    struct File {
        address owner; // slot 0
        uint64 size;
        uint8 flags; // PRIVATE | UNLISTED | PROVEN
        uint8 kind; // UnixFs.KIND_FILE / KIND_DIRECTORY, 0 for a single raw block
        uint32 chunks; // slot 1
        uint32 storedAt;
        uint32 expiresAt;
        uint32 rootLen; // bytes of the root block itself
        uint128 keepAlive;
    }

    mapping(bytes32 => File) public files;
    /// @notice X25519 public keys that others can seal private-file keys to.
    mapping(address => bytes32) public inboxKey;
    uint256 public count;
    address public admin;
    address public keeper;
    /// @notice The permit module allowed to register on behalf of other accounts.
    address public sponsor;
    /// @notice Most the keeper may claim per stored byte for one renewal (wei, 18 decimals).
    uint256 public feeCap;

    event Registered(
        bytes32 indexed root,
        address indexed owner,
        uint64 size,
        uint32 chunks,
        bool isPrivate,
        string name,
        string mime,
        bytes32 parent,
        bool proven,
        bytes32 signer
    );
    event Funded(bytes32 indexed root, address indexed from, uint256 amount, uint256 balance);
    event Renewed(bytes32 indexed root, uint32 expiresAt, uint256 cost, address indexed keeper);
    event Withdrawn(bytes32 indexed root, address indexed owner, uint256 amount);
    event Transferred(bytes32 indexed root, address indexed from, address indexed to);
    event Listed(bytes32 indexed root, bool listed);
    event KeeperChanged(address keeper, uint256 feeCap);
    event SponsorChanged(address sponsor);
    /// @dev `sealedKey` is the file's AES key sealed to the recipient's X25519 inbox key.
    event Shared(bytes32 indexed root, address indexed from, address indexed to, bytes sealedKey);
    event InboxKeySet(address indexed owner, bytes32 key);

    error AlreadyRegistered();
    error UnknownFile();
    error NotOwner();
    error NotKeeper();
    error NotAdmin();
    error EmptyFile();
    error InsufficientKeepAlive();
    error TransferFailed();
    error TooEarly();
    error BadExpiry();
    error OverCap();

    constructor(address keeper_, uint256 feeCap_) {
        admin = msg.sender;
        _setKeeper(keeper_, feeCap_);
    }

    function _owned(bytes32 root) private view returns (File storage f) {
        f = files[root];
        if (f.owner == address(0)) revert UnknownFile();
        if (f.owner != msg.sender) revert NotOwner();
    }

    // ---------------------------------------------------------------- registration

    /// @notice Claim a file you just stored; any value sent is prepaid keep-alive. The caller
    /// owns it, unless the caller is the permit module, which passes the account that signed.
    /// @param owner only read when called by `sponsor`
    /// @param signer the Substrate key behind a permit, recorded in the event (zero otherwise)
    function register(Upload calldata u, Meta calldata m, address owner, bytes32 signer)
        external
        payable
        returns (bytes32 root)
    {
        if (msg.sender != sponsor) (owner, signer) = (msg.sender, bytes32(0));
        bytes memory node = u.rootNode;
        uint64 size = u.leafSize;
        uint32 chunks = 1;
        uint8 kind;
        uint8 flags = m.isPrivate ? PRIVATE | UNLISTED : 0;
        root = u.leaf;
        if (node.length > 0) {
            // A dag-pb root: hash it with Portaldot's blake2b and derive what it describes.
            root = blake2b256(node);
            UnixFs.Node memory n = UnixFs.parse(node);
            (size, chunks, kind) = (n.size, n.links, n.kind);
            flags |= PROVEN;
        }
        if (size == 0) revert EmptyFile();

        File storage f = files[root];
        if (f.owner != address(0)) revert AlreadyRegistered();
        uint32 nowBlock = uint32(block.number);
        (f.owner, f.size, f.flags, f.kind) = (owner, size, flags, kind);
        (f.chunks, f.storedAt, f.expiresAt, f.rootLen, f.keepAlive) =
            (chunks, nowBlock, nowBlock + RETENTION, uint32(node.length), uint128(msg.value));
        count++;
        emit Registered(root, owner, size, chunks, m.isPrivate, m.name, m.mime, m.parent, flags & PROVEN != 0, signer);
        if (msg.value > 0) emit Funded(root, msg.sender, msg.value, msg.value);
    }

    // ---------------------------------------------------------------- keep-alive

    /// @notice Anyone can top up a file's keep-alive balance, not only its owner.
    function fund(bytes32 root) external payable {
        File storage f = files[root];
        if (f.owner == address(0)) revert UnknownFile();
        uint128 balance = f.keepAlive + uint128(msg.value);
        f.keepAlive = balance;
        emit Funded(root, msg.sender, msg.value, balance);
    }

    /// @notice The keeper reports a renewal it paid for natively and is reimbursed. What it may
    /// claim is bounded by what the contract proved: at most feeCap per stored byte, only near
    /// expiry, and only up to one retention period from now, so at most once per period.
    function claimRenewal(bytes32 root, uint32 expiresAt, uint256 cost) external {
        if (msg.sender != keeper) revert NotKeeper();
        File storage f = files[root];
        if (f.owner == address(0)) revert UnknownFile();
        if (block.number + RENEW_WINDOW < f.expiresAt) revert TooEarly();
        if (expiresAt <= f.expiresAt || expiresAt > block.number + RETENTION) revert BadExpiry();
        if (cost > (uint256(f.size) + f.rootLen) * feeCap) revert OverCap();
        if (cost > f.keepAlive) revert InsufficientKeepAlive();
        f.keepAlive -= uint128(cost);
        f.expiresAt = expiresAt;
        emit Renewed(root, expiresAt, cost, msg.sender);
        _send(msg.sender, cost);
    }

    /// @notice Stop keeping a file alive and take back what is left.
    function withdraw(bytes32 root) external {
        File storage f = _owned(root);
        uint256 amount = f.keepAlive;
        f.keepAlive = 0;
        emit Withdrawn(root, msg.sender, amount);
        _send(msg.sender, amount);
    }

    // ---------------------------------------------------------------- ownership and sharing

    function transfer(bytes32 root, address to) external {
        _owned(root).owner = to;
        emit Transferred(root, msg.sender, to);
    }

    function setListed(bytes32 root, bool listed) external {
        File storage f = _owned(root);
        f.flags = listed ? f.flags & ~UNLISTED : f.flags | UNLISTED;
        emit Listed(root, listed);
    }

    function setInboxKey(bytes32 key) external {
        inboxKey[msg.sender] = key;
        emit InboxKeySet(msg.sender, key);
    }

    /// @notice Give `to` a private file's key, sealed to their inbox key. Owner only.
    function share(bytes32 root, address to, bytes calldata sealedKey) external {
        _owned(root);
        emit Shared(root, msg.sender, to, sealedKey);
    }

    function setKeeper(address keeper_, uint256 feeCap_) external {
        if (msg.sender != admin) revert NotAdmin();
        _setKeeper(keeper_, feeCap_);
    }

    function setSponsor(address sponsor_) external {
        if (msg.sender != admin) revert NotAdmin();
        sponsor = sponsor_;
        emit SponsorChanged(sponsor_);
    }

    function _setKeeper(address keeper_, uint256 feeCap_) private {
        (keeper, feeCap) = (keeper_, feeCap_);
        emit KeeperChanged(keeper_, feeCap_);
    }

    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
