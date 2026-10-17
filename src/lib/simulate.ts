"use client";

import type { PreparedFile } from "@potdrive/sdk/prepare";
import type { Estimate, UploadEvent, UploadResult, BlockState } from "@potdrive/sdk/upload";

// Development only: replays the event stream of a real upload so the UI can be
// built and reviewed without spending testnet POT. Never reachable in production.
export const SIMULATE = process.env.NODE_ENV !== "production";

export function fakeEstimate(file: PreparedFile, keepAlive: bigint): Estimate {
  // Measured on the testnet: ~0.1135 tPOT per KiB, ~104.9 tPOT per MiB (length fee dominates).
  const storeFees = BigInt(file.storedBytes) * 10_000_000_000n + 840_000_000_000n * BigInt(file.blocks.length);
  const budget = (storeFees * 115n) / 100n + 30_000_000_000_000n;
  return {
    storeFees,
    registryFee: 9_000_000_000_000n,
    registryDeposit: 52_000_000_000_000n,
    keepAlive,
    budget,
    total: budget + 61_000_000_000_000n + keepAlive,
    alreadyStored: false,
    reused: [],
    reusedBytes: 0,
    newBytes: file.storedBytes,
  };
}

export async function fakeUpload(file: PreparedFile, keepAlive: bigint, emit: (e: UploadEvent) => void): Promise<UploadResult> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let head = 75_210;
  emit({ type: "stage", stage: "estimate" });
  emit({ type: "estimate", estimate: fakeEstimate(file, keepAlive) });
  const blocks: BlockState[] = file.blocks.map((b, i) => ({
    i,
    cid: b.cid.toString(),
    size: b.bytes.length,
    kind: i === file.blocks.length - 1 && file.blocks.length > 1 ? "root" : "chunk",
    status: "queued",
  }));
  blocks.forEach((block) => emit({ type: "block", block: { ...block } }));
  emit({ type: "session", address: "5FakeUploadKeyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" });
  emit({ type: "stage", stage: "authorize" });
  await wait(1800);
  emit({ type: "authorized", tx: { hash: "0x8c1e5f0d09ab", blockHash: "0x", blockNumber: head, extrinsicIndex: 2, events: [] } });
  emit({ type: "stage", stage: "store" });
  for (let i = 0; i < blocks.length; i++) {
    blocks[i].status = "sent";
    emit({ type: "block", block: { ...blocks[i] } });
    await wait(450);
    if (i % 3 === 2) head++;
    blocks[i].status = "inBlock";
    blocks[i].blockNumber = head + 1;
    blocks[i].txIndex = i % 3;
    emit({ type: "block", block: { ...blocks[i] } });
  }
  emit({ type: "stage", stage: "verify" });
  await wait(900);
  for (const b of blocks) {
    b.status = "finalized";
    emit({ type: "block", block: { ...b } });
    await wait(80);
  }
  emit({ type: "verified", ms: 412 });
  emit({ type: "stage", stage: "sweep" });
  await wait(900);
  emit({ type: "swept" });
  const result: UploadResult = { root: file.root.toString(), key: file.key, blocks, authorizeTx: "0x8c1e5f0d09ab", deduplicated: false };
  emit({ type: "stage", stage: "done" });
  emit({ type: "done", result });
  return result;
}
