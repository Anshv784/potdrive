// Private files: AES-256-GCM in the browser before anything touches the chain.
// The plaintext carries the real name and type, so the chain and the registry
// only ever learn the ciphertext size. The key travels in the URL fragment,
// which browsers never send to a server.

const MAGIC = new TextEncoder().encode("PDE1");

export interface Meta {
  name: string;
  mime: string;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function importKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function isEnvelope(bytes: Uint8Array): boolean {
  return bytes.length > 16 && MAGIC.every((b, i) => bytes[i] === b);
}

export async function sealFile(data: Uint8Array, meta: Meta): Promise<{ bytes: Uint8Array; key: string }> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const header = new TextEncoder().encode(JSON.stringify(meta));
  const plain = new Uint8Array(4 + header.length + data.length);
  new DataView(plain.buffer).setUint32(0, header.length);
  plain.set(header, 4);
  plain.set(data, 4 + header.length);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, await importKey(raw), plain as BufferSource));
  const out = new Uint8Array(MAGIC.length + iv.length + ct.length);
  out.set(MAGIC, 0);
  out.set(iv, MAGIC.length);
  out.set(ct, MAGIC.length + iv.length);
  return { bytes: out, key: b64url(raw) };
}

export async function openFile(bytes: Uint8Array, key: string): Promise<{ data: Uint8Array; meta: Meta }> {
  if (!isEnvelope(bytes)) throw new Error("Not a PotDrive private file");
  const iv = bytes.subarray(MAGIC.length, MAGIC.length + 12);
  const ct = bytes.subarray(MAGIC.length + 12);
  let plain: Uint8Array;
  try {
    plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, await importKey(fromB64url(key)), ct as BufferSource));
  } catch {
    throw new Error("Wrong key for this file");
  }
  const len = new DataView(plain.buffer, plain.byteOffset).getUint32(0);
  const meta = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + len))) as Meta;
  return { data: plain.subarray(4 + len), meta };
}
