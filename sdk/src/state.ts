import type { ApiPromise } from "@polkadot/api";
import { NETWORK } from "./network";

// Everything TransactionStorage is still holding, straight from chain state. The pallet
// keeps one TransactionInfo per stored transaction, keyed by the block it landed in,
// until the retention period passes and validators stop having to prove it.
export interface StoredEntry {
  block: number;
  index: number;
  contentHash: `0x${string}`;
  size: number;
  expiresAt: number;
}

interface RawInfo {
  contentHash: `0x${string}`;
  size: number;
}

export async function listStored(api: ApiPromise): Promise<StoredEntry[]> {
  const entries = await api.query.transactionStorage.transactions.entries();
  const out: StoredEntry[] = [];
  for (const [key, value] of entries) {
    const block = Number((key.args[0] as unknown as { toNumber(): number }).toNumber());
    const infos = (value.toJSON() as unknown as RawInfo[] | null) ?? [];
    infos.forEach((info, index) =>
      out.push({ block, index, contentHash: info.contentHash, size: Number(info.size), expiresAt: block + NETWORK.retentionBlocks }),
    );
  }
  return out.sort((a, b) => b.block - a.block || b.index - a.index);
}

export function locate(entries: StoredEntry[], contentHash: string): StoredEntry | undefined {
  const want = contentHash.toLowerCase();
  // Newest first, so a renewed copy wins over the original.
  return entries.find((e) => e.contentHash.toLowerCase() === want);
}

export async function storageParams(api: ApiPromise) {
  const ts = api.query.transactionStorage;
  const [byteFee, entryFee, retention] = await Promise.all([ts.byteFee(), ts.entryFee(), ts.retentionPeriod()]);
  return {
    byteFee: BigInt(byteFee.toString()),
    entryFee: BigInt(entryFee.toString()),
    retention: Number(retention.toString()),
  };
}
