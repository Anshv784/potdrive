"use client";

import { useEffect, useState } from "react";
import { NETWORK } from "@potdrive/sdk/network";
import type { ProofReport } from "@potdrive/sdk/proofs";
import { duration, num } from "@/lib/format";

export function ProofMonitor() {
  const [r, setR] = useState<ProofReport | null>(null);
  const [down, setDown] = useState(false);
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/proofs")
        .then((x) => (x.ok ? x.json() : Promise.reject()))
        .then((d) => live && (setR(d), setDown(false)))
        .catch(() => live && setDown(true));
    load();
    const id = setInterval(load, 30_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const blocks = r ? [...r.blocks].reverse() : [];
  return (
    <section className="mt-6 rounded-[22px] bg-bg-2 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Storage proofs</h2>
        <span className="text-[13px] text-label-2">Latest {blocks.length || 12} blocks · checkProof inherent and ProofChecked event</span>
      </div>
      <p className="mt-2 max-w-3xl text-[15px] text-label-2">
        The author of block N must prove it still holds a random 256-byte chunk of whatever was stored at block N −{" "}
        {num(NETWORK.retentionBlocks)}. A block without a valid proof is rejected by the runtime.
      </p>
      <ol className="mt-5 grid grid-cols-12 gap-1.5" aria-label="Recent blocks">
        {(r ? blocks : Array.from({ length: 12 }, () => null)).map((b, i) => (
          <li
            key={b?.number ?? i}
            title={b ? `#${num(b.number)} · ${b.checked === null ? "not readable" : b.checked ? "proof checked" : b.due ? "proof missing" : "no proof due"}` : ""}
            className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[10px] tabular transition-colors duration-300 ${
              !b
                ? "pulse-soft bg-fill"
                : b.checked
                  ? "bg-green text-white"
                  : b.due && b.checked === false
                    ? "bg-red text-white"
                    : b.checked === null
                      ? "border border-dashed border-sep-2 text-label-3"
                      : "bg-surface text-label-3"
            }`}
          >
            {b && <span className="hidden sm:inline">{String(b.number).slice(-3)}</span>}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-label-2">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-green" /> Proof checked</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-surface ring-1 ring-sep" /> No proof due</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red" /> Due but missing</span>
        <span className="ml-auto">
          {down
            ? "Node busy, retrying."
            : !r
              ? "Reading blocks…"
              : r.nextDue
                ? r.nextDue <= r.head
                  ? `Proofs are due every block now (${r.checkedCount}/${r.blocks.length} checked).`
                  : `First proof due at block ${num(r.nextDue)}, in about ${duration((r.nextDue - r.head) * NETWORK.blockTimeMs)}.`
                : "Nothing is stored, so no proofs are due."}
        </span>
      </div>
    </section>
  );
}
