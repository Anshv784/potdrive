import { describe, expect, test } from "bun:test";
import { CDC_DEFAULT, cdcBoundaries, cdcChunks } from "../src/cdc";
import { buildFileDag } from "../src/dag";

function noise(n: number, seed = 1): Uint8Array {
  const out = new Uint8Array(n);
  let x = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = x & 0xff;
  }
  return out;
}

describe("FastCDC", () => {
  const data = noise(12 * 1024 * 1024, 7);

  test("chunks reassemble to the input and respect min/max", () => {
    const chunks = cdcChunks(data);
    expect(chunks.reduce((s, c) => s + c.length, 0)).toBe(data.length);
    chunks.slice(0, -1).forEach((c) => {
      expect(c.length).toBeGreaterThanOrEqual(CDC_DEFAULT.min);
      expect(c.length).toBeLessThanOrEqual(CDC_DEFAULT.max);
    });
  });

  test("average size lands near the target", () => {
    const chunks = cdcChunks(data);
    const avg = data.length / chunks.length;
    expect(avg).toBeGreaterThan(CDC_DEFAULT.avg * 0.8);
    expect(avg).toBeLessThan(CDC_DEFAULT.max);
  });

  test("deterministic across runs", () => {
    expect(cdcBoundaries(data)).toEqual(cdcBoundaries(data.slice()));
  });

  test("an insertion near the start only disturbs nearby chunks", () => {
    const edited = new Uint8Array(data.length + 1000);
    edited.set(data.subarray(0, 300_000), 0);
    edited.set(noise(1000, 99), 300_000);
    edited.set(data.subarray(300_000), 301_000);
    const a = new Set(buildFileDag(data, { cdc: CDC_DEFAULT }).leaves.map((l) => l.cid.toString()));
    const b = buildFileDag(edited, { cdc: CDC_DEFAULT }).leaves.map((l) => l.cid.toString());
    const reused = b.filter((c) => a.has(c)).length;
    expect(reused / b.length).toBeGreaterThan(0.8);
  });

  test("fixed-size chunking reuses nothing after the same insertion", () => {
    const edited = new Uint8Array(data.length + 1000);
    edited.set(data.subarray(0, 300_000), 0);
    edited.set(noise(1000, 99), 300_000);
    edited.set(data.subarray(300_000), 301_000);
    const a = new Set(buildFileDag(data, 1024 * 1024).leaves.map((l) => l.cid.toString()));
    const b = buildFileDag(edited, 1024 * 1024).leaves.map((l) => l.cid.toString());
    expect(b.filter((c) => a.has(c)).length).toBe(0);
  });
});
