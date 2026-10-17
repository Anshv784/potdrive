# PotDriveRegistry

Ownership, versions, prepaid keep-alive and sealed shares for files stored in Portaldot's `TransactionStorage`. It's plain Solidity, compiled to EVM bytecode and deployed through **Revive** (`AllowEVMBytecode = true`). PotDrive calls it with `revive.call` from the same Polkadot wallet, in the same batch as the upload.

| | |
|---|---|
| Source | [`src/PotDriveRegistry.sol`](src/PotDriveRegistry.sol) |
| Tests | [`test/PotDriveRegistry.t.sol`](test/PotDriveRegistry.t.sol): 12 Foundry tests |
| Size | ~3.0 KB runtime (`via_ir`, `optimizer_runs = 1`) |
| Deploy | `bun scripts/deploy.ts` (≈ 224 tPOT refundable code deposit, verified by dry run) |
| Docs | [potdrive.anshverma.tech/docs/registry](https://potdrive.anshverma.tech/docs/registry) |

## Interface

```solidity
function register(bytes32 root, uint64 size, uint32 chunks, bool isPrivate, string name, string mime, bytes32 parent) payable;
function fund(bytes32 root) payable;                            // anyone
function renewed(bytes32 root, uint32 expiresAt, uint256 cost); // keeper only, capped by the file's balance
function withdraw(bytes32 root);                                // owner
function transfer(bytes32 root, address to);                    // owner
function setListed(bytes32 root, bool listed);                  // owner
function setInboxKey(bytes32 key);                              // X25519 public key for receiving shares
function share(bytes32 root, address to, bytes sealedKey);      // owner
function fileOf(bytes32 root) view returns (owner, size, chunks, storedAt, expiresAt, keepAlive, isPrivate, listed);
```

`root` is the root block's blake2b-256 digest, the value TransactionStorage writes into `content_hash`.

## Designed around Revive's deposits

Revive charges 0.06 tPOT per stored byte and 0.15 tPOT per item. So a file is **two packed slots**:

```
slot 0: owner (20) | size (8) | flags (1)
slot 1: chunks (4) | storedAt (4) | expiresAt (4) | keepAlive (16)
```

Names, types, versions (`parent`) and shares are **event logs**, which carry no deposit. Lists are rebuilt with `eth_getLogs`. Slimming the first version this way took the deploy deposit from about 578 to about 224 tPOT.

## Deploying on Revive

EVM constructor arguments must be appended to the init code, and `instantiateWithCode`'s `data` must be empty. Otherwise you get `EvmConstructorNonEmptyData` (Revive error 54). `scripts/deploy.ts` does this, dry-running with `reviveApi.instantiate` first.

```bash
forge test
POTDRIVE_SEED="…" KEEPER_SEED="…" bun ../scripts/deploy.ts
```
