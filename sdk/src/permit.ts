import { bytesToHex, hexToBytes, keccak256, type Address, type Hex } from "viem";
import type { CID } from "multiformats/cid";
import { contentHash, DAG_PB } from "./cid";
import { NETWORK } from "./network";
import type { PreparedFile } from "./prepare";

// Mirrors PotDriveRegistry.permitText byte for byte. A Polkadot wallet shows this text, signs
// it wrapped in <Bytes>…</Bytes>, and the contract rebuilds and checks it with sr25519.

export interface Upload {
  rootNode: Hex; // dag-pb root block, or "0x" for a single raw block
  leaf: Hex; // the raw block's digest when rootNode is empty
  leafSize: bigint;
}

export interface Meta {
  isPrivate: boolean;
  name: string;
  mime: string;
  parent: Hex;
}

const ZERO32 = `0x${"0".repeat(64)}` as Hex;
const hex = (b: Uint8Array) => bytesToHex(b);

/** What the registry is given for a prepared file: the root block itself when it is dag-pb. */
export function uploadOf(file: PreparedFile): Upload {
  if (file.root.code === DAG_PB) {
    const root = file.blocks.find((b) => b.cid.equals(file.root))!;
    return { rootNode: hex(root.bytes), leaf: ZERO32, leafSize: 0n };
  }
  return { rootNode: "0x", leaf: contentHash(file.root), leafSize: BigInt(file.storedBytes) };
}

export function metaOf(file: PreparedFile, parentDigest?: Hex): Meta {
  return { isPrivate: file.private, name: file.name, mime: file.mime, parent: parentDigest ?? ZERO32 };
}

export interface PermitFields {
  root: CID;
  meta: Meta;
  registry: Address;
  nonce: bigint | number;
  deadline: number;
  extra?: string;
  chainId?: number;
}

export function permitText(p: PermitFields): string {
  for (const s of [p.meta.name, p.meta.mime]) if (/[\r\n]/.test(s)) throw new Error("Names and types must be one line");
  const lines = [
    "PotDrive: store and register a file",
    `cid: ${p.root.toString()}`,
    `name: ${p.meta.name}`,
    `type: ${p.meta.mime}`,
    `private: ${p.meta.isPrivate ? "yes" : "no"}`,
    `previous: ${/^0x0+$/.test(p.meta.parent) ? "none" : p.meta.parent.toLowerCase()}`,
    `registry: ${p.registry.toLowerCase()}`,
    `chain: ${p.chainId ?? NETWORK.chainId}`,
    `nonce: ${p.nonce}`,
    `valid until block: ${p.deadline}`,
  ];
  if (p.extra) lines.push(p.extra);
  return lines.join("\n");
}

/** pallet-revive's address for a Substrate account (Permit.addressOf in Solidity). */
export function reviveAddressOf(publicKey: Uint8Array): Address {
  if (publicKey.slice(20).every((b) => b === 0xee)) return hex(publicKey.slice(0, 20)) as Address;
  return `0x${keccak256(publicKey).slice(-40)}` as Address;
}

/** sr25519 signature as the uint8[64] the contract takes. */
export function signatureArray(sig: Hex | Uint8Array): number[] {
  let b = typeof sig === "string" ? hexToBytes(sig) : sig;
  // Some wallets return a MultiSignature: a 0x01 (sr25519) type byte, then the signature.
  if (b.length === 65 && b[0] === 1) b = b.slice(1);
  if (b.length !== 64) throw new Error("Expected a 64-byte sr25519 signature");
  return [...b];
}
