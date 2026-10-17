import type { ApiPromise } from "@polkadot/api";
import type { CID } from "multiformats/cid";
import { contentHash, DAG_PB, parseCid } from "./cid";
import { decodeNode } from "./dag";
import { getBlock } from "./fetch";
import { listStored, locate, type StoredEntry } from "./state";
import { send, type Account } from "./tx";

export interface Placement {
  cid: string;
  kind: "chunk" | "root" | "dir";
  entry?: StoredEntry;
}

// Every block under a root (directories, file roots, leaves), deduplicated, leaves first.
export async function walk(root: CID | string, url?: string): Promise<{ cid: CID; kind: Placement["kind"] }[]> {
  const r = typeof root === "string" ? parseCid(root) : root;
  const out = new Map<string, { cid: CID; kind: Placement["kind"] }>();
  const visit = async (c: CID, kind: Placement["kind"]) => {
    if (out.has(c.toString())) return;
    if (c.code === DAG_PB) {
      const node = decodeNode(await getBlock(c, url));
      for (const l of node.links) await visit(l.cid, node.kind === "directory" ? (l.cid.code === DAG_PB ? "root" : "chunk") : "chunk");
      out.set(c.toString(), { cid: c, kind: node.kind === "directory" ? "dir" : kind });
    } else {
      out.set(c.toString(), { cid: c, kind: kind === "root" ? "chunk" : kind });
    }
  };
  await visit(r, r.code === DAG_PB ? "root" : "chunk");
  return [...out.values()];
}

// Every block a file or folder is made of, and where the chain currently holds each one.
export async function placements(api: ApiPromise, root: CID | string, entries?: StoredEntry[]): Promise<Placement[]> {
  const [all, blocks] = await Promise.all([entries ?? listStored(api), walk(root)]);
  return blocks.map(({ cid, kind }) => ({ cid: cid.toString(), kind, entry: locate(all, contentHash(cid)) }));
}

export function expiresAt(ps: Placement[]): number | undefined {
  const blocks = ps.map((p) => p.entry?.expiresAt).filter((n): n is number => n !== undefined);
  return blocks.length === ps.length ? Math.min(...blocks) : undefined;
}

// renew(block, index) re-indexes data the chain already has, for the same fee as storing it.
export async function renewFile(
  api: ApiPromise,
  account: Account & { address: string },
  root: CID | string,
  onRenewed?: (p: Placement, blockNumber: number) => void,
): Promise<number> {
  const ps = await placements(api, root);
  const missing = ps.filter((p) => !p.entry);
  if (missing.length) throw new Error(`${missing.length} block(s) already expired; renew is no longer possible`);
  const base = (await api.rpc.system.accountNextIndex(account.address)).toNumber();
  const results = await Promise.all(
    ps.map(async (p, i) => {
      const inc = await send(api, api.tx.transactionStorage.renew(p.entry!.block, p.entry!.index), account, { nonce: base + i });
      onRenewed?.(p, inc.blockNumber);
      return inc.blockNumber;
    }),
  );
  return Math.min(...results);
}
