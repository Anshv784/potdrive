import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import { NETWORK } from "./network";

// NFTs on Portaldot's native Nfts pallet whose media lives in TransactionStorage.
// Metadata is a compact JSON written straight into Nfts item metadata (≤ StringLimit, 256
// bytes), so there is no extra upload and nothing off-chain: token → ipfs://<cid> → Portaldot.

export const COLLECTION_TAG = "PotDrive";

export interface NftMeta {
  name: string;
  image: string; // ipfs://<cid>
  url?: string;
  mime?: string;
}

export function nftMetadata(meta: NftMeta, limit = 256): string {
  const full = { name: meta.name, image: meta.image, url: meta.url, mime: meta.mime, by: COLLECTION_TAG };
  let json = JSON.stringify(full);
  if (new TextEncoder().encode(json).length <= limit) return json;
  json = JSON.stringify({ name: meta.name, image: meta.image, by: COLLECTION_TAG });
  if (new TextEncoder().encode(json).length <= limit) return json;
  const room = limit - new TextEncoder().encode(JSON.stringify({ name: "", image: meta.image })).length;
  return JSON.stringify({ name: meta.name.slice(0, Math.max(0, room)), image: meta.image });
}

export interface MintPlan {
  collection: number;
  item: number;
  newCollection: boolean;
  metadata: string;
}

const text = (v: unknown) => {
  const h = (v as { toHuman?: () => unknown })?.toHuman?.();
  return typeof h === "string" ? h : "";
};

// Reuse the owner's PotDrive collection if they have one, otherwise plan a new one.
export async function planMint(api: ApiPromise, owner: string, meta: NftMeta): Promise<MintPlan> {
  const owned = await api.query.nfts.collectionAccount.keys(owner);
  let collection: number | undefined;
  for (const k of owned) {
    const id = Number((k.args[1] as unknown as { toNumber(): number }).toNumber());
    const m = await api.query.nfts.collectionMetadataOf(id);
    const data = (m as unknown as { isSome: boolean; unwrap(): { data: unknown } }).isSome ? text((m as unknown as { unwrap(): { data: unknown } }).unwrap().data) : "";
    if (data.includes(COLLECTION_TAG)) {
      collection = id;
      break;
    }
  }
  const newCollection = collection === undefined;
  if (collection === undefined) {
    const next = await api.query.nfts.nextCollectionId();
    const n = next as unknown as { isSome?: boolean; unwrap?: () => { toNumber(): number }; toNumber?: () => number };
    collection = n.isSome === false ? 0 : n.unwrap ? n.unwrap().toNumber() : (n.toNumber?.() ?? 0);
  }
  let item = 0;
  if (!newCollection) {
    for (;;) {
      const exists = await api.query.nfts.item(collection, item);
      if ((exists as unknown as { isNone: boolean }).isNone) break;
      item++;
    }
  }
  return { collection, item, newCollection, metadata: nftMetadata(meta) };
}

// One batch: [create collection + tag it] + mint + set metadata.
export function mintCalls(api: ApiPromise, owner: string, plan: MintPlan): SubmittableExtrinsic<"promise">[] {
  const calls: SubmittableExtrinsic<"promise">[] = [];
  if (plan.newCollection) {
    calls.push(
      api.tx.nfts.create(
        { Id: owner },
        { settings: 0, maxSupply: null, mintSettings: { mintType: "Issuer", price: null, startBlock: null, endBlock: null, defaultItemSettings: 0 } },
      ),
      api.tx.nfts.setCollectionMetadata(plan.collection, JSON.stringify({ name: "PotDrive", by: COLLECTION_TAG, network: NETWORK.name })),
    );
  }
  calls.push(api.tx.nfts.mint(plan.collection, plan.item, { Id: owner }, null), api.tx.nfts.setMetadata(plan.collection, plan.item, plan.metadata));
  return calls;
}

export interface OwnedNft {
  collection: number;
  item: number;
  meta: Partial<NftMeta> & { raw: string };
}

export async function ownedNfts(api: ApiPromise, owner: string): Promise<OwnedNft[]> {
  const keys = await api.query.nfts.account.keys(owner);
  const out: OwnedNft[] = [];
  for (const k of keys) {
    const collection = Number((k.args[1] as unknown as { toNumber(): number }).toNumber());
    const item = Number((k.args[2] as unknown as { toNumber(): number }).toNumber());
    const m = await api.query.nfts.itemMetadataOf(collection, item);
    const raw = (m as unknown as { isSome: boolean }).isSome ? text((m as unknown as { unwrap(): { data: unknown } }).unwrap().data) : "";
    let meta: Partial<NftMeta> = {};
    try {
      meta = JSON.parse(raw);
    } catch {}
    out.push({ collection, item, meta: { ...meta, raw } });
  }
  return out;
}
