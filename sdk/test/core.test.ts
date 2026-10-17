import { describe, expect, test } from "bun:test";
import { CID } from "multiformats/cid";
import { cidFor, contentHash, cidFromContentHash, DAG_PB, parseCid, RAW, verifyBytes } from "../src/cid";
import { buildFileDag, decodeRoot } from "../src/dag";
import { isEnvelope, openFile as open, sealFile as seal } from "../src/envelope";
import { prepareFile, shareUrl } from "../src/prepare";
import { blake2AsU8a } from "@polkadot/util-crypto";

const bytes = (n: number, seed = 7) => Uint8Array.from({ length: n }, (_, i) => (i * 31 + seed) & 0xff);

describe("cid", () => {
  test("digest is blake2b-256 of the data, as TransactionStorage indexes it", () => {
    const data = bytes(1000);
    const cid = cidFor(data);
    expect(cid.version).toBe(1);
    expect(cid.code).toBe(RAW);
    expect(cid.multihash.code).toBe(0xb220);
    expect(Buffer.from(cid.multihash.digest).equals(Buffer.from(blake2AsU8a(data, 256)))).toBe(true);
  });

  test("round-trips through string and content hash", () => {
    const cid = cidFor(bytes(10));
    expect(parseCid(cid.toString()).equals(cid)).toBe(true);
    expect(cidFromContentHash(contentHash(cid)).equals(cid)).toBe(true);
    expect(cid.toString().startsWith("bafk2bzace")).toBe(true);
  });

  test("rejects non-blake2 CIDs", () => {
    // sha2-256 CID of "hello"
    expect(() => parseCid("bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq")).toThrow();
  });

  test("verifyBytes catches tampering", () => {
    const data = bytes(64);
    const cid = cidFor(data);
    expect(verifyBytes(cid, data)).toBe(true);
    const bad = data.slice();
    bad[3] ^= 1;
    expect(verifyBytes(cid, bad)).toBe(false);
  });
});

describe("dag", () => {
  test("small file is a single raw leaf", () => {
    const dag = buildFileDag(bytes(500), 1024);
    expect(dag.blocks.length).toBe(1);
    expect(dag.root.code).toBe(RAW);
  });

  test("large file gets a dag-pb root that links every leaf in order", () => {
    const data = bytes(2500);
    const dag = buildFileDag(data, 1024);
    expect(dag.leaves.length).toBe(3);
    expect(dag.blocks.length).toBe(4);
    expect(dag.root.code).toBe(DAG_PB);
    const root = dag.blocks[dag.blocks.length - 1];
    const decoded = decodeRoot(root.bytes);
    expect(decoded.size).toBe(2500);
    expect(decoded.links.map((l) => l.cid.toString())).toEqual(dag.leaves.map((l) => l.cid.toString()));
    expect(decoded.links.map((l) => l.size)).toEqual([1024, 1024, 452]);
    // reassemble
    const out = Buffer.concat(dag.leaves.map((l) => Buffer.from(l.bytes)));
    expect(out.equals(Buffer.from(data))).toBe(true);
  });

  test("CID is deterministic", () => {
    expect(buildFileDag(bytes(5000), 1024).root.toString()).toBe(buildFileDag(bytes(5000), 1024).root.toString());
  });
});

describe("envelope", () => {
  test("seal and open", async () => {
    const data = bytes(3000);
    const { bytes: sealed, key } = await seal(data, { name: "plan.pdf", mime: "application/pdf" });
    expect(isEnvelope(sealed)).toBe(true);
    expect(sealed.length).toBeGreaterThan(data.length);
    const { data: back, meta } = await open(sealed, key);
    expect(Buffer.from(back).equals(Buffer.from(data))).toBe(true);
    expect(meta).toEqual({ name: "plan.pdf", mime: "application/pdf" });
  });

  test("wrong key fails cleanly", async () => {
    const { bytes: sealed } = await seal(bytes(10), { name: "a", mime: "b" });
    const other = await seal(bytes(10), { name: "a", mime: "b" });
    expect(open(sealed, other.key)).rejects.toThrow("Wrong key");
  });
});

describe("prepare", () => {
  test("private files hide name and type", async () => {
    const f = await prepareFile(bytes(100), { name: "secret.txt", mime: "text/plain", private: true });
    expect(f.name).toBe("");
    expect(f.mime).toBe("application/octet-stream");
    expect(f.key).toBeTruthy();
    expect(shareUrl("https://x.y", f)).toContain(`#k=${f.key}`);
  });

  test("public file keeps metadata, no key", async () => {
    const f = await prepareFile(bytes(100), { name: "a.png", mime: "image/png" });
    expect(f.key).toBeUndefined();
    expect(f.storedBytes).toBe(100);
    expect(CID.asCID(f.root)).toBeTruthy();
  });
});
