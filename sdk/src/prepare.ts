import type { CID } from "multiformats/cid";
import { CHUNK_SIZE } from "./network";
import { buildFileDag, type Block } from "./dag";
import { sealFile } from "./envelope";

export interface PreparedFile {
  root: CID;
  blocks: Block[];
  // Bytes that actually go on chain (ciphertext for private files).
  storedBytes: number;
  originalBytes: number;
  name: string;
  mime: string;
  private: boolean;
  // base64url AES key, only for private files. Goes in the share link fragment.
  key?: string;
}

export interface PrepareOptions {
  name: string;
  mime?: string;
  private?: boolean;
  chunkSize?: number;
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
  const dag = buildFileDag(payload, opts.chunkSize ?? CHUNK_SIZE);
  return {
    root: dag.root,
    blocks: dag.blocks,
    storedBytes: dag.blocks.reduce((s, b) => s + b.bytes.length, 0),
    originalBytes: data.length,
    name: opts.private ? "" : opts.name,
    mime: opts.private ? "application/octet-stream" : mime,
    private: !!opts.private,
    key,
  };
}

export function shareUrl(origin: string, file: { root: CID | string; key?: string; name?: string }): string {
  const name = file.name ? `?name=${encodeURIComponent(file.name)}` : "";
  return `${origin}/f/${file.root.toString()}${name}${file.key ? `#k=${file.key}` : ""}`;
}
