import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { u8aToHex, hexToU8a } from "@polkadot/util";

// Sharing a private file with a specific wallet, without a public link.
//
// Polkadot wallets can sign but won't decrypt, so each PotDrive user publishes an X25519
// "inbox" public key in the registry (the private half stays on their device). To share,
// the owner seals the file's AES key to that inbox key and emits it in a Shared event:
//   ephemeral X25519 → ECDH → HKDF-SHA256(salt = "PotDrive share v1", info = root) → AES-256-GCM.

const VERSION = 1;
const INFO = new TextEncoder().encode("PotDrive share v1");

export interface Inbox {
  publicKey: `0x${string}`;
  privateKey: `0x${string}`;
}

export function newInbox(): Inbox {
  const priv = x25519.utils.randomPrivateKey();
  return { privateKey: u8aToHex(priv) as `0x${string}`, publicKey: u8aToHex(x25519.getPublicKey(priv)) as `0x${string}` };
}

async function aesKey(shared: Uint8Array, root: Uint8Array): Promise<CryptoKey> {
  const k = hkdf(sha256, shared, INFO, root, 32);
  return crypto.subtle.importKey("raw", k as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

// Output: version(1) | ephemeralPub(32) | iv(12) | ciphertext+tag
export async function sealToInbox(fileKey: string, inboxPublicKey: string, root: `0x${string}`): Promise<`0x${string}`> {
  const eph = x25519.utils.randomPrivateKey();
  const shared = x25519.getSharedSecret(eph, hexToU8a(inboxPublicKey));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource, additionalData: hexToU8a(root) as BufferSource }, await aesKey(shared, hexToU8a(root)), new TextEncoder().encode(fileKey)),
  );
  const out = new Uint8Array(1 + 32 + 12 + ct.length);
  out[0] = VERSION;
  out.set(x25519.getPublicKey(eph), 1);
  out.set(iv, 33);
  out.set(ct, 45);
  return u8aToHex(out) as `0x${string}`;
}

export async function openFromInbox(sealed: string, inboxPrivateKey: string, root: `0x${string}`): Promise<string> {
  const b = hexToU8a(sealed);
  if (b[0] !== VERSION) throw new Error("Unknown share format");
  const shared = x25519.getSharedSecret(hexToU8a(inboxPrivateKey), b.subarray(1, 33));
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b.subarray(33, 45) as BufferSource, additionalData: hexToU8a(root) as BufferSource },
      await aesKey(shared, hexToU8a(root)),
      b.subarray(45) as BufferSource,
    );
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error("This share was not sealed to your inbox key");
  }
}
