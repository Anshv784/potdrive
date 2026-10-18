#!/usr/bin/env bun
// Deploys PotDriveRegistry to Portaldot V3 through pallet-revive, as plain EVM bytecode
// (Revive.AllowEVMBytecode = true), signed from a Polkadot account.
//   POTDRIVE_SEED="..." KEEPER_SEED="..." bun scripts/deploy.ts [--permits]
// --permits also deploys PotDrivePermits (gasless registration) and sets it as the sponsor.
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { encodeAbiParameters, encodeFunctionData, type Address, type Hex } from "viem";
import { permitsBytecode, registryAbi, registryBytecode } from "../sdk/src/abi";
import { connect, disconnect } from "../sdk/src/chain";
import { NETWORK } from "../sdk/src/network";
import { evmAddressOf, reviveCall } from "../sdk/src/registry";
import { send } from "../sdk/src/tx";

await cryptoWaitReady();
const keyring = new Keyring({ type: "sr25519", ss58Format: NETWORK.ss58 });
if (!process.env.POTDRIVE_SEED) throw new Error("POTDRIVE_SEED is required");
const deployer = keyring.addFromUri(process.env.POTDRIVE_SEED);
const keeperSs58 = process.env.KEEPER_SEED ? keyring.addFromUri(process.env.KEEPER_SEED).address : deployer.address;

// Renewals cost what storing costs: ~0.1135 tPOT per KiB, measured. The keeper may claim at
// most 1.5x that per stored byte, in 18-decimal wei: 0.1135e14 planck / 1024 · 1e4 · 1.5.
const FEE_CAP = BigInt(process.env.FEE_CAP ?? "166000000000000");

const api = await connect();

async function instantiate(label: string, code: Hex) {
  const dry = (await api.call.reviveApi.instantiate(deployer.address, 0, null, null, { Upload: code }, "0x", null)).toJSON() as {
    weightRequired: { refTime: number; proofSize: number };
    storageDeposit: { charge?: number };
    maxStorageDeposit?: { charge?: number };
    result: { ok?: { addr: string; result: { flags: { bits: number } | number } }; err?: unknown };
  };
  if (!dry.result.ok) throw new Error(`${label} dry-run failed: ${JSON.stringify(dry.result.err)}`);
  const deposit = BigInt(dry.maxStorageDeposit?.charge ?? dry.storageDeposit.charge ?? 0);
  console.log(`${label.padEnd(9)}${dry.result.ok.addr} (predicted) · deposit ${Number(deposit) / 1e14} tPOT (refundable)`);
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
  const address = (ev ? ev.event.data[1].toString() : dry.result.ok.addr) as Address;
  console.log(`${label.padEnd(9)}deployed ${address} in block #${inc.blockNumber} (${inc.hash})`);
  return { address, block: inc.blockNumber };
}

const keeper = (await evmAddressOf(api, keeperSs58)) as Address;
console.log(`deployer ${deployer.address}\nkeeper   ${keeperSs58} (${keeper})\nfee cap  ${FEE_CAP} wei per stored byte`);
// EVM constructors take no `data` on Revive: arguments ride at the end of the initcode.
const registry = await instantiate(
  "registry",
  (registryBytecode + encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [keeper, FEE_CAP]).slice(2)) as Hex,
);

if (process.argv.includes("--permits")) {
  const permits = await instantiate("permits", (permitsBytecode + encodeAbiParameters([{ type: "address" }], [registry.address]).slice(2)) as Hex);
  const data = encodeFunctionData({ abi: registryAbi, functionName: "setSponsor", args: [permits.address] });
  await send(api, await reviveCall(api, deployer.address, registry.address, data), deployer);
  console.log(`sponsor  set to ${permits.address}`);
  console.log(`\nNEXT_PUBLIC_PERMITS=${permits.address}`);
}

console.log(`NEXT_PUBLIC_REGISTRY=${registry.address}\nNEXT_PUBLIC_REGISTRY_BLOCK=${registry.block}`);
await disconnect();
