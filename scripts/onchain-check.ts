#!/usr/bin/env bun
// Runs PotDriveCheck through eth_call on Portaldot V3: nothing is deployed and nothing is spent,
// but every check executes in the chain's own runtime. It proves, against the live network:
//   1. the System precompile's blake2b-256 matches the SDK's CIDs,
//   2. the Solidity UnixFS decoder accepts real PotDrive roots and refuses forged ones,
//   3. sr25519 signatures from a Polkadot key verify over the exact text the SDK builds.
//   bun scripts/onchain-check.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, decodeAbiParameters, decodeErrorResult, encodeAbiParameters, http, type Hex } from "viem";
import { cryptoWaitReady, sr25519PairFromSeed, sr25519Sign, randomAsU8a } from "@polkadot/util-crypto";
import { stringToU8a, u8aToHex, u8aWrapBytes } from "@polkadot/util";
import { buildDirectory, buildFileDag } from "../sdk/src/dag";
import { cidFor, contentHash } from "../sdk/src/cid";
import { permitText, reviveAddressOf } from "../sdk/src/permit";
import { NETWORK } from "../sdk/src/network";

await cryptoWaitReady();
const out = (name: string, file = "PotDriveVerifier.sol") =>
  JSON.parse(readFileSync(resolve(import.meta.dir, `../contracts/out/${file}/${name}.json`), "utf8"));
const check = out("PotDriveCheck");
const errorsAbi = [...out("UnixFs", "UnixFs.sol").abi, ...check.abi].filter((x: { type: string }) => x.type === "error");
const client = createPublicClient({ transport: http(NETWORK.evm, { fetchOptions: { headers: { "User-Agent": "potdrive-check" } } }) });

const REPORT = [
  {
    type: "tuple",
    components: [
      { name: "root", type: "bytes32" },
      { name: "kind", type: "uint8" },
      { name: "size", type: "uint64" },
      { name: "links", type: "uint32" },
      { name: "signatureValid", type: "bool" },
      { name: "chainId", type: "uint256" },
      { name: "blockNumber", type: "uint256" },
    ],
  },
] as const;
const ARGS = [{ type: "bytes" }, { type: "bool" }, { type: "bytes32" }, { type: "bytes" }, { type: "bytes" }] as const;

async function run(block: Uint8Array, dagPb: boolean, signer?: Uint8Array, sig?: Uint8Array, message = "") {
  const data = (check.bytecode.object +
    encodeAbiParameters(ARGS, [
      u8aToHex(block),
      dagPb,
      signer ? u8aToHex(signer) : `0x${"0".repeat(64)}`,
      sig ? u8aToHex(sig) : "0x",
      u8aToHex(stringToU8a(message)),
    ]).slice(2)) as Hex;
  try {
    const r = await client.call({ data });
    return { ok: true as const, report: decodeAbiParameters(REPORT, r.data!)[0] };
  } catch (e) {
    const raw = (e as { walk: (f: (x: unknown) => boolean) => { data?: Hex } }).walk((x) => !!(x as { data?: unknown })?.data)?.data;
    const err = raw ? decodeErrorResult({ abi: errorsAbi, data: raw }) : null;
    return { ok: false as const, error: err ? `${err.errorName}(${err.args?.join(", ") ?? ""})` : (e as Error).message.split("\n")[0] };
  }
}

const rows: [string, boolean, string][] = [];
const expect = (label: string, pass: boolean, detail: string) => {
  rows.push([label, pass, detail]);
  console.log(`${pass ? "✓" : "✗"} ${label}  ${detail}`);
};

// 1 + 2: a real multi-block file
const bytes = Uint8Array.from({ length: 3 * 1024 * 1024 + 4321 }, (_, i) => (i * 131) & 0xff);
const file = buildFileDag(bytes);
const rootBlock = file.blocks.at(-1)!;
const r1 = await run(rootBlock.bytes, true);
expect(
  "file root: blake2b + UnixFS decode",
  r1.ok && r1.report.root === contentHash(file.root) && Number(r1.report.size) === bytes.length && r1.report.links === file.leaves.length,
  r1.ok ? `${file.root.toString().slice(0, 18)}… size ${r1.report.size} in ${r1.report.links} blocks, chain ${r1.report.chainId}, block #${r1.report.blockNumber}` : r1.error,
);

// a website directory
const dir = buildDirectory([
  { path: "index.html", bytes: stringToU8a("<h1>hi</h1>") },
  { path: "assets/app.js", bytes: stringToU8a("console.log(1)") },
]);
const r2 = await run(dir.blocks.at(-1)!.bytes, true);
expect("directory root", r2.ok && r2.report.root === contentHash(dir.root) && r2.report.kind === 1, r2.ok ? `${r2.report.links} entries` : r2.error);

// a raw block, hashed in full by the runtime (the public RPC caps request bodies, so 32 KiB)
const small = bytes.slice(0, 32 * 1024);
const r3 = await run(small, false);
expect("raw block hashed by the runtime", r3.ok && r3.report.root === contentHash(cidFor(small)), r3.ok ? `${small.length} bytes` : r3.error);

// a forged root: one blocksize changed, every hash still valid
const forged = rootBlock.bytes.slice();
const at = forged.lastIndexOf(0x80); // inside the last blocksize varint
forged[at] = 0x81;
const r4 = await run(forged, true);
expect("forged root refused", !r4.ok, r4.ok ? "accepted!" : r4.error);

// 3: an sr25519 permit, signed the way Polkadot wallets sign
const pair = sr25519PairFromSeed(randomAsU8a(32));
const text = permitText({
  root: file.root,
  meta: { isPrivate: false, name: "deck.pdf", mime: "application/pdf", parent: `0x${"0".repeat(64)}` },
  registry: "0x0000000000000000000000000000000000000001",
  nonce: 0,
  deadline: 999_999,
});
const sig = sr25519Sign(u8aWrapBytes(stringToU8a(text)), pair);
const r5 = await run(rootBlock.bytes, true, pair.publicKey, sig, text);
expect("sr25519 wallet signature", r5.ok && r5.report.signatureValid, r5.ok ? `owner ${reviveAddressOf(pair.publicKey)}` : r5.error);
const r6 = await run(rootBlock.bytes, true, pair.publicKey, sig, text.replace("deck.pdf", "evil.pdf"));
expect("tampered permit rejected", r6.ok && !r6.report.signatureValid, r6.ok ? "signatureValid = false" : r6.error);

const failed = rows.filter((r) => !r[1]).length;
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${rows.length} checks passed on ${NETWORK.name}`);
process.exit(failed ? 1 : 0);
