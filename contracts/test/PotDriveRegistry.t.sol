// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PotDriveRegistry} from "../src/PotDriveRegistry.sol";

interface Vm {
    function prank(address) external;
    function deal(address, uint256) external;
    function expectRevert(bytes4) external;
    function roll(uint256) external;
}

contract PotDriveRegistryTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    PotDriveRegistry reg;
    address keeper = address(0xBEEF);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    bytes32 constant ROOT = keccak256("root");

    function setUp() public {
        reg = new PotDriveRegistry(keeper);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.roll(1000);
    }

    function _eq(uint256 a, uint256 b) internal pure {
        require(a == b, "not equal");
    }

    function test_registerSetsOwnerAndExpiry() public {
        vm.prank(alice);
        reg.register{value: 3 ether}(ROOT, 2_000_000, 3, false, "deck.pdf", "application/pdf");
        PotDriveRegistry.File memory f = reg.fileOf(ROOT);
        require(f.owner == alice, "owner");
        _eq(f.size, 2_000_000);
        _eq(f.chunks, 3);
        _eq(f.storedAt, 1000);
        _eq(f.expiresAt, 1000 + reg.RETENTION());
        require(f.listed, "public files listed");
        _eq(reg.keepAlive(ROOT), 3 ether);
        _eq(reg.count(), 1);
    }

    function test_privateFilesUnlistedByDefault() public {
        vm.prank(alice);
        reg.register(ROOT, 10, 1, true, "", "application/octet-stream");
        require(!reg.fileOf(ROOT).listed, "private unlisted");
    }

    function test_cannotRegisterTwice() public {
        vm.prank(alice);
        reg.register(ROOT, 10, 1, false, "a", "b");
        vm.prank(bob);
        vm.expectRevert(PotDriveRegistry.AlreadyRegistered.selector);
        reg.register(ROOT, 10, 1, false, "a", "b");
    }

    function test_rejectsEmpty() public {
        vm.prank(alice);
        vm.expectRevert(PotDriveRegistry.EmptyFile.selector);
        reg.register(ROOT, 0, 1, false, "a", "b");
    }

    function test_anyoneCanFund_keeperIsReimbursed() public {
        vm.prank(alice);
        reg.register(ROOT, 10, 1, false, "a", "b");
        vm.prank(bob);
        reg.fund{value: 5 ether}(ROOT);
        uint256 before = keeper.balance;
        uint32 next = 1000 + 2 * reg.RETENTION();
        vm.prank(keeper);
        reg.renewed(ROOT, next, 2 ether);
        _eq(keeper.balance - before, 2 ether);
        _eq(reg.keepAlive(ROOT), 3 ether);
        _eq(reg.fileOf(ROOT).expiresAt, 1000 + 2 * reg.RETENTION());
    }

    function test_onlyKeeperRenews() public {
        vm.prank(alice);
        reg.register{value: 1 ether}(ROOT, 10, 1, false, "a", "b");
        vm.prank(alice);
        vm.expectRevert(PotDriveRegistry.NotKeeper.selector);
        reg.renewed(ROOT, 1, 1);
    }

    function test_keeperCannotOverdraw() public {
        vm.prank(alice);
        reg.register{value: 1 ether}(ROOT, 10, 1, false, "a", "b");
        vm.prank(keeper);
        vm.expectRevert(PotDriveRegistry.InsufficientKeepAlive.selector);
        reg.renewed(ROOT, 1, 2 ether);
    }

    function test_withdrawRefundsOwnerOnly() public {
        vm.prank(alice);
        reg.register{value: 4 ether}(ROOT, 10, 1, false, "a", "b");
        vm.prank(bob);
        vm.expectRevert(PotDriveRegistry.NotOwner.selector);
        reg.withdraw(ROOT);
        uint256 before = alice.balance;
        vm.prank(alice);
        reg.withdraw(ROOT);
        _eq(alice.balance - before, 4 ether);
        _eq(reg.keepAlive(ROOT), 0);
    }

    function test_transferMovesListing() public {
        vm.prank(alice);
        reg.register(ROOT, 10, 1, false, "a", "b");
        vm.prank(alice);
        reg.transfer(ROOT, bob);
        (bytes32[] memory a,) = reg.filesOf(alice);
        (bytes32[] memory b,) = reg.filesOf(bob);
        _eq(a.length, 0);
        _eq(b.length, 1);
        require(b[0] == ROOT, "bob owns");
    }

    function test_pageIsNewestFirst() public {
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(alice);
            reg.register(bytes32(i + 1), 10, 1, false, "a", "b");
        }
        (bytes32[] memory roots,,) = reg.page(1, 2);
        _eq(roots.length, 2);
        require(roots[0] == bytes32(uint256(4)) && roots[1] == bytes32(uint256(3)), "order");
        (bytes32[] memory none,,) = reg.page(10, 2);
        _eq(none.length, 0);
    }
}
