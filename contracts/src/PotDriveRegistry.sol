// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PotDrive registry
/// @notice Ownership and keep-alive index for files stored with Portaldot's native
/// TransactionStorage pallet. The bytes live in the chain's indexed transactions and are
/// served over IPFS bitswap; this contract records who owns which root, and holds
/// prepaid POT that the keeper spends to renew files before the chain drops them.
/// @dev Files are keyed by the root's 32-byte blake2b-256 content hash, the same value
/// TransactionStorage writes into TransactionInfo.content_hash.
contract PotDriveRegistry {
    /// @dev TransactionStorage.RetentionPeriod on Portaldot V3 (blocks).
    uint32 public constant RETENTION = 100_800;

    struct File {
        address owner;
        uint64 size;
        uint32 chunks;
        uint32 storedAt;
        uint32 expiresAt;
        bool isPrivate;
        bool listed;
        string name;
        string mime;
    }

    mapping(bytes32 => File) private _files;
    mapping(bytes32 => uint256) public keepAlive;
    mapping(address => bytes32[]) private _owned;
    bytes32[] private _all;

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
        if (_files[root].owner == address(0)) revert UnknownFile();
        if (_files[root].owner != msg.sender) revert NotOwner();
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
            chunks: chunks,
            storedAt: nowBlock,
            expiresAt: nowBlock + RETENTION,
            isPrivate: isPrivate,
            listed: !isPrivate,
            name: name,
            mime: mime
        });
        _owned[msg.sender].push(root);
        _all.push(root);
        emit Registered(root, msg.sender, size, chunks, isPrivate, name, mime);
        if (msg.value > 0) {
            keepAlive[root] = msg.value;
            emit Funded(root, msg.sender, msg.value, msg.value);
        }
    }

    /// @notice Anyone can top up a file's keep-alive balance, not only its owner.
    function fund(bytes32 root) external payable {
        if (_files[root].owner == address(0)) revert UnknownFile();
        uint256 balance = keepAlive[root] + msg.value;
        keepAlive[root] = balance;
        emit Funded(root, msg.sender, msg.value, balance);
    }

    /// @notice The keeper reports a renewal it paid for on the native side and is reimbursed.
    function renewed(bytes32 root, uint32 expiresAt, uint256 cost) external {
        if (msg.sender != keeper) revert NotKeeper();
        File storage f = _files[root];
        if (f.owner == address(0)) revert UnknownFile();
        uint256 balance = keepAlive[root];
        if (cost > balance) revert InsufficientKeepAlive();
        keepAlive[root] = balance - cost;
        if (expiresAt > f.expiresAt) f.expiresAt = expiresAt;
        emit Renewed(root, f.expiresAt, cost, msg.sender);
        _send(msg.sender, cost);
    }

    /// @notice Stop keeping a file alive and take back what is left.
    function withdraw(bytes32 root) external onlyOwnerOf(root) {
        uint256 amount = keepAlive[root];
        keepAlive[root] = 0;
        emit Withdrawn(root, msg.sender, amount);
        _send(msg.sender, amount);
    }

    function transfer(bytes32 root, address to) external onlyOwnerOf(root) {
        _files[root].owner = to;
        _owned[to].push(root);
        emit Transferred(root, msg.sender, to);
    }

    function setListed(bytes32 root, bool listed) external onlyOwnerOf(root) {
        _files[root].listed = listed;
        emit Listed(root, listed);
    }

    function setKeeper(address keeper_) external {
        if (msg.sender != admin) revert NotAdmin();
        keeper = keeper_;
        emit KeeperChanged(keeper_);
    }

    // ---- views ----

    function fileOf(bytes32 root) external view returns (File memory) {
        return _files[root];
    }

    function count() external view returns (uint256) {
        return _all.length;
    }

    /// @notice Roots currently owned by `owner` (transferred-away roots are filtered out).
    function filesOf(address owner) external view returns (bytes32[] memory roots, File[] memory files) {
        bytes32[] storage all = _owned[owner];
        uint256 n;
        for (uint256 i = 0; i < all.length; i++) if (_files[all[i]].owner == owner) n++;
        roots = new bytes32[](n);
        files = new File[](n);
        uint256 j;
        for (uint256 i = 0; i < all.length; i++) {
            if (_files[all[i]].owner == owner) {
                roots[j] = all[i];
                files[j] = _files[all[i]];
                j++;
            }
        }
    }

    /// @notice Newest first. Includes unlisted files; callers filter on `listed`.
    function page(uint256 offset, uint256 limit) external view returns (bytes32[] memory roots, File[] memory files, uint256[] memory balances) {
        uint256 total = _all.length;
        if (offset >= total) return (roots, files, balances);
        uint256 n = total - offset < limit ? total - offset : limit;
        roots = new bytes32[](n);
        files = new File[](n);
        balances = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            bytes32 r = _all[total - 1 - offset - i];
            roots[i] = r;
            files[i] = _files[r];
            balances[i] = keepAlive[r];
        }
    }

    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
