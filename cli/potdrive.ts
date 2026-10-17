#!/usr/bin/env bun
// PotDrive CLI. Signs with POTDRIVE_SEED (a mnemonic or //dev URI).
//   bun cli/potdrive.ts put <file> [--private] [--keep <weeks>]
//   bun cli/potdrive.ts get <cid> [-o <path>] [--key <k>]
//   bun cli/potdrive.ts info <cid>
//   bun cli/potdrive.ts renew <cid>
//   bun cli/potdrive.ts deploy <dir>        (a folder or built static site)
//   bun cli/potdrive.ts ls
import { basename, join, relative } from "node:path";
import { readdir } from "node:fs/promises";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import type { Address } from "viem";
import {
  connect,
  disconnect,
  estimateUpload,
  expiresAt,
  formatPot,
  getFile,
  isEnvelope,
  listStored,
  NETWORK,
  openFile,
  placements,
  prepareFile,
  prepareFolder,
  renewFile,
  shareUrl,
  uploadFile,
  type BlockState,
} from "../sdk/src/index";

const SITE = process.env.POTDRIVE_SITE ?? "https://potdrive.anshverma.tech";
const REGISTRY = (process.env.POTDRIVE_REGISTRY || undefined) as Address | undefined;

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const violet = (s: string) => `\x1b[38;5;99m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const row = (k: string, v: string) => console.log(`  ${violet(k.padEnd(10))} ${v}`);
const kib = (n: number) => (n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KiB` : `${(n / 1024 / 1024).toFixed(2)} MiB`);

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function signer() {
  const seed = process.env.POTDRIVE_SEED;
  if (!seed) throw new Error("Set POTDRIVE_SEED to the mnemonic of a funded Portaldot account");
  await cryptoWaitReady();
  return new Keyring({ type: "sr25519", ss58Format: NETWORK.ss58 }).addFromUri(seed);
}

function bar(blocks: BlockState[]) {
  const done = blocks.filter((b) => b.status === "inBlock" || b.status === "finalized" || b.status === "skipped").length;
  const width = 20;
  const fill = Math.round((done / blocks.length) * width);
  return `${"█".repeat(fill)}${dim("░".repeat(width - fill))} ${done}/${blocks.length} blocks`;
}

async function put(path: string) {
  const file = Bun.file(path);
  const data = new Uint8Array(await file.arrayBuffer());
  const owner = await signer();
  const api = await connect();
  const prepared = await prepareFile(data, { name: basename(path), mime: file.type, private: process.argv.includes("--private") });
  row("prepared", `${basename(path)} · ${kib(data.length)} → ${prepared.blocks.length} block(s)${prepared.private ? " · sealed" : ""}`);
  const weeks = Number(arg("--keep") ?? 0);
  let keepAlive = 0n;
  if (weeks > 0) {
    if (!REGISTRY) throw new Error("--keep needs POTDRIVE_REGISTRY (keep-alive is held by the registry contract)");
    const base = await estimateUpload(api, prepared, owner.address, { registry: REGISTRY });
    keepAlive = (base.storeFees * BigInt(weeks) * 110n) / 100n;
  }
  const blocks: BlockState[] = [];
  const result = await uploadFile({
    api,
    file: prepared,
    owner,
    registry: REGISTRY,
    keepAlive,
    onEvent: (e) => {
      if (e.type === "estimate") {
        row("estimate", `${formatPot(e.estimate.total, 3)} ${NETWORK.symbol} at most${e.estimate.alreadyStored ? " (already on chain)" : ""}`);
        if (e.estimate.reused.length && !e.estimate.alreadyStored) row("dedup", `${e.estimate.reused.length} block(s), ${kib(e.estimate.reusedBytes)} already on chain, not paid again`);
        if (keepAlive) row("keep", `${weeks} renewal(s) prepaid: ${formatPot(keepAlive, 3)} ${NETWORK.symbol}`);
      }
      if (e.type === "authorized") row("authorized", `${e.tx.hash.slice(0, 10)}… (block #${e.tx.blockNumber.toLocaleString("en-US")})`);
      if (e.type === "block") {
        blocks[e.block.i] = e.block;
        if (blocks.filter(Boolean).length === prepared.blocks.length) process.stdout.write(`\r  ${violet("stored".padEnd(10))} ${bar(blocks)}`);
      }
      if (e.type === "verified") {
        process.stdout.write("\n");
        row("verified", `root served by bitswap in ${Math.round(e.ms)} ms`);
      }
    },
  });
  row("link", green(shareUrl(SITE, { root: result.root, key: result.key, name: prepared.private ? undefined : basename(path) })));
  row("cid", result.root);
}

async function walkDir(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkDir(p)));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

