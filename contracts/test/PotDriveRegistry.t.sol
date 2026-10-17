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

    function _owner(bytes32 r) internal view returns (address o) {
        (o,,,,,,,) = reg.fileOf(r);
    }

    function _keep(bytes32 r) internal view returns (uint256 k) {
        (,,,,, k,,) = reg.fileOf(r);
    }

    function test_registerSetsOwnerAndExpiry() public {
        vm.prank(alice);
        reg.register{value: 3 ether}(ROOT, 2_000_000, 3, false, "deck.pdf", "application/pdf");
        (address owner, uint64 size, uint32 chunks, uint32 storedAt, uint32 expiresAt, uint256 keep, bool priv, bool listed) = reg.fileOf(ROOT);
        require(owner == alice, "owner");
        _eq(size, 2_000_000);
        _eq(chunks, 3);
        _eq(storedAt, 1000);
        _eq(expiresAt, 1000 + reg.RETENTION());
        _eq(keep, 3 ether);
        require(!priv && listed, "public + listed");
        _eq(reg.count(), 1);
    }

    function test_privateFilesUnlistedByDefault() public {
        vm.prank(alice);
        reg.register(ROOT, 10, 1, true, "", "application/octet-stream");
        (,,,,,, bool priv, bool listed) = reg.fileOf(ROOT);
        require(priv && !listed, "private unlisted");
    }

    function test_setListedTogglesOnlyListingBit() public {
        vm.prank(alice);
        reg.register(ROOT, 10, 1, true, "", "x");
        vm.prank(alice);
        reg.setListed(ROOT, true);
        (,,,,,, bool priv, bool listed) = reg.fileOf(ROOT);
        require(priv && listed, "still private, now listed");
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
        _eq(_keep(ROOT), 3 ether);
        (,,,, uint32 expiresAt,,,) = reg.fileOf(ROOT);
        _eq(expiresAt, next);
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
        _eq(_keep(ROOT), 0);
    }

    function test_transferChangesOwner() public {
        vm.prank(alice);
        reg.register(ROOT, 10, 1, false, "a", "b");
        vm.prank(alice);
        reg.transfer(ROOT, bob);
        require(_owner(ROOT) == bob, "bob owns");
        vm.prank(alice);
        vm.expectRevert(PotDriveRegistry.NotOwner.selector);
        reg.transfer(ROOT, alice);
    }
}
