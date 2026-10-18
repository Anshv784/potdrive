// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PotDriveRegistry} from "../src/PotDriveRegistry.sol";
import {PotDriveVerifier, PotDriveCheck} from "../src/PotDriveVerifier.sol";
import {PotDrivePermits, IRegistry} from "../src/PotDrivePermits.sol";
import {Upload, Meta} from "../src/lib/Types.sol";
import {UnixFs} from "../src/lib/UnixFs.sol";
import {Permit} from "../src/lib/Permit.sol";
import {SYSTEM} from "../src/lib/ISystem.sol";
import {MockSystem} from "./MockSystem.sol";
import {Fixtures as F} from "./Fixtures.sol";

interface Vm {
    function prank(address) external;
    function deal(address, uint256) external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes calldata) external;
    function expectRevert() external;
    function roll(uint256) external;
    function etch(address, bytes calldata) external;
    function chainId(uint256) external;
}

contract PotDriveRegistryTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    PotDriveRegistry reg;
    PotDriveVerifier ver;
    address keeper = address(0xBEEF);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    /// @dev wei per stored byte: ~0.111 tPOT/KiB measured, with headroom.
    uint256 constant CAP = 2e14;
    bytes32 constant LEAF = keccak256("a single raw block");

    function setUp() public {
        vm.etch(address(SYSTEM), type(MockSystem).runtimeCode);
        vm.chainId(420420777);
        reg = new PotDriveRegistry(keeper, CAP);
        ver = new PotDriveVerifier();
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.roll(1000);
    }

    function _eq(uint256 a, uint256 b) internal pure {
        require(a == b, "not equal");
    }

    function _meta() internal pure returns (Meta memory) {
        return Meta({isPrivate: false, name: "deck.pdf", mime: "application/pdf", parent: bytes32(0)});
    }

    function _node(bytes memory n) internal pure returns (Upload memory) {
        return Upload({rootNode: n, leaf: bytes32(0), leafSize: 0});
    }

    function _leaf(uint64 size) internal pure returns (Upload memory) {
        return Upload({rootNode: "", leaf: LEAF, leafSize: size});
    }

    struct V {
        address owner;
        uint64 size;
        uint8 flags;
        uint8 kind;
        uint32 chunks;
        uint32 storedAt;
        uint32 expiresAt;
        uint32 rootLen;
        uint128 keepAlive;
    }

    function _file(PotDriveRegistry r, bytes32 root) internal view returns (V memory v) {
        (v.owner, v.size, v.flags, v.kind, v.chunks, v.storedAt, v.expiresAt, v.rootLen, v.keepAlive) = r.files(root);
    }

    function _sig() internal pure returns (bytes memory) {
        return F.SIGNATURE;
    }

    function _sigArray() internal pure returns (uint8[64] memory s) {
        bytes memory b = F.SIGNATURE;
        for (uint256 i; i < 64; i++) {
            s[i] = uint8(b[i]);
        }
    }

    // ------------------------------------------------------------ hashing and decoding

    function test_blake2bMatchesPortaldot() public view {
        // Value returned by Portaldot V3's System precompile for "potdrive".
        require(
            SYSTEM.hashBlake256("potdrive") == 0x5663f5036daacd8b6759531e7cbf7bcbcd746c5e60d7485159332b2944129707,
            "blake2b"
        );
        require(SYSTEM.hashBlake256(F.FILE_NODE) == F.FILE_ROOT, "root digest");
    }

    function test_inspectFileProvesSizeAndBlocks() public view {
        (bytes32 root, UnixFs.Node memory n) = ver.inspect(F.FILE_NODE);
        require(root == F.FILE_ROOT, "root");
        _eq(n.kind, UnixFs.KIND_FILE);
        _eq(n.size, F.FILE_SIZE);
        _eq(n.links, F.FILE_CHUNKS);
    }

    function test_inspectDirectory() public view {
        (bytes32 root, UnixFs.Node memory n) = ver.inspect(F.DIR_NODE);
        require(root == F.DIR_ROOT, "root");
        _eq(n.kind, UnixFs.KIND_DIRECTORY);
        _eq(n.size, F.DIR_SIZE);
        _eq(n.links, F.DIR_LINKS);
    }

    function test_rejectsBlockSizesThatDoNotMatchLinks() public {
        vm.expectRevert(UnixFs.SizeMismatch.selector);
        ver.inspect(F.LYING_SIZES);
    }

    function test_rejectsLinksThatAreNotBlake2b() public {
        vm.expectRevert(abi.encodeWithSelector(UnixFs.BadLink.selector, 0));
        ver.inspect(F.WRONG_HASH);
    }

    function test_rejectsUnsortedDirectories() public {
        vm.expectRevert(abi.encodeWithSelector(UnixFs.NotCanonical.selector, 1));
        ver.inspect(F.UNSORTED_DIR);
    }

    function test_rejectsGarbage() public {
        vm.expectRevert();
        ver.inspect(hex"0a0b0c");
    }

    function test_proveBlock() public view {
        require(ver.proveBlock(F.FILE_ROOT, F.FILE_NODE, 1, F.LEAF_1), "leaf 1");
        require(!ver.proveBlock(F.FILE_ROOT, F.FILE_NODE, 0, F.LEAF_1), "leaf 0 is different");
        require(!ver.proveBlock(F.DIR_ROOT, F.FILE_NODE, 1, F.LEAF_1), "wrong root");
    }

    // ------------------------------------------------------------ registration

    uint8 constant PROVEN = 4;

    function test_registerRecordsWhatTheBytesProve() public {
        vm.prank(alice);
        bytes32 root = reg.register{value: 3 ether}(_node(F.FILE_NODE), _meta(), address(0), bytes32(0));
        require(root == F.FILE_ROOT, "keyed by content hash");
        V memory v = _file(reg, root);
        require(v.owner == alice && v.flags & PROVEN != 0, "owner, proven");
        _eq(v.size, F.FILE_SIZE);
        _eq(v.chunks, F.FILE_CHUNKS);
        _eq(v.kind, UnixFs.KIND_FILE);
        _eq(v.rootLen, F.FILE_NODE.length);
        _eq(v.expiresAt, 1000 + reg.RETENTION());
        _eq(v.keepAlive, 3 ether);
        _eq(v.flags & 3, 0); // public, listed
        _eq(reg.count(), 1);
    }

    function test_registerDirectory() public {
        reg.register(_node(F.DIR_NODE), _meta(), address(0), bytes32(0));
        V memory v = _file(reg, F.DIR_ROOT);
        _eq(v.kind, UnixFs.KIND_DIRECTORY);
        _eq(v.size, F.DIR_SIZE);
    }

    function test_registerRefusesMalformedRoots() public {
        vm.expectRevert(UnixFs.SizeMismatch.selector);
        reg.register(_node(F.LYING_SIZES), _meta(), address(0), bytes32(0));
    }

    function test_singleBlockFilesAreClaimedNotProven() public {
        vm.prank(alice);
        reg.register(_leaf(4096), _meta(), address(0), bytes32(0));
        V memory v = _file(reg, LEAF);
        require(v.owner == alice && v.flags & PROVEN == 0, "claimed");
        _eq(v.size, 4096);
        _eq(v.chunks, 1);
    }

    function test_privateFilesUnlisted() public {
        Meta memory m = _meta();
        m.isPrivate = true;
        vm.prank(alice);
        reg.register(_node(F.FILE_NODE), m, address(0), bytes32(0));
        _eq(_file(reg, F.FILE_ROOT).flags & 3, 3);
    }

    function test_cannotRegisterTwice() public {
        vm.prank(alice);
        reg.register(_node(F.FILE_NODE), _meta(), address(0), bytes32(0));
        vm.prank(bob);
        vm.expectRevert(PotDriveRegistry.AlreadyRegistered.selector);
        reg.register(_node(F.FILE_NODE), _meta(), address(0), bytes32(0));
    }

    function test_rejectsEmptyLeaf() public {
        vm.expectRevert(PotDriveRegistry.EmptyFile.selector);
        reg.register(_leaf(0), _meta(), address(0), bytes32(0));
    }

    // ------------------------------------------------------------ sr25519 permits

    /// @dev The signed text names the registry, so put one at the fixture's address and wire
    /// a permit module to it. (Etched code has empty storage, so admin is address(0).)
    function _permits() internal returns (PotDriveRegistry r, PotDrivePermits p) {
        vm.etch(F.REGISTRY, address(reg).code);
        r = PotDriveRegistry(F.REGISTRY);
        p = new PotDrivePermits(IRegistry(F.REGISTRY));
        vm.prank(address(0));
        r.setSponsor(address(p));
    }

    function test_permitTextMatchesTheSdk() public {
        PotDrivePermits p = new PotDrivePermits(IRegistry(F.REGISTRY));
        bytes memory text = p.permitText(_node(F.FILE_NODE), _meta(), F.SIGNER, F.DEADLINE, F.EXTRA);
        require(keccak256(text) == keccak256(Permit.wrap(F.PERMIT_TEXT)), "same text as sdk/src/permit.ts");
    }

    function test_cidTextMatchesTheSdk() public pure {
        require(keccak256(Permit.cid(UnixFs.DAG_PB, F.FILE_ROOT)) == keccak256(bytes(F.FILE_CID)), "base32 CID");
    }

    function test_addressOfMatchesRevive() public pure {
        require(Permit.addressOf(F.SIGNER) == F.SIGNER_ADDRESS, "keccak mapping");
        bytes32 ethDerived = bytes32(abi.encodePacked(address(0xA11CE), bytes12(0xeeeeeeeeeeeeeeeeeeeeeeee)));
        require(Permit.addressOf(ethDerived) == address(0xA11CE), "eth-derived");
    }

    function test_registerForWithAWalletSignature() public {
        (PotDriveRegistry r, PotDrivePermits p) = _permits();
        MockSystem(address(SYSTEM)).allow(_sigArray(), Permit.wrap(F.PERMIT_TEXT), F.SIGNER);
        vm.prank(bob); // a sponsor pays; the signer owns
        p.register(_node(F.FILE_NODE), _meta(), F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
        V memory v = _file(r, F.FILE_ROOT);
        require(v.owner == F.SIGNER_ADDRESS && v.flags & PROVEN != 0, "owned by the signer");
        _eq(p.nonces(F.SIGNER), 1);
    }

    function test_onlyTheSponsorRegistersForOthers() public {
        vm.prank(bob);
        reg.register(_node(F.FILE_NODE), _meta(), alice, keccak256("not a signer"));
        V memory v = _file(reg, F.FILE_ROOT);
        require(v.owner == bob, "a stranger cannot assign ownership");
    }

    function test_permitCannotBeReplayed() public {
        (PotDriveRegistry r, PotDrivePermits p) = _permits();
        MockSystem(address(SYSTEM)).allow(_sigArray(), Permit.wrap(F.PERMIT_TEXT), F.SIGNER);
        p.register(_node(F.FILE_NODE), _meta(), F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
        // nonce is now 1, so the same signature no longer matches the text
        vm.expectRevert(PotDrivePermits.BadSignature.selector);
        p.register(_node(F.FILE_NODE), _meta(), F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
    }

    function test_permitBindsEveryField() public {
        (PotDriveRegistry r, PotDrivePermits p) = _permits();
        MockSystem(address(SYSTEM)).allow(_sigArray(), Permit.wrap(F.PERMIT_TEXT), F.SIGNER);
        Meta memory m = _meta();
        m.name = "renamed.pdf";
        vm.expectRevert(PotDrivePermits.BadSignature.selector);
        p.register(_node(F.FILE_NODE), m, F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
    }

    function test_permitExpires() public {
        (PotDriveRegistry r, PotDrivePermits p) = _permits();
        vm.roll(F.DEADLINE + 1);
        vm.expectRevert(PotDrivePermits.PermitExpired.selector);
        p.register(_node(F.FILE_NODE), _meta(), F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
    }

    function test_namesCannotInjectLines() public {
        Meta memory m = _meta();
        m.name = "a\nnonce: 9";
        vm.expectRevert(Permit.BadText.selector);
        new PotDrivePermits(IRegistry(F.REGISTRY)).permitText(_node(F.FILE_NODE), m, F.SIGNER, 1, "");
    }

    // ------------------------------------------------------------ one-shot check (eth_call)

    function test_checkReportsWhatTheChainSees() public {
        bytes memory code = abi.encodePacked(
            type(PotDriveCheck).creationCode, abi.encode(F.FILE_NODE, true, bytes32(0), bytes(""), bytes(""))
        );
        address at;
        assembly {
            at := create(0, add(code, 0x20), mload(code))
        }
        // The constructor returns the report as "runtime code".
        PotDriveCheck.Report memory r = abi.decode(at.code, (PotDriveCheck.Report));
        require(r.root == F.FILE_ROOT, "root");
        _eq(r.kind, UnixFs.KIND_FILE);
        _eq(r.size, F.FILE_SIZE);
        _eq(r.links, F.FILE_CHUNKS);
        _eq(r.chainId, 420420777);
    }

    // ------------------------------------------------------------ keeper

    function _registered() internal returns (uint32 expiresAt) {
        vm.prank(alice);
        reg.register{value: 10 ether}(_node(F.FILE_NODE), _meta(), address(0), bytes32(0));
        expiresAt = _file(reg, F.FILE_ROOT).expiresAt;
    }

    function test_claimTooEarly() public {
        uint32 exp = _registered();
        uint32 next = exp + reg.RETENTION();
        vm.prank(keeper);
        vm.expectRevert(PotDriveRegistry.TooEarly.selector);
        reg.claimRenewal(F.FILE_ROOT, next, 1);
    }

    function test_claimIsCappedByProvenSize() public {
        uint32 exp = _registered();
        vm.roll(exp - 100);
        uint256 cap = (F.FILE_SIZE + F.FILE_NODE.length) * CAP;
        uint32 next = uint32(block.number) + reg.RETENTION();
        vm.prank(keeper);
        vm.expectRevert(PotDriveRegistry.OverCap.selector);
        reg.claimRenewal(F.FILE_ROOT, next, cap + 1);
    }

    function test_claimExpiryMustBeReachable() public {
        uint32 exp = _registered();
        vm.roll(exp - 100);
        uint32 tooFar = uint32(block.number) + reg.RETENTION() + 1;
        vm.prank(keeper);
        vm.expectRevert(PotDriveRegistry.BadExpiry.selector);
        reg.claimRenewal(F.FILE_ROOT, tooFar, 1);
    }

    function test_onlyKeeperClaims() public {
        _registered();
        vm.prank(bob);
        vm.expectRevert(PotDriveRegistry.NotKeeper.selector);
        reg.claimRenewal(F.FILE_ROOT, 1, 1);
    }

    function test_claimPaysTheKeeperOncePerPeriod() public {
        uint32 exp = _registered();
        vm.roll(exp - 100);
        uint32 next = uint32(block.number) + reg.RETENTION();
        uint256 before = keeper.balance;
        vm.prank(keeper);
        reg.claimRenewal(F.FILE_ROOT, next, 0.5 ether);
        _eq(keeper.balance - before, 0.5 ether);
        V memory v = _file(reg, F.FILE_ROOT);
        _eq(v.expiresAt, next);
        _eq(v.keepAlive, 9.5 ether);
        // the file is now far from expiry, so a second claim is refused
        vm.prank(keeper);
        vm.expectRevert(PotDriveRegistry.TooEarly.selector);
        reg.claimRenewal(F.FILE_ROOT, next + 1, 0.5 ether);
    }

    // ------------------------------------------------------------ ownership

    function test_fundWithdrawTransferShare() public {
        _registered();
        vm.prank(bob);
        reg.fund{value: 1 ether}(F.FILE_ROOT);
        _eq(_file(reg, F.FILE_ROOT).keepAlive, 11 ether);

        vm.prank(bob);
        vm.expectRevert(PotDriveRegistry.NotOwner.selector);
        reg.withdraw(F.FILE_ROOT);

        uint256 before = alice.balance;
        vm.prank(alice);
        reg.withdraw(F.FILE_ROOT);
        _eq(alice.balance - before, 11 ether);

        vm.prank(alice);
        reg.transfer(F.FILE_ROOT, bob);
        require(_file(reg, F.FILE_ROOT).owner == bob, "transferred");

        vm.prank(bob);
        reg.share(F.FILE_ROOT, alice, hex"0102");
        vm.prank(bob);
        reg.setListed(F.FILE_ROOT, false);
        _eq(_file(reg, F.FILE_ROOT).flags & 2, 2);
    }

    function test_adminSetsKeeperAndCap() public {
        vm.prank(bob);
        vm.expectRevert(PotDriveRegistry.NotAdmin.selector);
        reg.setKeeper(bob, 1);
        reg.setKeeper(bob, 1);
        require(reg.keeper() == bob, "keeper");
        _eq(reg.feeCap(), 1);
    }
}
