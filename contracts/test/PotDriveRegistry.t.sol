// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PotDriveRegistry} from "../src/PotDriveRegistry.sol";
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
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.roll(1000);
    }

    function _eq(uint256 a, uint256 b) internal pure {
        require(a == b, "not equal");
    }

    function _meta() internal pure returns (PotDriveRegistry.Meta memory) {
        return PotDriveRegistry.Meta({isPrivate: false, name: "deck.pdf", mime: "application/pdf", parent: bytes32(0)});
    }

    function _node(bytes memory n) internal pure returns (PotDriveRegistry.Upload memory) {
        return PotDriveRegistry.Upload({rootNode: n, leaf: bytes32(0), leafSize: 0});
    }

    function _leaf(uint64 size) internal pure returns (PotDriveRegistry.Upload memory) {
        return PotDriveRegistry.Upload({rootNode: "", leaf: LEAF, leafSize: size});
    }

    function _sig() internal pure returns (uint8[64] memory s) {
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
        (bytes32 root, UnixFs.Node memory n) = reg.inspect(F.FILE_NODE);
        require(root == F.FILE_ROOT, "root");
        _eq(n.kind, UnixFs.KIND_FILE);
        _eq(n.size, F.FILE_SIZE);
        _eq(n.links, F.FILE_CHUNKS);
    }

    function test_inspectDirectory() public view {
        (bytes32 root, UnixFs.Node memory n) = reg.inspect(F.DIR_NODE);
        require(root == F.DIR_ROOT, "root");
        _eq(n.kind, UnixFs.KIND_DIRECTORY);
        _eq(n.size, F.DIR_SIZE);
        _eq(n.links, F.DIR_LINKS);
    }

    function test_rejectsBlockSizesThatDoNotMatchLinks() public {
        vm.expectRevert(UnixFs.SizeMismatch.selector);
        reg.inspect(F.LYING_SIZES);
    }

    function test_rejectsLinksThatAreNotBlake2b() public {
        vm.expectRevert(abi.encodeWithSelector(UnixFs.BadLink.selector, 0));
        reg.inspect(F.WRONG_HASH);
    }

    function test_rejectsUnsortedDirectories() public {
        vm.expectRevert(abi.encodeWithSelector(UnixFs.NotCanonical.selector, 1));
        reg.inspect(F.UNSORTED_DIR);
    }

    function test_rejectsGarbage() public {
        vm.expectRevert();
        reg.inspect(hex"0a0b0c");
    }

    function test_proveBlock() public view {
        require(reg.proveBlock(F.FILE_ROOT, F.FILE_NODE, 1, F.LEAF_1), "leaf 1");
        require(!reg.proveBlock(F.FILE_ROOT, F.FILE_NODE, 0, F.LEAF_1), "leaf 0 is different");
        require(!reg.proveBlock(F.DIR_ROOT, F.FILE_NODE, 1, F.LEAF_1), "wrong root");
    }

    // ------------------------------------------------------------ registration

    function test_registerRecordsWhatTheBytesProve() public {
        vm.prank(alice);
        bytes32 root = reg.register{value: 3 ether}(_node(F.FILE_NODE), _meta());
        require(root == F.FILE_ROOT, "keyed by content hash");
        PotDriveRegistry.FileView memory v = reg.fileOf(root);
        require(v.owner == alice && v.proven, "owner, proven");
        _eq(v.size, F.FILE_SIZE);
        _eq(v.chunks, F.FILE_CHUNKS);
        _eq(v.kind, UnixFs.KIND_FILE);
        _eq(v.storedBytes, F.FILE_SIZE + F.FILE_NODE.length);
        _eq(v.expiresAt, 1000 + reg.RETENTION());
        _eq(v.keepAlive, 3 ether);
        require(!v.isPrivate && v.listed, "public, listed");
    }

    function test_singleBlockFilesAreClaimedNotProven() public {
        vm.prank(alice);
        reg.register(_leaf(4096), _meta());
        PotDriveRegistry.FileView memory v = reg.fileOf(LEAF);
        require(v.owner == alice && !v.proven, "claimed");
        _eq(v.size, 4096);
        _eq(v.chunks, 1);
    }

    function test_privateFilesUnlisted() public {
        PotDriveRegistry.Meta memory m = _meta();
        m.isPrivate = true;
        vm.prank(alice);
        reg.register(_node(F.FILE_NODE), m);
        PotDriveRegistry.FileView memory v = reg.fileOf(F.FILE_ROOT);
        require(v.isPrivate && !v.listed, "private, unlisted");
    }

    function test_cannotRegisterTwice() public {
        vm.prank(alice);
        reg.register(_node(F.FILE_NODE), _meta());
        vm.prank(bob);
        vm.expectRevert(PotDriveRegistry.AlreadyRegistered.selector);
        reg.register(_node(F.FILE_NODE), _meta());
    }

    function test_rejectsEmptyLeaf() public {
        vm.expectRevert(PotDriveRegistry.EmptyFile.selector);
        reg.register(_leaf(0), _meta());
    }

    // ------------------------------------------------------------ sr25519 permits

    function _atFixtureAddress() internal returns (PotDriveRegistry r) {
        vm.etch(F.REGISTRY, address(reg).code);
        r = PotDriveRegistry(F.REGISTRY);
    }

    function test_permitTextMatchesTheSdk() public {
        PotDriveRegistry r = _atFixtureAddress();
        bytes memory text = r.permitText(_node(F.FILE_NODE), _meta(), 0, F.DEADLINE, F.EXTRA);
        require(keccak256(text) == keccak256(F.PERMIT_TEXT), "same text as sdk/src/permit.ts");
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
        PotDriveRegistry r = _atFixtureAddress();
        MockSystem(address(SYSTEM)).allow(_sig(), Permit.wrap(F.PERMIT_TEXT), F.SIGNER);
        vm.prank(bob); // a sponsor pays; the signer owns
        r.registerFor(_node(F.FILE_NODE), _meta(), F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
        PotDriveRegistry.FileView memory v = r.fileOf(F.FILE_ROOT);
        require(v.owner == F.SIGNER_ADDRESS && v.proven, "owned by the signer");
        _eq(r.nonces(F.SIGNER), 1);
    }

    function test_permitCannotBeReplayed() public {
        PotDriveRegistry r = _atFixtureAddress();
        MockSystem(address(SYSTEM)).allow(_sig(), Permit.wrap(F.PERMIT_TEXT), F.SIGNER);
        r.registerFor(_node(F.FILE_NODE), _meta(), F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
        // nonce is now 1, so the same signature no longer matches the text
        vm.expectRevert(PotDriveRegistry.BadSignature.selector);
        r.registerFor(_node(F.FILE_NODE), _meta(), F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
    }

    function test_permitBindsEveryField() public {
        PotDriveRegistry r = _atFixtureAddress();
        MockSystem(address(SYSTEM)).allow(_sig(), Permit.wrap(F.PERMIT_TEXT), F.SIGNER);
        PotDriveRegistry.Meta memory m = _meta();
        m.name = "renamed.pdf";
        vm.expectRevert(PotDriveRegistry.BadSignature.selector);
        r.registerFor(_node(F.FILE_NODE), m, F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
    }

    function test_permitExpires() public {
        PotDriveRegistry r = _atFixtureAddress();
        vm.roll(F.DEADLINE + 1);
        vm.expectRevert(PotDriveRegistry.PermitExpired.selector);
        r.registerFor(_node(F.FILE_NODE), _meta(), F.SIGNER, F.DEADLINE, _sig(), F.EXTRA);
    }

    function test_namesCannotInjectLines() public {
        PotDriveRegistry.Meta memory m = _meta();
        m.name = "a\nnonce: 9";
        vm.expectRevert(Permit.BadText.selector);
        reg.permitText(_node(F.FILE_NODE), m, 0, 1, "");
    }

    // ------------------------------------------------------------ keeper

    function _registered() internal returns (uint32 expiresAt) {
        vm.prank(alice);
        reg.register{value: 10 ether}(_node(F.FILE_NODE), _meta());
        expiresAt = reg.fileOf(F.FILE_ROOT).expiresAt;
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
        uint256 cap = reg.storedBytes(F.FILE_ROOT) * CAP;
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

    function test_claimSettlesAfterChallenge() public {
        uint32 exp = _registered();
        vm.roll(exp - 100);
        uint32 next = uint32(block.number) + reg.RETENTION();
        vm.prank(keeper);
        reg.claimRenewal(F.FILE_ROOT, next, 0.5 ether);
        _eq(reg.fileOf(F.FILE_ROOT).expiresAt, next);
        _eq(reg.fileOf(F.FILE_ROOT).keepAlive, 9.5 ether);

        vm.prank(keeper);
        vm.expectRevert(PotDriveRegistry.ClaimPending.selector);
        reg.claimRenewal(F.FILE_ROOT, next, 1);

        vm.expectRevert(PotDriveRegistry.ChallengeOpen.selector);
        reg.settle(F.FILE_ROOT);

        vm.roll(block.number + reg.CHALLENGE() + 1);
        uint256 before = keeper.balance;
        reg.settle(F.FILE_ROOT); // anyone can settle
        _eq(keeper.balance - before, 0.5 ether);
    }

    function test_ownerDisputesAClaim() public {
        uint32 exp = _registered();
        vm.roll(exp - 100);
        uint32 next = uint32(block.number) + reg.RETENTION();
        vm.prank(keeper);
        reg.claimRenewal(F.FILE_ROOT, next, 0.5 ether);
        vm.prank(alice);
        reg.dispute(F.FILE_ROOT);
        PotDriveRegistry.FileView memory v = reg.fileOf(F.FILE_ROOT);
        _eq(v.keepAlive, 10 ether);
        _eq(v.expiresAt, exp);
        vm.expectRevert(PotDriveRegistry.NoClaim.selector);
        reg.settle(F.FILE_ROOT);
    }

    function test_disputeWindowCloses() public {
        uint32 exp = _registered();
        vm.roll(exp - 100);
        uint32 next = uint32(block.number) + reg.RETENTION();
        vm.prank(keeper);
        reg.claimRenewal(F.FILE_ROOT, next, 0.5 ether);
        vm.roll(block.number + reg.CHALLENGE() + 1);
        vm.prank(alice);
        vm.expectRevert(PotDriveRegistry.ChallengeOver.selector);
        reg.dispute(F.FILE_ROOT);
    }

    // ------------------------------------------------------------ ownership

    function test_fundWithdrawTransferShare() public {
        _registered();
        vm.prank(bob);
        reg.fund{value: 1 ether}(F.FILE_ROOT);
        _eq(reg.fileOf(F.FILE_ROOT).keepAlive, 11 ether);

        vm.prank(bob);
        vm.expectRevert(PotDriveRegistry.NotOwner.selector);
        reg.withdraw(F.FILE_ROOT);

        uint256 before = alice.balance;
        vm.prank(alice);
        reg.withdraw(F.FILE_ROOT);
        _eq(alice.balance - before, 11 ether);

        vm.prank(alice);
        reg.transfer(F.FILE_ROOT, bob);
        require(reg.fileOf(F.FILE_ROOT).owner == bob, "transferred");

        vm.prank(bob);
        reg.share(F.FILE_ROOT, alice, hex"0102");
        vm.prank(bob);
        reg.setListed(F.FILE_ROOT, false);
        require(!reg.fileOf(F.FILE_ROOT).listed, "unlisted");
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
