import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import { Keyring } from "@polkadot/keyring";
import type { KeyringPair } from "@polkadot/keyring/types";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import type { Address } from "viem";
import { contentHash } from "./cid";
import type { Block } from "./dag";
import { exists } from "./fetch";
import { listStored } from "./state";
import { CHUNK_SIZE, NETWORK } from "./network";
import type { PreparedFile } from "./prepare";
import { readFile, registerCalldata, reviveCall } from "./registry";
import { send, type Account, type Included } from "./tx";

export type Stage = "estimate" | "authorize" | "store" | "verify" | "sweep" | "done";

export type BlockStatus = "queued" | "skipped" | "sent" | "inBlock" | "finalized" | "failed";

export interface BlockState {
  i: number;
  cid: string;
  size: number;
  kind: "chunk" | "root";
  status: BlockStatus;
  blockNumber?: number;
  txIndex?: number;
  error?: string;
}

export interface Estimate {
  storeFees: bigint;
  registryFee: bigint;
  registryDeposit: bigint;
  keepAlive: bigint;
  // Moved to the upload key; whatever is unspent comes back at the end.
  budget: bigint;
  // Worst case the wallet sees leave (budget + registry + keep-alive).
  total: bigint;
  alreadyStored: boolean;
  // Blocks the chain already holds (from earlier uploads or other files). Not paid again.
  reused: string[];
  reusedBytes: number;
  newBytes: number;
}

export type UploadEvent =
  | { type: "stage"; stage: Stage }
  | { type: "estimate"; estimate: Estimate }
  | { type: "session"; address: string }
  | { type: "authorized"; tx: Included }
  | { type: "block"; block: BlockState }
  | { type: "verified"; ms: number }
  | { type: "swept" }
  | { type: "done"; result: UploadResult };

export interface UploadResult {
  root: string;
  key?: string;
  blocks: BlockState[];
  authorizeTx?: string;
  deduplicated: boolean;
}

// Stores a pending upload key so a closed tab never strands funds.
export interface SessionStore {
  save(s: { mnemonic: string; owner: string; root: string; createdAt: number }): void;
  clear(root: string): void;
}

const ED = 10n ** 13n; // Balances.ExistentialDeposit on Portaldot V3 (0.1 tPOT)

async function feeModel(api: ApiPromise, who: string) {
  const small = 1024;
  const big = CHUNK_SIZE;
  const [a, b] = await Promise.all(
    [small, big].map(async (n) => BigInt((await api.tx.transactionStorage.store(new Uint8Array(n)).paymentInfo(who)).partialFee.toString())),
  );
  const perByte = (b - a) / BigInt(big - small);
  return (size: number) => a + perByte * BigInt(size - small);
}

export async function estimateUpload(
  api: ApiPromise,
  file: PreparedFile,
  owner: string,
  opts: { registry?: Address; keepAlive?: bigint } = {},
): Promise<Estimate> {
  // One state query tells us every content hash Portaldot holds right now.
  const held = new Set((await listStored(api)).map((e) => e.contentHash.toLowerCase()));
  const reused = file.blocks.filter((b) => held.has(contentHash(b.cid).toLowerCase())).map((b) => b.cid.toString());
  const alreadyStored = reused.length === file.blocks.length;
  const fresh = file.blocks.filter((b) => !reused.includes(b.cid.toString()));
  const fee = await feeModel(api, owner);
  const storeFees = fresh.reduce((s, b) => s + fee(b.bytes.length), 0n);
  const reusedBytes = file.blocks.filter((b) => reused.includes(b.cid.toString())).reduce((s, b) => s + b.bytes.length, 0);
  const newBytes = fresh.reduce((s, b) => s + b.bytes.length, 0);
  const sweep = BigInt((await api.tx.balances.transferAll(owner, false).paymentInfo(owner)).partialFee.toString());

  let registryFee = 0n;
  let registryDeposit = 0n;
  const keepAlive = opts.keepAlive ?? 0n;
  if (opts.registry) {
    const tx = await reviveCall(api, owner, opts.registry, registerCalldata(file), keepAlive).catch(() => null);
    if (tx) {
      registryFee = BigInt((await tx.paymentInfo(owner)).partialFee.toString());
      registryDeposit = BigInt((tx.args[3] as unknown as { toString(): string }).toString());
    }
  }
  const budget = alreadyStored ? 0n : (storeFees * 115n) / 100n + sweep * 2n + ED * 2n;
  return { storeFees, registryFee, registryDeposit, keepAlive, budget, total: budget + registryFee + registryDeposit + keepAlive, alreadyStored, reused, reusedBytes, newBytes };
}

function storedIndex(api: ApiPromise, inc: Included): number | undefined {
  for (const { event } of inc.events) {
    if (api.events.transactionStorage.Stored.is(event)) return Number(event.data[0].toString());
  }
}

export interface UploadOptions {
  api: ApiPromise;
  file: PreparedFile;
  owner: { address: string } & Account;
  registry?: Address;
  keepAlive?: bigint;
  concurrency?: number;
  sessions?: SessionStore;
  onEvent?: (e: UploadEvent) => void;
}

