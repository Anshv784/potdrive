// FastCDC content-defined chunking (Xia et al., USENIX ATC 2016) with normalized chunking.
//
// Boundaries depend on the bytes around them, not on their offset, so inserting or
// deleting a few bytes only changes the chunks next to the edit. Every unchanged chunk
// keeps its CID, is already indexed by TransactionStorage, and is not paid for again.

export interface CdcOptions {
  min: number;
  avg: number;
  max: number;
}

// 1 MiB cap keeps every block under bitswap's soft block limit.
export const CDC_DEFAULT: CdcOptions = { min: 256 * 1024, avg: 512 * 1024, max: 1024 * 1024 };

// 256 pseudo-random 32-bit values. Fixed seed: chunk boundaries (and so CIDs) must be
// identical on every machine forever, so this table is part of the format.
const GEAR: Uint32Array = (() => {
  const t = new Uint32Array(256);
  let s = 0x9e3779b9;
  for (let i = 0; i < 256; i++) {
    // splitmix32
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    t[i] = (z ^ (z >>> 16)) >>> 0;
  }
  return t;
})();

function bits(n: number): number {
  return Math.round(Math.log2(n));
}

// The gear hash shifts left, so its high bits cover the most recent ~32 bytes. Masks
// test the top `count` bits: a cut has probability 2^-count per byte. The harder mask
// applies before the average size and the easier one after it, which is FastCDC's
// normalization and keeps chunk sizes close to the average.
function mask(count: number): number {
  return count >= 32 ? 0xffffffff : ((((1 << count) - 1) << (32 - count)) >>> 0);
}

export function cdcBoundaries(data: Uint8Array, opts: CdcOptions = CDC_DEFAULT): number[] {
  const { min, avg, max } = opts;
  if (min >= avg || avg >= max) throw new Error("CDC needs min < avg < max");
  const b = bits(avg);
  const maskS = mask(b + 2);
  const maskL = mask(b - 2);
  const cuts: number[] = [];
  let start = 0;
  const n = data.length;
  while (start < n) {
    const remaining = n - start;
    if (remaining <= min) {
      cuts.push(n);
      break;
    }
    const end = start + Math.min(remaining, max);
    const normal = start + Math.min(remaining, avg);
    let hash = 0;
    let i = start + min;
    let cut = end;
    for (; i < normal; i++) {
      hash = ((hash << 1) + GEAR[data[i]]) >>> 0;
      if ((hash & maskS) === 0) {
        cut = i + 1;
        break;
      }
    }
    if (cut === end) {
      for (; i < end; i++) {
        hash = ((hash << 1) + GEAR[data[i]]) >>> 0;
        if ((hash & maskL) === 0) {
          cut = i + 1;
          break;
        }
      }
    }
    cuts.push(cut);
    start = cut;
  }
  return cuts;
}

export function cdcChunks(data: Uint8Array, opts?: CdcOptions): Uint8Array[] {
  if (data.length === 0) return [new Uint8Array(0)];
  const out: Uint8Array[] = [];
  let prev = 0;
  for (const cut of cdcBoundaries(data, opts)) {
    out.push(data.subarray(prev, cut));
    prev = cut;
  }
  return out;
}
