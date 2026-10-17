import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { u8aToHex } from "@polkadot/util";
import { buildDirectory, buildFileDag, type Block } from "../src/dag";
import { getFile, IntegrityError, NotFoundError, PathError, readRange, resolvePath, stat } from "../src/fetch";

// A fake Portaldot node: answers bitswap_v1_get from an in-memory block map, exactly like
// the real RPC (hex result, "Transaction not found" error). Lets the whole read path run offline.
const blocks = new Map<string, Uint8Array>();
let tamper: string | null = null;
let server: ReturnType<typeof Bun.serve>;
let url = "";

function put(bs: Block[]) {
  for (const b of bs) blocks.set(b.cid.toString(), b.bytes);
}

function noise(n: number, seed = 3): Uint8Array {
  const o = new Uint8Array(n);
  let x = seed;
  for (let i = 0; i < n; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    o[i] = x & 0xff;
  }
  return o;
}

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const { id, method, params } = (await req.json()) as { id: number; method: string; params: string[] };
      if (method !== "bitswap_v1_get") return Response.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
      const bytes = blocks.get(params[0]);
      if (!bytes) return Response.json({ jsonrpc: "2.0", id, error: { code: -32000, message: "Transaction not found" } });
      const out = params[0] === tamper ? bytes.map((b, i) => (i === 0 ? b ^ 1 : b)) : bytes;
      return Response.json({ jsonrpc: "2.0", id, result: u8aToHex(out) });
    },
  });
  url = `http://localhost:${server.port}`;
});

afterAll(() => server.stop(true));

describe("read path against a fake node", () => {
  const data = noise(3 * 1024 * 1024 + 12345);
  const dag = buildFileDag(data);

  test("getFile reassembles and verifies a multi-leaf file", async () => {
    put(dag.blocks);
    const seen: string[] = [];
    const out = await getFile(dag.root, { url, onChunk: (c) => seen.push(c.status) });
    expect(Buffer.from(out).equals(Buffer.from(data))).toBe(true);
    expect(seen.every((s) => s === "ok")).toBe(true);
    expect(seen.length).toBe(dag.leaves.length);
  });

  test("readRange only fetches the leaves it needs", async () => {
    put(dag.blocks);
    const s = await stat(dag.root, url);
    const start = 2_000_000;
    const end = 2_000_100;
    let fetched = 0;
    const out = await readRange(s, start, end, { url, onChunk: () => fetched++ });
    expect(Buffer.from(out).equals(Buffer.from(data.subarray(start, end)))).toBe(true);
    expect(fetched).toBeLessThanOrEqual(2);
  });

  test("a range across a leaf boundary is stitched correctly", async () => {
    const s = await stat(dag.root, url);
    const firstLeaf = dag.leaves[0].bytes.length;
    const out = await readRange(s, firstLeaf - 50, firstLeaf + 50, { url });
    expect(Buffer.from(out).equals(Buffer.from(data.subarray(firstLeaf - 50, firstLeaf + 50)))).toBe(true);
  });

  test("tampered bytes are refused", async () => {
    tamper = dag.leaves[1].cid.toString();
    await expect(getFile(dag.root, { url })).rejects.toBeInstanceOf(IntegrityError);
    tamper = null;
  });

  test("missing data is a NotFoundError", async () => {
    const other = buildFileDag(noise(1000, 77));
    await expect(getFile(other.root, { url })).rejects.toBeInstanceOf(NotFoundError);
  });

  test("directory paths resolve to verified files", async () => {
    const dir = buildDirectory([
      { path: "index.html", bytes: new TextEncoder().encode("<h1>site</h1>") },
      { path: "assets/big.bin", bytes: data },
    ]);
    put(dir.blocks);
    const page = await resolvePath(dir.root, "index.html", url);
    expect(new TextDecoder().decode(await readRange(page, 0, page.size, { url }))).toBe("<h1>site</h1>");
    const big = await resolvePath(dir.root, "assets/big.bin", url);
    expect(big.size).toBe(data.length);
    await expect(resolvePath(dir.root, "assets/nope.png", url)).rejects.toBeInstanceOf(PathError);
    await expect(resolvePath(dir.root, "index.html/x", url)).rejects.toBeInstanceOf(PathError);
  });
});
