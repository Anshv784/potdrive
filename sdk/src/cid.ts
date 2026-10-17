import { CID } from "multiformats/cid";
import * as Digest from "multiformats/hashes/digest";
import { blake2AsU8a } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";

// TransactionStorage.store indexes data under blake2_256(data). The node's bitswap
// serves it for any CIDv1 whose multihash is that digest, so PotDrive CIDs are
// ordinary IPFS CIDs: raw (0x55) for leaves, dag-pb (0x70) for file roots.
export const RAW = 0x55;
export const DAG_PB = 0x70;
export const BLAKE2B_256 = 0xb220;

export function blake2(bytes: Uint8Array): Uint8Array {
  return blake2AsU8a(bytes, 256);
}

export function cidFor(bytes: Uint8Array, codec: number = RAW): CID {
  return CID.createV1(codec, Digest.create(BLAKE2B_256, blake2(bytes)));
}

export function parseCid(input: string): CID {
  const cid = CID.parse(input.trim());
  if (cid.version !== 1) throw new Error("Only CIDv1 is supported");
  if (cid.multihash.code !== BLAKE2B_256) throw new Error("Not a Portaldot CID (expected blake2b-256)");
  return cid;
}

export function isCid(input: string): boolean {
  try {
    parseCid(input);
    return true;
  } catch {
    return false;
  }
}

// The 32-byte content hash the chain stores in TransactionInfo.content_hash.
export function contentHash(cid: CID): `0x${string}` {
  return u8aToHex(cid.multihash.digest) as `0x${string}`;
}

export function cidFromContentHash(hash: string, codec: number = RAW): CID {
  const bytes = Uint8Array.from(hash.replace(/^0x/, "").match(/../g)!.map((b) => parseInt(b, 16)));
  return CID.createV1(codec, Digest.create(BLAKE2B_256, bytes));
}

export function verifyBytes(cid: CID, bytes: Uint8Array): boolean {
  const digest = blake2(bytes);
  const want = cid.multihash.digest;
  if (digest.length !== want.length) return false;
  for (let i = 0; i < digest.length; i++) if (digest[i] !== want[i]) return false;
  return true;
}

export function shortCid(cid: string | CID, head = 8, tail = 6): string {
  const s = cid.toString();
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}
