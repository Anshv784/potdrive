#!/usr/bin/env bun
// Deploys PotDriveRegistry to Portaldot V3 through pallet-revive, as plain EVM bytecode
// (Revive.AllowEVMBytecode = true), signed from a Polkadot account.
//   POTDRIVE_SEED="..." KEEPER_SEED="..." bun scripts/deploy.ts
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { encodeAbiParameters, type Address } from "viem";
import { registryBytecode } from "../sdk/src/abi";
import { connect, disconnect } from "../sdk/src/chain";
import { NETWORK } from "../sdk/src/network";
import { evmAddressOf } from "../sdk/src/registry";
import { send } from "../sdk/src/tx";

await cryptoWaitReady();
const keyring = new Keyring({ type: "sr25519", ss58Format: NETWORK.ss58 });
if (!process.env.POTDRIVE_SEED) throw new Error("POTDRIVE_SEED is required");
const deployer = keyring.addFromUri(process.env.POTDRIVE_SEED);
const keeperSs58 = process.env.KEEPER_SEED ? keyring.addFromUri(process.env.KEEPER_SEED).address : deployer.address;

const api = await connect();
const keeper = (await evmAddressOf(api, keeperSs58)) as Address;
const args = encodeAbiParameters([{ type: "address" }], [keeper]);
// EVM constructors take no `data` on Revive: arguments ride at the end of the initcode.
const code = (registryBytecode + args.slice(2)) as `0x${string}`;
console.log(`deployer ${deployer.address}\nkeeper   ${keeperSs58} (${keeper})`);

const dry = (await api.call.reviveApi.instantiate(deployer.address, 0, null, null, { Upload: code }, "0x", null)).toJSON() as {
  weightRequired: { refTime: number; proofSize: number };
  storageDeposit: { charge?: number };
  maxStorageDeposit?: { charge?: number };
  result: { ok?: { addr: string; result: { flags: { bits: number } | number } }; err?: unknown };
};
if (!dry.result.ok) throw new Error(`dry-run failed: ${JSON.stringify(dry.result.err)}`);
const deposit = BigInt(dry.maxStorageDeposit?.charge ?? dry.storageDeposit.charge ?? 0);
console.log(`address  ${dry.result.ok.addr} (predicted) · deposit ${deposit}`);

const tx = api.tx.revive.instantiateWithCode(
  0,
  { refTime: BigInt(dry.weightRequired.refTime) * 2n, proofSize: BigInt(dry.weightRequired.proofSize) * 2n },
  (deposit * 12n) / 10n + 1n,
  code,
  "0x",
  null,
);
const inc = await send(api, tx, deployer);
const ev = inc.events.find(({ event }) => api.events.revive.Instantiated.is(event));
const address = ev ? ev.event.data[1].toString() : dry.result.ok.addr;
console.log(`deployed ${address} in block #${inc.blockNumber} (${inc.hash})`);
console.log(`\nNEXT_PUBLIC_REGISTRY=${address}`);
await disconnect();
