// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SYSTEM} from "./lib/ISystem.sol";
import {UnixFs} from "./lib/UnixFs.sol";
import {Permit} from "./lib/Permit.sol";

/// @title PotDrive registry
/// @notice Ownership and keep-alive for files stored in Portaldot's native TransactionStorage.
/// The contract does not take an uploader's word for what a file is: it hashes the root block
/// with Portaldot's own blake2b-256 (the System precompile, the same hash TransactionStorage
/// indexes data under), parses the IPFS dag-pb / UnixFS structure, and records the size and
/// block count that the bytes prove. Owners can also act through readable sr25519 permits
/// signed by an ordinary Polkadot wallet, so a sponsor can register for them.
/// @dev Revive charges a storage deposit per byte, so a record is two packed slots, and names,
/// types and version links live in event logs, which cost no deposit.
contract PotDriveRegistry {
    /// @dev TransactionStorage.RetentionPeriod on Portaldot V3 (blocks, ~7 days).
    uint32 public constant RETENTION = 100_800;
    /// @dev A renewal may only be claimed this close to expiry (~2 days).
    uint32 public constant RENEW_WINDOW = 28_800;
    /// @dev Owners can dispute a claimed renewal for this long (~1 day).
    uint32 public constant CHALLENGE = 14_400;

    uint8 private constant PRIVATE = 1;
    uint8 private constant UNLISTED = 2;
    /// @dev Size and blocks were derived on chain from the root block.
    uint8 private constant PROVEN = 4;

    struct File {
        address owner; // slot 0
        uint64 size;
        uint8 flags;
        uint8 kind; // UnixFs.KIND_FILE / KIND_DIRECTORY, 0 for a single raw block
        uint32 chunks; // slot 1
        uint32 storedAt;
        uint32 expiresAt;
        uint32 rootLen; // bytes of the root block itself
        uint128 keepAlive;
    }

    struct Claim {
        uint128 cost;
        uint32 at;
        uint32 previousExpiry;
    }

    struct Meta {
        bool isPrivate;
        string name;
        string mime;
        bytes32 parent; // previous version's root, or zero
    }

    /// @dev What is being registered: a dag-pb root block (proven), or a single raw block
    /// identified by its digest and size (too large to hash in a transaction, so claimed).
    struct Upload {
        bytes rootNode;
        bytes32 leaf;
        uint64 leafSize;
    }

    mapping(bytes32 => File) private _files;
    mapping(bytes32 => Claim) public pendingClaim;
    /// @notice Next permit nonce for each Substrate public key.
    mapping(bytes32 => uint64) public nonces;
    /// @notice X25519 public keys that others can seal private-file keys to.
    mapping(address => bytes32) public inboxKey;
    uint256 public count;
    address public admin;
    address public keeper;
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
    event RenewalClaimed(bytes32 indexed root, uint32 expiresAt, uint256 cost, address indexed keeper);
    event RenewalDisputed(bytes32 indexed root, address indexed owner, uint256 cost);
    event Renewed(bytes32 indexed root, uint32 expiresAt, uint256 cost, address indexed keeper);
    event Withdrawn(bytes32 indexed root, address indexed owner, uint256 amount);
    event Transferred(bytes32 indexed root, address indexed from, address indexed to);
    event Listed(bytes32 indexed root, bool listed);
    event KeeperChanged(address keeper, uint256 feeCap);
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
    error BadSignature();
    error PermitExpired();
    error TooEarly();
    error BadExpiry();
    error OverCap();
    error ClaimPending();
    error NoClaim();
    error ChallengeOpen();
    error ChallengeOver();

    constructor(address keeper_, uint256 feeCap_) {
        admin = msg.sender;
        keeper = keeper_;
        feeCap = feeCap_;
        emit KeeperChanged(keeper_, feeCap_);
    }

    modifier onlyOwnerOf(bytes32 root) {
        address owner = _files[root].owner;
        if (owner == address(0)) revert UnknownFile();
        if (owner != msg.sender) revert NotOwner();
        _;
    }

    // ---------------------------------------------------------------- verification

    /// @notice Hashes a root block with Portaldot's blake2b-256 and decodes it.
    /// @return root the content hash TransactionStorage indexes the block under
    function inspect(bytes memory rootNode) public pure returns (bytes32 root, UnixFs.Node memory node) {
        root = SYSTEM.hashBlake256(rootNode);
        node = UnixFs.parse(rootNode);
    }

    /// @notice True if `block_` is block `index` of the file whose root block is `rootNode`.
    /// Lets any contract on Portaldot consume a stored file's bytes trustlessly.
    function proveBlock(bytes32 root, bytes calldata rootNode, uint256 index, bytes calldata block_)
        external
        pure
        returns (bool)
    {
        if (SYSTEM.hashBlake256(rootNode) != root) return false;
        (, bytes32 digest) = UnixFs.linkAt(rootNode, index);
        return SYSTEM.hashBlake256(block_) == digest;
    }

    // ---------------------------------------------------------------- registration

    /// @notice Claim a file you just stored. Any value sent is prepaid keep-alive.
    function register(Upload calldata u, Meta calldata m) external payable returns (bytes32 root) {
        root = _register(msg.sender, u, m, bytes32(0));
    }

    /// @notice The readable text `signer` signs to let anyone register this upload for them.
    /// `extra` is appended verbatim (a sponsor's own terms, e.g. the upload key and byte budget).
    function permitText(Upload calldata u, Meta calldata m, uint64 nonce, uint32 deadline, bytes calldata extra)
        public
        view
        returns (bytes memory)
    {
        (bytes32 root, uint8 codec) = _identify(u);
        bytes memory text = abi.encodePacked(
            "PotDrive: store and register a file\n",
            "cid: ",
            Permit.cid(codec, root),
            "\nname: ",
            Permit.line(m.name),
            "\ntype: ",
            Permit.line(m.mime),
            "\nprivate: ",
            m.isPrivate ? bytes("yes") : bytes("no"),
            "\nprevious: ",
            m.parent == bytes32(0) ? bytes("none") : Permit.hex32(m.parent)
        );
        text = abi.encodePacked(
            text,
            "\nregistry: ",
            Permit.hexAddress(address(this)),
            "\nchain: ",
            Permit.decimal(block.chainid),
            "\nnonce: ",
            Permit.decimal(nonce),
            "\nvalid until block: ",
            Permit.decimal(deadline)
        );
        return extra.length == 0 ? text : abi.encodePacked(text, "\n", extra);
    }

    /// @notice Register on behalf of a Polkadot account that signed `permitText` in its wallet.
    /// The owner is that account's Revive address; the caller (a sponsor) pays the fees.
    function registerFor(
        Upload calldata u,
        Meta calldata m,
        bytes32 signer,
        uint32 deadline,
        uint8[64] calldata signature,
        bytes calldata extra
    ) external payable returns (bytes32 root) {
        if (block.number > deadline) revert PermitExpired();
        uint64 nonce = nonces[signer]++;
        bytes memory text = permitText(u, m, nonce, deadline, extra);
        if (!SYSTEM.sr25519Verify(signature, Permit.wrap(text), signer)) revert BadSignature();
        root = _register(Permit.addressOf(signer), u, m, signer);
    }

    function _identify(Upload calldata u) private pure returns (bytes32 root, uint8 codec) {
        if (u.rootNode.length > 0) return (SYSTEM.hashBlake256(u.rootNode), UnixFs.DAG_PB);
        return (u.leaf, UnixFs.RAW);
    }

    function _register(address owner, Upload calldata u, Meta calldata m, bytes32 signer)
        private
        returns (bytes32 root)
    {
        uint64 size;
        uint32 chunks;
        uint8 kind;
        uint8 flags = m.isPrivate ? PRIVATE | UNLISTED : 0;
        if (u.rootNode.length > 0) {
            UnixFs.Node memory node;
            (root, node) = inspect(u.rootNode);
            (size, chunks, kind) = (node.size, node.links, node.kind);
            flags |= PROVEN;
        } else {
            (root, size, chunks) = (u.leaf, u.leafSize, 1);
        }
        if (size == 0) revert EmptyFile();
        if (_files[root].owner != address(0)) revert AlreadyRegistered();
        uint32 nowBlock = uint32(block.number);
        _files[root] = File({
            owner: owner,
            size: size,
            flags: flags,
            kind: kind,
            chunks: chunks,
            storedAt: nowBlock,
            expiresAt: nowBlock + RETENTION,
            rootLen: uint32(u.rootNode.length),
            keepAlive: uint128(msg.value)
        });
        count++;
        emit Registered(root, owner, size, chunks, m.isPrivate, m.name, m.mime, m.parent, flags & PROVEN != 0, signer);
        if (msg.value > 0) emit Funded(root, msg.sender, msg.value, msg.value);
    }

    // ---------------------------------------------------------------- keep-alive

    /// @notice Anyone can top up a file's keep-alive balance, not only its owner.
    function fund(bytes32 root) external payable {
        File storage f = _files[root];
        if (f.owner == address(0)) revert UnknownFile();
        uint128 balance = f.keepAlive + uint128(msg.value);
        f.keepAlive = balance;
        emit Funded(root, msg.sender, msg.value, balance);
    }

    /// @notice Bytes TransactionStorage holds for this file: content plus the root block.
    function storedBytes(bytes32 root) public view returns (uint256) {
        File storage f = _files[root];
        return uint256(f.size) + f.rootLen;
    }

    /// @notice The keeper reports a renewal it paid for natively. The claim is checked against
    /// what the contract proved about the file, and held for a challenge window before payout.
    function claimRenewal(bytes32 root, uint32 expiresAt, uint256 cost) external {
        if (msg.sender != keeper) revert NotKeeper();
        File storage f = _files[root];
        if (f.owner == address(0)) revert UnknownFile();
        if (pendingClaim[root].at != 0) revert ClaimPending();
        // Renewing is only useful near expiry; it extends by one retention period from now.
        if (block.number + RENEW_WINDOW < f.expiresAt) revert TooEarly();
        if (expiresAt <= f.expiresAt || expiresAt > block.number + RETENTION) revert BadExpiry();
        if (cost > storedBytes(root) * feeCap) revert OverCap();
        if (cost > f.keepAlive) revert InsufficientKeepAlive();
        f.keepAlive -= uint128(cost);
        pendingClaim[root] = Claim({cost: uint128(cost), at: uint32(block.number), previousExpiry: f.expiresAt});
        f.expiresAt = expiresAt;
        emit RenewalClaimed(root, expiresAt, cost, msg.sender);
    }

    /// @notice The owner rejects a claimed renewal (for example, the chain shows no renew).
    /// The cost returns to the file's balance and the expiry goes back.
    function dispute(bytes32 root) external onlyOwnerOf(root) {
        Claim memory c = pendingClaim[root];
        if (c.at == 0) revert NoClaim();
        if (block.number > c.at + CHALLENGE) revert ChallengeOver();
        delete pendingClaim[root];
        File storage f = _files[root];
        f.keepAlive += c.cost;
        f.expiresAt = c.previousExpiry;
        emit RenewalDisputed(root, msg.sender, c.cost);
    }

    /// @notice After the challenge window anyone can release an undisputed claim to the keeper.
    function settle(bytes32 root) external {
        Claim memory c = pendingClaim[root];
        if (c.at == 0) revert NoClaim();
        if (block.number <= c.at + CHALLENGE) revert ChallengeOpen();
        delete pendingClaim[root];
        emit Renewed(root, _files[root].expiresAt, c.cost, keeper);
        _send(keeper, c.cost);
    }

    /// @notice Stop keeping a file alive and take back what is left.
    function withdraw(bytes32 root) external onlyOwnerOf(root) {
        uint256 amount = _files[root].keepAlive;
        _files[root].keepAlive = 0;
        emit Withdrawn(root, msg.sender, amount);
        _send(msg.sender, amount);
    }

    // ---------------------------------------------------------------- ownership and sharing

    function transfer(bytes32 root, address to) external onlyOwnerOf(root) {
        _files[root].owner = to;
        emit Transferred(root, msg.sender, to);
    }

    function setListed(bytes32 root, bool listed) external onlyOwnerOf(root) {
        File storage f = _files[root];
        f.flags = listed ? f.flags & ~UNLISTED : f.flags | UNLISTED;
        emit Listed(root, listed);
    }

    function setInboxKey(bytes32 key) external {
        inboxKey[msg.sender] = key;
        emit InboxKeySet(msg.sender, key);
    }

    /// @notice Give `to` a private file's key, sealed to their inbox key. Owner only.
    function share(bytes32 root, address to, bytes calldata sealedKey) external onlyOwnerOf(root) {
        emit Shared(root, msg.sender, to, sealedKey);
    }

    function setKeeper(address keeper_, uint256 feeCap_) external {
        if (msg.sender != admin) revert NotAdmin();
        keeper = keeper_;
        feeCap = feeCap_;
        emit KeeperChanged(keeper_, feeCap_);
    }

    // ---------------------------------------------------------------- reads

    struct FileView {
        address owner;
        uint64 size;
        uint32 chunks;
        uint32 storedAt;
        uint32 expiresAt;
        uint256 keepAlive;
        bool isPrivate;
        bool listed;
        bool proven;
        uint8 kind;
        uint256 storedBytes;
    }

    function fileOf(bytes32 root) external view returns (FileView memory v) {
        File storage f = _files[root];
        v = FileView({
            owner: f.owner,
            size: f.size,
            chunks: f.chunks,
            storedAt: f.storedAt,
            expiresAt: f.expiresAt,
            keepAlive: f.keepAlive,
            isPrivate: f.flags & PRIVATE != 0,
            listed: f.flags & UNLISTED == 0,
            proven: f.flags & PROVEN != 0,
            kind: f.kind,
            storedBytes: storedBytes(root)
        });
    }

    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
