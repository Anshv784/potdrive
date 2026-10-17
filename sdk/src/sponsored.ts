import type { ApiPromise } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import { contentHash } from "./cid";
import { exists } from "./fetch";
import { signMetaTx, sponsorMessage, type SponsorAuth } from "./metatx";
import { NETWORK } from "./network";
import type { PreparedFile } from "./prepare";
import { listStored } from "./state";
import { storeCall, type BlockState, type UploadEvent, type UploadResult } from "./upload";

// Gasless uploads. The user's wallet signs one readable authorization; an in-tab upload key
// signs each store as a meta-transaction; the relay checks both and submits
// metaTx.dispatch, paying the fees. Nothing leaves the user's balance.

export interface RelayStatus {
  enabled: boolean;
  relayer?: string;
  balance?: string;
  maxBytes: number;
}

export async function relayStatus(relayUrl: string): Promise<RelayStatus> {
  const r = await fetch(relayUrl);
  if (!r.ok) return { enabled: false, maxBytes: 0 };
  return r.json();
}

async function post<T>(relayUrl: string, body: unknown): Promise<T> {
  const r = await fetch(relayUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json()) as T & { error?: string };
  if (!r.ok || j.error) throw new Error(j.error ?? `Relay error ${r.status}`);
  return j;
}

export interface SponsoredOptions {
  api: ApiPromise;
  file: PreparedFile;
  owner: { address: string; signRaw: (message: string) => Promise<string> };
  relayUrl: string;
  onEvent?: (e: UploadEvent) => void;
}

export async function uploadSponsored(opts: SponsoredOptions): Promise<UploadResult> {
  const { api, file, owner, relayUrl } = opts;
  const emit = (e: UploadEvent) => opts.onEvent?.(e);
  await cryptoWaitReady();

  emit({ type: "stage", stage: "estimate" });
  const held = new Set((await listStored(api)).map((e) => e.contentHash.toLowerCase()));
  const blocks: BlockState[] = file.blocks.map((b, i) => ({
    i,
    cid: b.cid.toString(),
    size: b.bytes.length,
    kind: i === file.blocks.length - 1 && file.blocks.length > 1 ? "root" : "chunk",
    status: held.has(contentHash(b.cid).toLowerCase()) ? "skipped" : "queued",
  }));
  blocks.forEach((block) => emit({ type: "block", block }));
  const todo = blocks.filter((b) => b.status === "queued");
  const newBytes = todo.reduce((s, b) => s + b.size, 0);

  const key = new Keyring({ type: "sr25519", ss58Format: NETWORK.ss58 }).addFromMnemonic(mnemonicGenerate());
  emit({ type: "session", address: key.address });

  emit({ type: "stage", stage: "authorize" });
  const head = (await api.rpc.chain.getHeader()).number.toNumber();
  const auth: SponsorAuth = { account: owner.address, uploadKey: key.address, root: file.root.toString(), bytes: newBytes, expires: head + 300 };
  const signature = await owner.signRaw(sponsorMessage(auth));
  const opened = await post<{ tx: string; blockNumber: number }>(relayUrl, { action: "open", auth, signature });
  emit({ type: "authorized", tx: { hash: opened.tx, blockHash: "", blockNumber: opened.blockNumber, extrinsicIndex: -1, events: [] } });

  if (todo.length) {
    emit({ type: "stage", stage: "store" });
    let nonce = (await api.rpc.system.accountNextIndex(key.address)).toNumber();
    for (const b of todo) {
      const bytes = file.blocks[b.i].bytes;
      Object.assign(b, { status: "sent" });
      emit({ type: "block", block: { ...b } });
      const signed = await signMetaTx(api, key, storeCall(api, bytes), nonce++);
      try {
        const r = await post<{ blockNumber: number; index?: number }>(relayUrl, { action: "dispatch", auth, signature, metaTx: signed.hex });
        Object.assign(b, { status: "inBlock", blockNumber: r.blockNumber, txIndex: r.index });
      } catch (e) {
        Object.assign(b, { status: "failed", error: (e as Error).message });
        emit({ type: "block", block: { ...b } });
        throw e;
      }
      emit({ type: "block", block: { ...b } });
    }
  }

  emit({ type: "stage", stage: "verify" });
  const t = performance.now();
  for (let i = 0; i < 10 && !(await exists(file.root).catch(() => false)); i++) await new Promise((r) => setTimeout(r, 1500));
  emit({ type: "verified", ms: performance.now() - t });
  emit({ type: "stage", stage: "sweep" });
  emit({ type: "swept" });

  const result: UploadResult = { root: file.root.toString(), key: file.key, blocks, deduplicated: todo.length === 0 };
  emit({ type: "stage", stage: "done" });
  emit({ type: "done", result });
  return result;
}
