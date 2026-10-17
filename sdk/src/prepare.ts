import type { CID } from "multiformats/cid";
import { buildDirectory, buildFileDag, DEFAULT_CHUNKING, type Block, type Chunking, type DirEntry } from "./dag";
import { sealFile } from "./envelope";

export interface PreparedFile {
  root: CID;
  kind: "file" | "directory";
  blocks: Block[];
  // Bytes that actually go on chain (ciphertext for private files).
  storedBytes: number;
  originalBytes: number;
  name: string;
  mime: string;
  private: boolean;
  // base64url AES key, only for private files. Goes in the share link fragment.
  key?: string;
  // Directories only.
  files?: { path: string; cid: string; size: number }[];
}

export interface PrepareOptions {
  name: string;
  mime?: string;
  private?: boolean;
  chunking?: Chunking;
}

// Everything is computed locally before a single transaction is signed:
// the CIDs, the DAG and the exact bytes each transaction will carry.
export async function prepareFile(data: Uint8Array, opts: PrepareOptions): Promise<PreparedFile> {
  const mime = opts.mime || "application/octet-stream";
  let payload = data;
  let key: string | undefined;
  if (opts.private) {
    const sealed = await sealFile(data, { name: opts.name, mime });
    payload = sealed.bytes;
    key = sealed.key;
  }
  const dag = buildFileDag(payload, opts.chunking ?? DEFAULT_CHUNKING);
  return {
    root: dag.root,
    kind: "file",
    blocks: dag.blocks,
    storedBytes: dag.blocks.reduce((s, b) => s + b.bytes.length, 0),
    originalBytes: data.length,
    name: opts.private ? "" : opts.name,
    mime: opts.private ? "application/octet-stream" : mime,
    private: !!opts.private,
    key,
  };
}

// A folder (or a built static site) as one UnixFS directory. Served by the gateway at
// /ipfs/<root>/<path>, with index.html as the directory page.
export async function prepareFolder(entries: DirEntry[], opts: { name: string; chunking?: Chunking }): Promise<PreparedFile> {
  const dag = buildDirectory(entries, opts.chunking ?? DEFAULT_CHUNKING);
  return {
    root: dag.root,
    kind: "directory",
    blocks: dag.blocks,
    storedBytes: dag.blocks.reduce((s, b) => s + b.bytes.length, 0),
    originalBytes: entries.reduce((s, e) => s + e.bytes.length, 0),
    name: opts.name,
    mime: "inode/directory",
    private: false,
    files: dag.files.map((f) => ({ path: f.path, cid: f.cid.toString(), size: f.size })),
  };
}

export function shareUrl(origin: string, file: { root: CID | string; key?: string; name?: string; kind?: "file" | "directory" }): string {
  if (file.kind === "directory") return `${origin}/ipfs/${file.root.toString()}/`;
  const name = file.name ? `?name=${encodeURIComponent(file.name)}` : "";
  return `${origin}/f/${file.root.toString()}${name}${file.key ? `#k=${file.key}` : ""}`;
}
