"use client";

import { useEffect, useState } from "react";
import { Check, Cpu, RotateCw } from "lucide-react";
import { bytes } from "@/lib/format";
import { Spinner } from "./ui";

interface Result {
  matches: boolean;
  kind: "raw" | "directory" | "file";
  size: number;
  links: number;
  block: number;
  ms: number;
}

/** Portaldot's runtime re-checks a stored file (see /api/verify): hashed with the System
 * precompile's blake2b, decoded by the Solidity UnixFS decoder, through eth_call. */
export function ChainVerified({ cid, compact = false }: { cid: string; compact?: boolean }) {
  const [run, setRun] = useState(0);
  const [res, setRes] = useState<{ ok: true; r: Result } | { ok: false; error: string } | null>(null);

  useEffect(() => {
    let live = true;
    setRes(null);
    fetch(`/api/verify/${cid}`)
      .then(async (r) => {
        const j = await r.json();
        if (live) setRes(r.ok ? { ok: true, r: j } : { ok: false, error: j.error ?? `HTTP ${r.status}` });
      })
      .catch((e) => live && setRes({ ok: false, error: (e as Error).message }));
    return () => {
      live = false;
    };
  }, [cid, run]);

  const good = res?.ok && res.r.matches;
  return (
    <div className={`rounded-[22px] p-5 ring-1 transition-colors duration-500 ${good ? "bg-green-soft ring-green/20" : "bg-bg-2 ring-transparent"}`}>
      <div className="flex items-center gap-3">
        {!res ? (
          <Spinner className="size-5 text-label-3" />
        ) : good ? (
          <span className="grid size-6 place-items-center rounded-full bg-green text-white">
            <Check className="size-3.5" strokeWidth={3.5} />
          </span>
        ) : (
          <Cpu className="size-5 text-label-3" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{!res ? "Asking Portaldot" : good ? "Verified by Portaldot" : "Portaldot could not verify it"}</div>
          <div className="text-[12px] text-label-2 tabular">
            {!res
              ? "Runtime check through eth_call…"
              : res.ok
                ? `${res.r.kind === "raw" ? "1 block" : `${res.r.links} ${res.r.kind === "directory" ? "entries" : "blocks"}`} · ${bytes(res.r.size)} · block #${res.r.block.toLocaleString("en-US")}`
                : res.error}
          </div>
        </div>
        <button onClick={() => setRun((r) => r + 1)} className="rounded-full p-1.5 text-link hover:bg-accent-soft" aria-label="Check again">
          <RotateCw className="size-4" />
        </button>
      </div>
      {!compact && (
        <p className="mt-3 text-[12px] leading-snug text-label-2">
          The chain&apos;s own runtime hashed the root block with blake2b (System precompile) and decoded it in Solidity. Free: nothing
          is deployed or paid.
        </p>
      )}
    </div>
  );
}
