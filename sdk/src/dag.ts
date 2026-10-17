import * as dagPB from "@ipld/dag-pb";
import { UnixFS } from "ipfs-unixfs";
import type { CID } from "multiformats/cid";
import { cidFor, DAG_PB, RAW } from "./cid";

export interface Block {
  cid: CID;
  bytes: Uint8Array;
}

export interface FileDag {
  root: CID;
  // Every block that must be stored on chain, leaves first, root last.
  blocks: Block[];
  leaves: Block[];
  size: number;
}

export function chunk(bytes: Uint8Array, size: number): Uint8Array[] {
  if (bytes.length === 0) return [new Uint8Array(0)];
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) out.push(bytes.subarray(i, i + size));
  return out;
}

// Single-chunk files are a raw leaf (like `ipfs add --raw-leaves`). Larger files get a
// UnixFS dag-pb root linking the leaves, so any IPFS client can reassemble them.
export function buildFileDag(bytes: Uint8Array, chunkSize: number): FileDag {
  const leaves = chunk(bytes, chunkSize).map((b) => ({ cid: cidFor(b, RAW), bytes: b }));
  if (leaves.length === 1) {
    return { root: leaves[0].cid, blocks: leaves, leaves, size: bytes.length };
  }
  const unixfs = new UnixFS({ type: "file", blockSizes: leaves.map((l) => BigInt(l.bytes.length)) });
  const node = dagPB.prepare({
    Data: unixfs.marshal(),
    Links: leaves.map((l) => ({ Name: "", Tsize: l.bytes.length, Hash: l.cid })),
  });
  const rootBytes = dagPB.encode(node);
  const root = { cid: cidFor(rootBytes, DAG_PB), bytes: rootBytes };
  return { root: root.cid, blocks: [...leaves, root], leaves, size: bytes.length };
}

export interface DecodedRoot {
  links: { cid: CID; size: number }[];
  size: number;
}

export function decodeRoot(bytes: Uint8Array): DecodedRoot {
  const node = dagPB.decode(bytes);
  const unixfs = node.Data ? UnixFS.unmarshal(node.Data) : undefined;
  const links = node.Links.map((l) => ({ cid: l.Hash, size: Number(l.Tsize ?? 0) }));
  const size = unixfs ? Number(unixfs.fileSize()) : links.reduce((s, l) => s + l.size, 0);
  return { links, size };
}