async function deploy(dir: string) {
  const paths = await walkDir(dir);
  if (!paths.length) throw new Error(`${dir} has no files`);
  const entries = await Promise.all(paths.map(async (p) => ({ path: relative(dir, p), bytes: new Uint8Array(await Bun.file(p).arrayBuffer()) })));
  const prepared = await prepareFolder(entries, { name: basename(dir.replace(/\/$/, "")) });
  row("prepared", `${entries.length} files · ${kib(prepared.originalBytes)} → ${prepared.blocks.length} unique blocks`);
  if (!entries.some((e) => e.path === "index.html")) console.log(dim("             no index.html: the gateway will show a directory listing"));
  const owner = await signer();
  const api = await connect();
  const blocks: BlockState[] = [];
  const result = await uploadFile({
    api,
    file: prepared,
    owner,
    registry: REGISTRY,
    onEvent: (e) => {
      if (e.type === "estimate") {
        row("estimate", `${formatPot(e.estimate.total, 3)} ${NETWORK.symbol} at most`);
        if (e.estimate.reused.length) row("dedup", `${e.estimate.reused.length} block(s), ${kib(e.estimate.reusedBytes)} already on chain`);
      }
      if (e.type === "block") {
        blocks[e.block.i] = e.block;
        if (blocks.filter(Boolean).length === prepared.blocks.length) process.stdout.write(`\r  ${violet("stored".padEnd(10))} ${bar(blocks)}`);
      }
      if (e.type === "verified") process.stdout.write("\n");
    },
  });
  row("site", green(`${SITE}/ipfs/${result.root}/`));
}

async function get(cid: string) {
  const out = arg("-o");
  const key = arg("--key");
  let ok = 0;
  let total = 0;
  const data = await getFile(cid, {
    onLayout: (l) => (total = l.length),
    onChunk: (c) => {
      if (c.status === "ok") ok++;
      process.stdout.write(`\r  ${violet("verifying".padEnd(10))} ${ok}/${total} blocks match their hashes`);
    },
  });
  process.stdout.write("\n");
  let body = data;
  let name = out;
  if (isEnvelope(data)) {
    if (!key) throw new Error("This file is sealed. Pass --key <k> (the part after #k= in the link)");
    const opened = await openFile(data, key);
    body = opened.data;
    name ??= opened.meta.name;
  }
  name ??= cid;
  await Bun.write(name, body);
  row("saved", `${name} · ${kib(body.length)}`);
}

async function info(cid: string) {
  const api = await connect();
  const ps = await placements(api, cid);
  const head = (await api.rpc.chain.getHeader()).number.toNumber();
  const exp = expiresAt(ps);
  row("cid", cid);
  row("blocks", String(ps.length));
  for (const p of ps) console.log(`    ${dim(p.kind.padEnd(5))} ${p.cid.slice(0, 18)}…  ${p.entry ? `#${p.entry.block} tx ${p.entry.index} · ${kib(p.entry.size)}` : "not held"}`);
  row("expires", exp ? `block #${exp} (in ~${Math.round(((exp - head) * NETWORK.blockTimeMs) / 3_600_000)} h)` : "not fully held");
}

async function renew(cid: string) {
  const api = await connect();
  const owner = await signer();
  const first = await renewFile(api, owner, cid, (p, b) => row("renewed", `${p.kind} ${p.cid.slice(0, 16)}… in #${b}`));
  row("expires", `block #${first + NETWORK.retentionBlocks}`);
}

async function ls() {
  const api = await connect();
  const entries = await listStored(api);
  row("held", `${entries.length} item(s), ${kib(entries.reduce((s, e) => s + e.size, 0))}`);
  for (const e of entries.slice(0, 50)) console.log(`    #${e.block} tx ${e.index}  ${kib(e.size).padStart(10)}  ${e.contentHash.slice(0, 18)}…  expires #${e.expiresAt}`);
}

const [cmd, target] = process.argv.slice(2);
const commands: Record<string, (t: string) => Promise<void>> = { put, get, info, renew, deploy, ls: () => ls() };
const run = commands[cmd ?? ""];
if (!run || (cmd !== "ls" && !target)) {
  console.log(`potdrive <put|get|info|renew|deploy|ls> [target]

  put <file> [--private] [--keep <weeks>]   store a file (needs POTDRIVE_SEED)
  get <cid> [-o path] [--key k]            fetch, verify every block, save
  info <cid>                               where each block lives and when it expires
  deploy <dir>                             store a folder or static site, print its URL
  renew <cid>                              extend every block by ${NETWORK.retentionBlocks} blocks
  ls                                       everything TransactionStorage holds`);
  process.exit(1);
}
try {
  await run(target);
} catch (e) {
  console.error(`\n  ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  await disconnect();
}
