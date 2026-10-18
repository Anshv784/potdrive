import { describe, expect, test } from "bun:test";
import { stringToU8a, u8aToHex, u8aWrapBytes } from "@polkadot/util";
import { cryptoWaitReady, encodeAddress, sr25519PairFromSeed, sr25519Sign } from "@polkadot/util-crypto";
import { buildFileDag } from "../src/dag";
import { sponsorMessage, verifySponsorAuth, type SponsorAuth } from "../src/metatx";
import { permitText, reviveAddressOf, signatureArray, uploadOf } from "../src/permit";
import { prepareFile } from "../src/prepare";

await cryptoWaitReady();
const pair = sr25519PairFromSeed(new Uint8Array(32).fill(9));
const account = encodeAddress(pair.publicKey, 42);
const ZERO = `0x${"0".repeat(64)}` as const;

describe("permits", () => {
  const file = buildFileDag(Uint8Array.from({ length: 5000 }, (_, i) => i & 0xff), 1000);
  const base = { root: file.root, meta: { isPrivate: false, name: "a.txt", mime: "text/plain", parent: ZERO }, registry: "0x00000000000000000000000000000000000000AA" as const, nonce: 3, deadline: 100 };

  test("text is line-for-line what the contract builds", () => {
    const t = permitText({ ...base, extra: "x: 1" }).split("\n");
    expect(t[0]).toBe("PotDrive: store and register a file");
    expect(t[1]).toBe(`cid: ${file.root.toString()}`);
    expect(t).toContain("registry: 0x00000000000000000000000000000000000000aa");
    expect(t).toContain("chain: 420420777");
    expect(t).toContain("nonce: 3");
    expect(t.at(-1)).toBe("x: 1");
  });

  test("names cannot inject lines", () => {
    expect(() => permitText({ ...base, meta: { ...base.meta, name: "a\nnonce: 0" } })).toThrow();
  });

  test("one signature authorizes the sponsor and the registry", () => {
    const auth: SponsorAuth = {
      account,
      uploadKey: "5UploadKey",
      root: file.root.toString(),
      bytes: 5000,
      expires: 100,
      permit: { registry: base.registry, isPrivate: false, name: "a.txt", mime: "text/plain", parent: ZERO, nonce: "3" },
    };
    const text = sponsorMessage(auth);
    expect(text.startsWith("PotDrive: store and register a file\n")).toBe(true);
    expect(text).toContain(`sponsored upload for: ${account}`);
    const sig = u8aToHex(sr25519Sign(u8aWrapBytes(stringToU8a(text)), pair));
    expect(verifySponsorAuth(auth, sig)).toBe(true);
    expect(verifySponsorAuth({ ...auth, bytes: 999_999 }, sig)).toBe(false); // budget is signed
    expect(verifySponsorAuth({ ...auth, permit: { ...auth.permit!, name: "b.txt" } }, sig)).toBe(false);
  });

  test("signatures and addresses", () => {
    const sig = new Uint8Array(64).fill(7);
    expect(signatureArray(u8aToHex(sig))).toHaveLength(64);
    expect(signatureArray(u8aToHex(new Uint8Array([1, ...sig])))).toHaveLength(64); // MultiSignature prefix
    expect(() => signatureArray("0x1234")).toThrow();
    const eth = new Uint8Array(32).fill(0xee);
    eth.set(new Uint8Array(20).fill(0x11));
    expect(reviveAddressOf(eth)).toBe(`0x${"11".repeat(20)}`);
  });

  test("uploads send the root block for dag-pb files and the digest for single blocks", async () => {
    const big = await prepareFile(Uint8Array.from({ length: 3 * 1024 * 1024 }, (_, i) => (i * 7) & 0xff), { name: "b", mime: "x" });
    const u = uploadOf(big);
    expect(u.rootNode.length).toBeGreaterThan(2);
    const small = await prepareFile(new Uint8Array(100).fill(1), { name: "s", mime: "x" });
    const s = uploadOf(small);
    expect(s.rootNode).toBe("0x");
    expect(s.leafSize).toBe(100n);
  });
});
