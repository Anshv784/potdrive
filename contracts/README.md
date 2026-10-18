# PotDrive contracts

Solidity on Portaldot's **Revive** pallet (EVM bytecode, `AllowEVMBytecode = true`) that does not take an uploader's word for anything. It hashes with **Portaldot's own blake2b** through the System precompile, decodes the **IPFS UnixFS** structure in Solidity, and checks **Polkadot wallet (sr25519) signatures** over readable text.

| Contract | Init code | Deposit | |
|---|---|---|---|
| [`PotDriveRegistry`](src/PotDriveRegistry.sol) | 5,619 B | ≈ 447 tPOT | Always deployed. Proves and records files, keep-alive, sharing |
| [`PotDrivePermits`](src/PotDrivePermits.sol) | 4,112 B | ≈ 323 tPOT | Optional. Gasless registration with wallet signatures |
| [`PotDriveVerifier`](src/PotDriveVerifier.sol) | 2,999 B | ≈ 245 tPOT | Optional. `proveBlock` for other contracts |
| [`PotDriveCheck`](src/PotDriveVerifier.sol) | 3,028 B | **0** | Never deployed: runs through `eth_call` |

Deposits are refundable and were measured with `reviveApi.instantiate` dry runs on Portaldot V3.

## What the registry proves

`register()` receives the file's **root block**, not claims about it:

1. **The key is the chain's content hash.** `blake2b256(rootNode)` through the System precompile (`0x…0900`) is what TransactionStorage indexes the block under.
2. **The structure is valid.** [`lib/UnixFs.sol`](src/lib/UnixFs.sol) parses the dag-pb protobuf and its UnixFS payload:
   - every link is a CIDv1 over blake2b-256;
   - every `blocksize` equals its link's `Tsize` and points at a raw leaf;
   - the sizes add up to `filesize`;
   - directory names are non-empty, slash-free and strictly sorted.
3. **Size and block count are derived, not claimed.**

A forged root (one block size changed, every hash valid) reverts with `SizeMismatch()`, including on the live chain. A single-block file is recorded as claimed (`proven = false`), because hashing up to 1 MiB in a transaction is too costly.

## Wallet-signed permits

[`PotDrivePermits`](src/PotDrivePermits.sol) registers on behalf of a Polkadot account that signed this in its wallet:

```
PotDrive: store and register a file
cid: bafykbzace…            ← base32-encoded in Solidity from the digest
name: deck.pdf
type: application/pdf
private: no
previous: none
registry: 0x…
chain: 420420777
nonce: 0
valid until block: 84700
sponsored upload for: 5CX7…  ← the sponsor's terms, appended verbatim
upload key: 5F3s…
bytes: 3567616
```

[`lib/Permit.sol`](src/lib/Permit.sol) rebuilds that text byte for byte, inside the `<Bytes>…</Bytes>` wrapper wallets sign raw text in, and checks it with `sr25519Verify`.

- **Owner.** The owner is the signer's Revive address: `keccak256(publicKey)[12..]`, or the first 20 bytes for Ethereum-derived accounts. This matches `reviveApi.address` on chain.
- **One signature, two uses.** The relay checks the same signature before sponsoring the storage through the MetaTx pallet.

## Keeper

`claimRenewal` is bounded by what the contract proved:

- at most `feeCap` per stored byte;
- only within ~2 days of expiry;
- at most one retention period ahead;
- never more than the file's balance.

## Built for Revive's code deposit

Code costs about 0.078 tPOT per byte to deploy, about 700× TransactionStorage's per-byte price. The first all-in-one version was 12,165 B (952 tPOT). What got it to 5,619 B:

- **Read-only checks off the critical path.** They live in `PotDriveCheck`, which runs through `eth_call`, and the optional `PotDriveVerifier`.
- **Permits in a separate, optional module.**
- **One `register` entry point.** The IR optimizer was inlining the registration logic twice.
- **Hand-assembled precompile calls and permit text.** One buffer and one cursor, with no ABI encoder or `encodePacked` chains.
- **No metadata hash in the bytecode.** A record is two packed slots; names, types and versions are event logs.

## Tests

```bash
forge test                                # 32 tests
bun ../scripts/contract-fixtures.ts       # regenerate fixtures from the SDK
bun ../scripts/onchain-check.ts           # 6 checks against Portaldot itself
```

The fixtures are generated from the SDK: real UnixFS roots, a website directory, forged and unsorted roots, and a permit signed with a real sr25519 key. [`MockSystem`](test/MockSystem.sol) stands in for the precompile with a **real blake2b** built on the EVM's BLAKE2 F precompile (EIP-152), so local hashes equal Portaldot's.

## Deploy

```bash
POTDRIVE_SEED="…" KEEPER_SEED="…" bun ../scripts/deploy.ts            # registry
POTDRIVE_SEED="…" KEEPER_SEED="…" bun ../scripts/deploy.ts --permits  # + gasless module
bun ../scripts/gen-abi.ts                                             # after any contract change
```

On Revive, EVM constructor arguments ride at the end of the init code, and `instantiateWithCode`'s `data` must be empty. Otherwise the deploy fails with `EvmConstructorNonEmptyData` (error 54).
