// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PotDrive registry
/// @notice Ownership and keep-alive index for files stored with Portaldot's native
/// TransactionStorage pallet. The bytes live in the chain's indexed transactions and are
/// served over IPFS bitswap; this contract records who owns which root and holds prepaid
/// POT the keeper spends to renew files before the chain drops them.
/// @dev Revive charges a storage deposit per byte, so a record is two packed slots and
/// names, types and listings live in event logs, which cost no deposit.
/// Files are keyed by the root's blake2b-256 content hash (TransactionInfo.content_hash).
contract PotDriveRegistry {
    /// @dev TransactionStorage.RetentionPeriod on Portaldot V3 (blocks).
    uint32 public constant RETENTION = 100_800;

    uint8 private constant PRIVATE = 1;
    uint8 private constant UNLISTED = 2;

    struct File {
        address owner; // slot 0
        uint64 size;
        uint8 flags;
        uint32 chunks; // slot 1
        uint32 storedAt;
        uint32 expiresAt;
        uint128 keepAlive;
    }

    mapping(bytes32 => File) private _files;
    uint256 public count;
    address public admin;
    address public keeper;

    event Registered(bytes32 indexed root, address indexed owner, uint64 size, uint32 chunks, bool isPrivate, string name, string mime);
    event Funded(bytes32 indexed root, address indexed from, uint256 amount, uint256 balance);
    event Renewed(bytes32 indexed root, uint32 expiresAt, uint256 cost, address indexed keeper);
    event Withdrawn(bytes32 indexed root, address indexed owner, uint256 amount);
    event Transferred(bytes32 indexed root, address indexed from, address indexed to);
    event Listed(bytes32 indexed root, bool listed);
    event KeeperChanged(address keeper);

    error AlreadyRegistered();
    error UnknownFile();
    error NotOwner();
    error NotKeeper();
    error NotAdmin();
    error EmptyFile();
    error InsufficientKeepAlive();
    error TransferFailed();

    constructor(address keeper_) {
        admin = msg.sender;
        keeper = keeper_;
        emit KeeperChanged(keeper_);
    }

    modifier onlyOwnerOf(bytes32 root) {
        address owner = _files[root].owner;
        if (owner == address(0)) revert UnknownFile();
        if (owner != msg.sender) revert NotOwner();
        _;
    }

    /// @notice Claim a root you just stored. Any value sent is prepaid keep-alive.
    function register(bytes32 root, uint64 size, uint32 chunks, bool isPrivate, string calldata name, string calldata mime)
        external
        payable
    {
        if (size == 0 || chunks == 0) revert EmptyFile();
        if (_files[root].owner != address(0)) revert AlreadyRegistered();
        uint32 nowBlock = uint32(block.number);
        _files[root] = File({
            owner: msg.sender,
            size: size,
            flags: isPrivate ? PRIVATE | UNLISTED : 0,
            chunks: chunks,
            storedAt: nowBlock,
            expiresAt: nowBlock + RETENTION,
            keepAlive: uint128(msg.value)
        });
        count++;
        emit Registered(root, msg.sender, size, chunks, isPrivate, name, mime);
        if (msg.value > 0) emit Funded(root, msg.sender, msg.value, msg.value);
    }

    /// @notice Anyone can top up a file's keep-alive balance, not only its owner.
    function fund(bytes32 root) external payable {
        File storage f = _files[root];
        if (f.owner == address(0)) revert UnknownFile();
        uint128 balance = f.keepAlive + uint128(msg.value);
        f.keepAlive = balance;
        emit Funded(root, msg.sender, msg.value, balance);
    }

    /// @notice The keeper reports a renewal it paid for on the native side and is reimbursed.
    function renewed(bytes32 root, uint32 expiresAt, uint256 cost) external {
        if (msg.sender != keeper) revert NotKeeper();
        File storage f = _files[root];
        if (f.owner == address(0)) revert UnknownFile();
        if (cost > f.keepAlive) revert InsufficientKeepAlive();
        f.keepAlive -= uint128(cost);
        if (expiresAt > f.expiresAt) f.expiresAt = expiresAt;
        emit Renewed(root, f.expiresAt, cost, msg.sender);
        _send(msg.sender, cost);
    }

    /// @notice Stop keeping a file alive and take back what is left.
    function withdraw(bytes32 root) external onlyOwnerOf(root) {
        uint256 amount = _files[root].keepAlive;
        _files[root].keepAlive = 0;
        emit Withdrawn(root, msg.sender, amount);
        _send(msg.sender, amount);
    }

    function transfer(bytes32 root, address to) external onlyOwnerOf(root) {
        _files[root].owner = to;
        emit Transferred(root, msg.sender, to);
    }

    function setListed(bytes32 root, bool listed) external onlyOwnerOf(root) {
        File storage f = _files[root];
        f.flags = listed ? f.flags & ~UNLISTED : f.flags | UNLISTED;
        emit Listed(root, listed);
    }

    function setKeeper(address keeper_) external {
        if (msg.sender != admin) revert NotAdmin();
        keeper = keeper_;
        emit KeeperChanged(keeper_);
    }

    /// @return owner, size, chunks, storedAt, expiresAt, keepAlive (wei), isPrivate, listed
    function fileOf(bytes32 root)
        external
        view
        returns (address, uint64, uint32, uint32, uint32, uint256, bool, bool)
    {
        File storage f = _files[root];
        return (f.owner, f.size, f.chunks, f.storedAt, f.expiresAt, f.keepAlive, f.flags & PRIVATE != 0, f.flags & UNLISTED == 0);
    }

    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