// One signature from the owner: fund a throwaway upload key and register the file.
// The key then stores every block (TransactionStorage indexes the tail of each
// extrinsic, so blocks cannot share a batch), and sweeps what it did not spend.
export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  const { api, file, owner } = opts;
  const emit = (e: UploadEvent) => opts.onEvent?.(e);
  await cryptoWaitReady();

  emit({ type: "stage", stage: "estimate" });
  const estimate = await estimateUpload(api, file, owner.address, { registry: opts.registry, keepAlive: opts.keepAlive });
  emit({ type: "estimate", estimate });

  const registered = opts.registry ? await readFile(opts.registry, contentHash(file.root)).catch(() => null) : null;
  const blocks: BlockState[] = file.blocks.map((b, i) => ({
    i,
    cid: b.cid.toString(),
    size: b.bytes.length,
    kind: i === file.blocks.length - 1 && file.blocks.length > 1 ? "root" : "chunk",
    status: estimate.reused.includes(b.cid.toString()) ? "skipped" : "queued",
  }));
  blocks.forEach((block) => emit({ type: "block", block }));

  if (estimate.alreadyStored && (registered || !opts.registry)) {
    const result: UploadResult = { root: file.root.toString(), key: file.key, blocks, deduplicated: true };
    emit({ type: "stage", stage: "done" });
    emit({ type: "done", result });
    return result;
  }

  const session = new Keyring({ type: "sr25519", ss58Format: NETWORK.ss58 });
  const mnemonic = mnemonicGenerate();
  const key: KeyringPair = session.addFromMnemonic(mnemonic);
  emit({ type: "session", address: key.address });

  emit({ type: "stage", stage: "authorize" });
  const calls: SubmittableExtrinsic<"promise">[] = [];
  if (!estimate.alreadyStored) calls.push(api.tx.balances.transferKeepAlive(key.address, estimate.budget));
  if (opts.registry && !registered) {
    calls.push(await reviveCall(api, owner.address, opts.registry, registerCalldata(file), opts.keepAlive ?? 0n));
  }
  if (!estimate.alreadyStored) opts.sessions?.save({ mnemonic, owner: owner.address, root: file.root.toString(), createdAt: Date.now() });
  const authorize = await send(api, calls.length === 1 ? calls[0] : api.tx.utility.batchAll(calls), owner);
  emit({ type: "authorized", tx: authorize });

  if (!estimate.alreadyStored) {
    emit({ type: "stage", stage: "store" });
    const todo = file.blocks.map((b, i) => ({ b, i })).filter(({ i }) => blocks[i].status !== "skipped");
    await storeBlocks(api, key, todo.map((t) => t.b), todo.map((t) => blocks[t.i]), opts.concurrency ?? 4, emit);

    emit({ type: "stage", stage: "verify" });
    const t = performance.now();
    for (let attempt = 0; attempt < 10 && !(await exists(file.root).catch(() => false)); attempt++) {
      await new Promise((r) => setTimeout(r, 1500));
    }
    emit({ type: "verified", ms: performance.now() - t });

    emit({ type: "stage", stage: "sweep" });
    await sweep(api, key, owner.address).catch(() => {});
    opts.sessions?.clear(file.root.toString());
    emit({ type: "swept" });
  }

  const result: UploadResult = { root: file.root.toString(), key: file.key, blocks, authorizeTx: authorize.hash, deduplicated: estimate.alreadyStored };
  emit({ type: "stage", stage: "done" });
  emit({ type: "done", result });
  return result;
}

async function storeBlocks(
  api: ApiPromise,
  key: KeyringPair,
  data: Block[],
  state: BlockState[],
  concurrency: number,
  emit: (e: UploadEvent) => void,
) {
  const base = (await api.rpc.system.accountNextIndex(key.address)).toNumber();
  const update = (i: number, patch: Partial<BlockState>) => {
    Object.assign(state[i], patch);
    emit({ type: "block", block: { ...state[i] } });
  };
  let cursor = 0;
  let failure: Error | undefined;
  const worker = async () => {
    while (cursor < data.length && !failure) {
      const i = cursor++;
      update(i, { status: "sent" });
      try {
        const inc = await send(api, api.tx.transactionStorage.store(data[i].bytes), key, {
          nonce: base + i,
          onFinalized: () => update(i, { status: "finalized" }),
        });
        update(i, { status: "inBlock", blockNumber: inc.blockNumber, txIndex: storedIndex(api, inc) });
      } catch (e) {
        failure = e as Error;
        update(i, { status: "failed", error: failure.message });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, data.length) }, worker));
  if (failure) throw failure;
}

export async function sweep(api: ApiPromise, key: KeyringPair, to: string): Promise<void> {
  const info = (await api.query.system.account(key.address)) as unknown as { data: { free: { toString(): string } } };
  if (BigInt(info.data.free.toString()) === 0n) return;
  await send(api, api.tx.balances.transferAll(to, false), key);
}

// Recover an upload key left behind by a closed tab and send its balance home.
export async function recoverSession(api: ApiPromise, mnemonic: string, to: string): Promise<void> {
  await cryptoWaitReady();
  const key = new Keyring({ type: "sr25519", ss58Format: NETWORK.ss58 }).addFromMnemonic(mnemonic);
  await sweep(api, key, to);
}
