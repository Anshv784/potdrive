import type { CID } from "multiformats/cid";
import { hexToU8a } from "@polkadot/util";
import { DAG_PB, parseCid, verifyBytes } from "./cid";
import { decodeRoot } from "./dag";
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

// One block straight from a Portaldot node's indexed transactions (bitswap_v1_get),
// checked against its CID before it is returned. Nothing is trusted.
export async function getBlock(cid: CID | string, url?: string): Promise<Uint8Array> {
  const c = typeof cid === "string" ? parseCid(cid) : cid;
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

// Resolves a file root (raw leaf or UnixFS dag-pb) into bytes, verifying every block.
export async function getFile(cid: CID | string, opts: FetchOptions = {}): Promise<Uint8Array> {
  const root = typeof cid === "string" ? parseCid(cid) : cid;
  if (root.code !== DAG_PB) {
    const layout: ChunkCheck[] = [{ cid: root.toString(), index: 0, size: 0, status: "pending" }];
    opts.onLayout?.(layout);
    const t = performance.now();
    try {
      const bytes = await getBlock(root, opts.url);
      opts.onChunk?.({ ...layout[0], size: bytes.length, status: "ok", ms: performance.now() - t });
      return bytes;
    } catch (e) {
      opts.onChunk?.({ ...layout[0], status: e instanceof IntegrityError ? "corrupt" : "missing" });
      throw e;
    }
  }

  const { links, size } = decodeRoot(await getBlock(root, opts.url));
  const layout: ChunkCheck[] = links.map((l, index) => ({ cid: l.cid.toString(), index, size: l.size, status: "pending" }));
  opts.onLayout?.(layout);

  const out = new Uint8Array(size);
  const offsets: number[] = [];
  links.reduce((off, l, i) => ((offsets[i] = off), off + l.size), 0);

  let cursor = 0;
  let failure: Error | undefined;
  const worker = async () => {
    while (cursor < links.length && !failure) {
      const i = cursor++;
      const t = performance.now();
      try {
        const bytes = await getBlock(links[i].cid, opts.url);
        out.set(bytes, offsets[i]);
        opts.onChunk?.({ ...layout[i], size: bytes.length, status: "ok", ms: performance.now() - t });
      } catch (e) {
        opts.onChunk?.({ ...layout[i], status: e instanceof IntegrityError ? "corrupt" : "missing" });
        failure = e as Error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 4, links.length) }, worker));
  if (failure) throw failure;
  return out;
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
