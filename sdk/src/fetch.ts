import type { CID } from "multiformats/cid";
import { hexToU8a } from "@polkadot/util";
import { DAG_PB, parseCid, verifyBytes } from "./cid";
import { decodeNode, type DecodedNode } from "./dag";
import { rpc, RpcError } from "./rpc";

export class NotFoundError extends Error {
  constructor(public cid: string) {
    super(`Not stored on Portaldot (or expired): ${cid}`);
  }
}

export class IntegrityError extends Error {
  constructor(public cid: string) {
    super(`Data returned for ${cid} does not match its hash`);
  }
}

export class PathError extends Error {}

const asCid = (c: CID | string) => (typeof c === "string" ? parseCid(c) : c);

// One block straight from a Portaldot node's indexed transactions (bitswap_v1_get),
// checked against its CID before it is returned. Nothing is trusted.
export async function getBlock(cid: CID | string, url?: string): Promise<Uint8Array> {
  const c = asCid(cid);
  let hex: string;
  try {
    hex = await rpc<string>("bitswap_v1_get", [c.toString()], url);
  } catch (e) {
    if (e instanceof RpcError && /not found/i.test(e.message)) throw new NotFoundError(c.toString());
    throw e;
  }
  const bytes = hexToU8a(hex);
  if (!verifyBytes(c, bytes)) throw new IntegrityError(c.toString());
  return bytes;
}

export interface Stat {
  cid: CID;
  kind: "raw" | "file" | "directory";
  size: number;
  node?: DecodedNode;
  // Raw blocks are returned whole; no second fetch needed.
  raw?: Uint8Array;
}

export async function stat(cid: CID | string, url?: string): Promise<Stat> {
  const c = asCid(cid);
  const bytes = await getBlock(c, url);
  if (c.code !== DAG_PB) return { cid: c, kind: "raw", size: bytes.length, raw: bytes };
  const node = decodeNode(bytes);
  return { cid: c, kind: node.kind, size: node.size, node };
}

// Walks a UnixFS directory path (`a/b/c.png`) from a root, one verified block per hop.
export async function resolvePath(root: CID | string, path: string, url?: string): Promise<Stat> {
  let current = await stat(root, url);
  for (const seg of path.split("/").filter(Boolean).map(decodeURIComponent)) {
    if (current.kind !== "directory") throw new PathError(`${seg}: not a directory`);
    const link = current.node!.links.find((l) => l.name === seg);
    if (!link) throw new PathError(`${seg}: no such file`);
    current = await stat(link.cid, url);
  }
  return current;
}

export interface ChunkCheck {
  cid: string;
  index: number;
  size: number;
  status: "pending" | "ok" | "missing" | "corrupt";
  ms?: number;
}

export interface FetchOptions {
  url?: string;
  concurrency?: number;
  onChunk?: (check: ChunkCheck) => void;
  onLayout?: (chunks: ChunkCheck[]) => void;
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  let failure: unknown;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length && !failure) {
        const item = items[i++];
        try {
          await fn(item);
        } catch (e) {
          failure ??= e;
        }
      }
    }),
  );
  if (failure) throw failure;
}

// Bytes [start, end) of a file, fetching only the leaves that overlap the range.
// This is what lets the gateway answer HTTP Range requests (video seeking) from chain.
export async function readRange(s: Stat, start: number, end: number, opts: FetchOptions = {}): Promise<Uint8Array> {
  if (s.kind === "directory") throw new PathError("Is a directory");
  end = Math.min(end, s.size);
  if (start >= end) return new Uint8Array(0);
  if (s.kind === "raw") return (s.raw ?? (await getBlock(s.cid, opts.url))).subarray(start, end);

  const { links, blockSizes } = s.node!;
  const out = new Uint8Array(end - start);
  const wanted: { i: number; off: number }[] = [];
  let off = 0;
  blockSizes.forEach((size, i) => {
    if (off < end && off + size > start) wanted.push({ i, off });
    off += size;
  });
  const layout: ChunkCheck[] = wanted.map(({ i }) => ({ cid: links[i].cid.toString(), index: i, size: blockSizes[i], status: "pending" }));
  opts.onLayout?.(layout);
  await pool(wanted, opts.concurrency ?? 4, async ({ i, off }) => {
    const t = performance.now();
    const check = layout.find((c) => c.index === i)!;
    let leaf: Uint8Array;
    try {
      leaf = await getBlock(links[i].cid, opts.url);
    } catch (e) {
      opts.onChunk?.({ ...check, status: e instanceof IntegrityError ? "corrupt" : "missing" });
      throw e;
    }
    opts.onChunk?.({ ...check, size: leaf.length, status: "ok", ms: performance.now() - t });
    const from = Math.max(start, off) - off;
    const to = Math.min(end, off + leaf.length) - off;
    out.set(leaf.subarray(from, to), off + from - start);
  });
  return out;
}

// Whole file (raw leaf or UnixFS dag-pb), every block verified.
export async function getFile(cid: CID | string, opts: FetchOptions = {}): Promise<Uint8Array> {
  const c = asCid(cid);
  let s: Stat;
  const t = performance.now();
  try {
    s = await stat(c, opts.url);
  } catch (e) {
    opts.onLayout?.([{ cid: c.toString(), index: 0, size: 0, status: "pending" }]);
    opts.onChunk?.({ cid: c.toString(), index: 0, size: 0, status: e instanceof IntegrityError ? "corrupt" : "missing" });
    throw e;
  }
  if (s.kind === "raw") {
    opts.onLayout?.([{ cid: c.toString(), index: 0, size: s.size, status: "pending" }]);
    opts.onChunk?.({ cid: c.toString(), index: 0, size: s.size, status: "ok", ms: performance.now() - t });
    return s.raw!;
  }
  if (s.kind === "directory") throw new PathError("This CID is a directory");
  return readRange(s, 0, s.size, opts);
}

export async function exists(cid: CID | string, url?: string): Promise<boolean> {
  try {
    await getBlock(cid, url);
    return true;
  } catch (e) {
    if (e instanceof NotFoundError) return false;
    throw e;
  }
}

// Which of these blocks the chain already holds. Used to skip re-storing shared chunks.
export async function existing(cids: (CID | string)[], url?: string, concurrency = 8): Promise<Set<string>> {
  const have = new Set<string>();
  await pool(cids, concurrency, async (c) => {
    if (await exists(c, url).catch(() => false)) have.add(c.toString());
  });
  return have;
}
