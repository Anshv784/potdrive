import * as dagPB from "@ipld/dag-pb";
import { UnixFS } from "ipfs-unixfs";
import type { CID } from "multiformats/cid";
import { cdcChunks, CDC_DEFAULT, type CdcOptions } from "./cdc";
import { cidFor, DAG_PB, RAW } from "./cid";

export interface Block {
  cid: CID;
  bytes: Uint8Array;
}

export interface FileDag {
  root: CID;
  // Every block that must be stored on chain, leaves first, root last. Unique by CID.
  blocks: Block[];
  leaves: Block[];
  size: number;
}

// A number means fixed-size chunks; { cdc } means content-defined (FastCDC).
export type Chunking = number | { cdc: CdcOptions };
export const DEFAULT_CHUNKING: Chunking = { cdc: CDC_DEFAULT };

export function chunk(bytes: Uint8Array, size: number): Uint8Array[] {
  if (bytes.length === 0) return [new Uint8Array(0)];
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) out.push(bytes.subarray(i, i + size));
  return out;
}

function split(bytes: Uint8Array, chunking: Chunking): Uint8Array[] {
  return typeof chunking === "number" ? chunk(bytes, chunking) : cdcChunks(bytes, chunking.cdc);
}

function unique(blocks: Block[]): Block[] {
  const seen = new Set<string>();
  return blocks.filter((b) => {
    const k = b.cid.toString();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Single-chunk files are a raw leaf (like `ipfs add --raw-leaves`). Larger files get a
// UnixFS dag-pb root linking the leaves in order, so any IPFS client can reassemble them.
export function buildFileDag(bytes: Uint8Array, chunking: Chunking = DEFAULT_CHUNKING): FileDag {
  const leaves = split(bytes, chunking).map((b) => ({ cid: cidFor(b, RAW), bytes: b }));
  if (leaves.length === 1) return { root: leaves[0].cid, blocks: leaves, leaves, size: bytes.length };
  const unixfs = new UnixFS({ type: "file", blockSizes: leaves.map((l) => BigInt(l.bytes.length)) });
  const rootBytes = dagPB.encode(
    dagPB.prepare({ Data: unixfs.marshal(), Links: leaves.map((l) => ({ Name: "", Tsize: l.bytes.length, Hash: l.cid })) }),
  );
  const root = { cid: cidFor(rootBytes, DAG_PB), bytes: rootBytes };
  return { root: root.cid, blocks: unique([...leaves, root]), leaves, size: bytes.length };
}

// ---- directories ----

export interface DirEntry {
  path: string;
  bytes: Uint8Array;
}

export interface DirDag {
  root: CID;
  blocks: Block[];
  files: { path: string; cid: CID; size: number }[];
  size: number;
}

interface Tree {
  files: Map<string, FileDag>;
  dirs: Map<string, Tree>;
}

function cleanPath(p: string): string[] {
  const parts = p.replace(/\\/g, "/").split("/").filter((s) => s && s !== ".");
  if (parts.some((s) => s === "..")) throw new Error(`Invalid path: ${p}`);
  return parts;
}

// A UnixFS directory tree (dag-pb). Links are sorted by name as UnixFS requires, so the
// same folder always produces the same root CID.
export function buildDirectory(entries: DirEntry[], chunking: Chunking = DEFAULT_CHUNKING): DirDag {
  const tree: Tree = { files: new Map(), dirs: new Map() };
  const files: DirDag["files"] = [];
  for (const e of entries) {
    const parts = cleanPath(e.path);
    if (!parts.length) continue;
    let node = tree;
    for (const dir of parts.slice(0, -1)) {
      if (!node.dirs.has(dir)) node.dirs.set(dir, { files: new Map(), dirs: new Map() });
      node = node.dirs.get(dir)!;
    }
    const dag = buildFileDag(e.bytes, chunking);
    node.files.set(parts.at(-1)!, dag);
    files.push({ path: parts.join("/"), cid: dag.root, size: dag.size });
  }

  const blocks: Block[] = [];
  const encode = (t: Tree): { cid: CID; tsize: number } => {
    const links: { Name: string; Tsize: number; Hash: CID }[] = [];
    for (const [name, sub] of t.dirs) {
      const r = encode(sub);
      links.push({ Name: name, Tsize: r.tsize, Hash: r.cid });
    }
    for (const [name, f] of t.files) {
      blocks.push(...f.blocks);
      links.push({ Name: name, Tsize: f.blocks.reduce((s, b) => s + b.bytes.length, 0), Hash: f.root });
    }
    links.sort((a, b) => (a.Name < b.Name ? -1 : a.Name > b.Name ? 1 : 0));
    const bytes = dagPB.encode(dagPB.prepare({ Data: new UnixFS({ type: "directory" }).marshal(), Links: links }));
    const cid = cidFor(bytes, DAG_PB);
    blocks.push({ cid, bytes });
    return { cid, tsize: bytes.length + links.reduce((s, l) => s + l.Tsize, 0) };
  };
  const root = encode(tree);
  return { root: root.cid, blocks: unique(blocks), files, size: files.reduce((s, f) => s + f.size, 0) };
}

// ---- decoding ----

export interface DecodedNode {
  kind: "file" | "directory";
  links: { name: string; cid: CID; size: number }[];
  // File only: leaf sizes in order and total size.
  blockSizes: number[];
  size: number;
}

export function decodeNode(bytes: Uint8Array): DecodedNode {
  const node = dagPB.decode(bytes);
  const unixfs = node.Data ? UnixFS.unmarshal(node.Data) : undefined;
  const links = node.Links.map((l) => ({ name: l.Name ?? "", cid: l.Hash, size: Number(l.Tsize ?? 0) }));
  if (unixfs && (unixfs.type === "directory" || unixfs.type === "hamt-sharded-directory")) {
    return { kind: "directory", links, blockSizes: [], size: links.reduce((s, l) => s + l.size, 0) };
  }
  const blockSizes = unixfs?.blockSizes.length ? unixfs.blockSizes.map(Number) : links.map((l) => l.size);
  return { kind: "file", links, blockSizes, size: unixfs ? Number(unixfs.fileSize()) : blockSizes.reduce((a, b) => a + b, 0) };
}

/** @deprecated use decodeNode */
export function decodeRoot(bytes: Uint8Array): { links: { cid: CID; size: number }[]; size: number } {
  const n = decodeNode(bytes);
  return { links: n.links.map((l, i) => ({ cid: l.cid, size: n.blockSizes[i] ?? l.size })), size: n.size };
}
