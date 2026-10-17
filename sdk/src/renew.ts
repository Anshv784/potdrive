import type { ApiPromise } from "@polkadot/api";
import type { CID } from "multiformats/cid";
import { cidFor, contentHash, DAG_PB, parseCid } from "./cid";
import { decodeRoot } from "./dag";
import { getBlock } from "./fetch";
import { listStored, locate, type StoredEntry } from "./state";
import { send, type Account } from "./tx";

export interface Placement {
  cid: string;
  kind: "chunk" | "root";
  entry?: StoredEntry;
}

// Every block a file is made of, and where the chain currently holds each one.
export async function placements(api: ApiPromise, root: CID | string, entries?: StoredEntry[]): Promise<Placement[]> {
  const r = typeof root === "string" ? parseCid(root) : root;
  const all = entries ?? (await listStored(api));
  const cids: { cid: CID; kind: Placement["kind"] }[] = [];
  if (r.code === DAG_PB) {
    const bytes = await getBlock(r);
    cids.push(...decodeRoot(bytes).links.map((l) => ({ cid: l.cid, kind: "chunk" as const })));
    cids.push({ cid: cidFor(bytes, DAG_PB), kind: "root" });
  } else {
    cids.push({ cid: r, kind: "chunk" });
  }
  return cids.map(({ cid, kind }) => ({ cid: cid.toString(), kind, entry: locate(all, contentHash(cid)) }));
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
