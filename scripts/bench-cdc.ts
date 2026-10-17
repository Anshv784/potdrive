// Fixed-size vs FastCDC: how many new bytes each edit forces you to store.
// bun scripts/bench-cdc.ts
import { buildFileDag } from "../sdk/src/dag";
import { CDC_DEFAULT } from "../sdk/src/cdc";
import type { Chunking } from "../sdk/src/dag";
function noise(n: number, seed = 1) { const o = new Uint8Array(n); let x = seed; for (let i = 0; i < n; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; o[i] = x & 0xff; } return o; }
const data = noise(16 * 1024 * 1024, 7);
const edits: [string, (d: Uint8Array) => Uint8Array][] = [
  ["insert 1 KiB at 300 KiB", (d) => { const e = new Uint8Array(d.length + 1024); e.set(d.subarray(0, 300 << 10)); e.set(noise(1024, 9), 300 << 10); e.set(d.subarray(300 << 10), (300 << 10) + 1024); return e; }],
  ["overwrite 4 KiB in the middle", (d) => { const e = d.slice(); e.set(noise(4096, 5), 8 << 20); return e; }],
  ["append 2 MiB", (d) => { const e = new Uint8Array(d.length + (2 << 20)); e.set(d); e.set(noise(2 << 20, 3), d.length); return e; }],
  ["delete 10 KiB at 5 MiB", (d) => { const e = new Uint8Array(d.length - 10240); e.set(d.subarray(0, 5 << 20)); e.set(d.subarray((5 << 20) + 10240), 5 << 20); return e; }],
];
const modes: [string, Chunking][] = [["fixed 1 MiB", 1 << 20], ["FastCDC", { cdc: CDC_DEFAULT }]];
for (const [mode, chunking] of modes) {
  const a = buildFileDag(data, chunking);
  const have = new Set(a.leaves.map((l) => l.cid.toString()));
  const sizes = a.leaves.map((l) => l.bytes.length);
  console.log(`\n${mode}: ${a.leaves.length} leaves, avg ${(sizes.reduce((x, y) => x + y) / sizes.length / 1024).toFixed(0)} KiB, min ${(Math.min(...sizes.slice(0, -1)) / 1024).toFixed(0)} max ${(Math.max(...sizes) / 1024).toFixed(0)}`);
  for (const [name, f] of edits) {
    const b = buildFileDag(f(data), chunking);
    const newBytes = b.leaves.filter((l) => !have.has(l.cid.toString())).reduce((s, l) => s + l.bytes.length, 0);
    console.log(`  ${name.padEnd(32)} new bytes ${(newBytes / 1024).toFixed(0).padStart(6)} KiB  (${((newBytes / b.size) * 100).toFixed(1)}% of file)`);
  }
}
const t = performance.now(); buildFileDag(data, { cdc: CDC_DEFAULT }); console.log(`\nchunk+hash 16 MiB: ${(performance.now() - t).toFixed(0)} ms`);
