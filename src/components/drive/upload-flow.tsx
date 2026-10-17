"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, EyeOff, Lock, ShieldCheck, X } from "lucide-react";
import type { ApiPromise } from "@polkadot/api";
import type { PreparedFile } from "@potdrive/sdk/prepare";
import type { BlockState, Estimate, Stage, UploadEvent, UploadResult } from "@potdrive/sdk/upload";
import { formatPot } from "@potdrive/sdk/network";
import { bytes, mimeLabel, num } from "@/lib/format";
import { REGISTRY, SITE } from "@/lib/config";
import { signerOf, type InjectedAccount } from "@/lib/wallet";
import { saveLocalFile, sessionStore } from "@/lib/library";
import { fakeEstimate, fakeUpload } from "@/lib/simulate";
import { BlockGrid, StageRail } from "./blocks";
import { CopyButton } from "../code";

const STAGES: { id: Stage; label: string }[] = [
  { id: "authorize", label: "Sign once" },
  { id: "store", label: "Store blocks" },
  { id: "verify", label: "Verify" },
  { id: "sweep", label: "Return change" },
];

const KEEP = [
  { periods: 0, label: "1 week", sub: "No keep-alive" },
  { periods: 4, label: "5 weeks", sub: "+4 renewals" },
  { periods: 12, label: "13 weeks", sub: "+12 renewals" },
];

type Phase = "preparing" | "review" | "running" | "done" | "error";

export function UploadFlow({
  api,
  account,
  balance,
  file,
  simulate,
  onClose,
  onDone,
}: {
  api: ApiPromise | null;
  account: InjectedAccount;
  balance: bigint | null;
  file: File;
  simulate?: boolean;
  onClose: () => void;
  onDone: (r: UploadResult, f: PreparedFile) => void;
}) {
  const [phase, setPhase] = useState<Phase>("preparing");
  const [isPrivate, setPrivate] = useState(false);
  const [periods, setPeriods] = useState(0);
  const [prepared, setPrepared] = useState<PreparedFile | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [stage, setStage] = useState<Stage>("estimate");
  const [blocks, setBlocks] = useState<BlockState[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t0 = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  // prepare locally whenever privacy changes
  useEffect(() => {
    let live = true;
    setPhase("preparing");
    setEstimate(null);
    (async () => {
      const { prepareFile } = await import("@potdrive/sdk/prepare");
      const data = new Uint8Array(await file.arrayBuffer());
      const p = await prepareFile(data, { name: file.name, mime: file.type, private: isPrivate });
      if (!live) return;
      setPrepared(p);
      setPhase("review");
    })().catch((e) => {
      if (live) {
        setError(String(e?.message ?? e));
        setPhase("error");
      }
    });
    return () => {
      live = false;
    };
  }, [file, isPrivate]);

  // estimate base fees once per prepared file
  const [base, setBase] = useState<Estimate | null>(null);
  useEffect(() => {
    if (!prepared) return;
    let live = true;
    setBase(null);
    setEstimating(true);
    (async () => {
      if (simulate) return fakeEstimate(prepared, 0n);
      if (!api) throw new Error("Not connected to Portaldot yet");
      const { estimateUpload } = await import("@potdrive/sdk/upload");
      return estimateUpload(api, prepared, account.address, { registry: REGISTRY });
    })()
      .then((e) => live && setBase(e))
      .catch((e) => live && setError(String(e?.message ?? e)))
      .finally(() => live && setEstimating(false));
    return () => {
      live = false;
    };
  }, [prepared, api, account.address, simulate]);

  const keepAlive = useMemo(() => (base && REGISTRY ? (base.storeFees * BigInt(periods) * 110n) / 100n : 0n), [base, periods]);
  useEffect(() => {
    if (!base) return setEstimate(null);
    setEstimate({ ...base, keepAlive, total: base.total + keepAlive });
  }, [base, keepAlive]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => setElapsed(performance.now() - t0.current), 200);
    return () => clearInterval(id);
  }, [phase]);

  const short = balance !== null && estimate !== null && balance < estimate.total;

  const onEvent = (e: UploadEvent) => {
    if (e.type === "stage") setStage(e.stage);
    if (e.type === "block") {
      setBlocks((bs) => {
        const next = bs.slice();
        next[e.block.i] = e.block;
        return next;
      });
      if (e.block.status === "inBlock")
        setLog((l) => [...l, `${e.block.kind === "root" ? "root" : `block ${e.block.i + 1}`} stored in #${num(e.block.blockNumber ?? 0)}${e.block.txIndex !== undefined ? ` · tx ${e.block.txIndex}` : ""}`]);
    }
    if (e.type === "session") setLog((l) => [...l, `upload key ${e.address.slice(0, 8)}… created in this tab`]);
    if (e.type === "authorized") setLog((l) => [...l, `signed and included in #${num(e.tx.blockNumber)}`]);
    if (e.type === "verified") setLog((l) => [...l, `root served back by bitswap and re-hashed (${Math.round(e.ms)} ms)`]);
    if (e.type === "swept") setLog((l) => [...l, "unspent budget returned to your account"]);
  };

  const start = async () => {
    if (!prepared) return;
    setPhase("running");
    setLog([]);
    t0.current = performance.now();
    try {
      let r: UploadResult;
      if (simulate) {
        r = await fakeUpload(prepared, keepAlive, onEvent);
      } else {
        if (!api) throw new Error("Not connected to Portaldot");
        const { uploadFile } = await import("@potdrive/sdk/upload");
        const signer = await signerOf(account.source);
        r = await uploadFile({
          api,
          file: prepared,
          owner: { address: account.address, signer },
          registry: REGISTRY,
          keepAlive,
          sessions: sessionStore,
          onEvent,
        });
      }
      saveLocalFile({
        root: r.root,
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        storedBytes: prepared.storedBytes,
        blocks: prepared.blocks.length,
        key: r.key,
        owner: account.address,
        createdAt: Date.now(),
        expiresAt: Math.max(0, ...r.blocks.map((b) => b.blockNumber ?? 0)) + 100_800 + periods * 100_800 || undefined,
      });
      setResult(r);
      setPhase("done");
      onDone(r, prepared);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      setError(/cancel|reject/i.test(msg) ? "You cancelled the signature. Nothing was sent." : msg);
      setPhase("error");
    }
  };

  const link = result ? `${SITE}/f/${result.root}${isPrivate ? "" : `?name=${encodeURIComponent(file.name)}`}${result.key ? `#k=${result.key}` : ""}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-ink-2 sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink-2/95 px-5 py-3 backdrop-blur">
          <span className="stamp text-[10px] text-text-3">
            {phase === "running" ? `Storing · ${(elapsed / 1000).toFixed(1)}s` : phase === "done" ? "Stored on Portaldot" : "New upload"}
          </span>
          {phase !== "running" && (
            <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-text-3 hover:bg-ink-3 hover:text-text">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {/* record card */}
          <div className="paper flex items-center gap-4 rounded-lg px-4 py-3.5">
            <div className="grid size-11 shrink-0 place-items-center rounded-md border border-paper-line bg-paper-2 font-mono text-[10px] font-semibold text-paper-mute">
              {mimeLabel(file.type, file.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{file.name}</div>
              <div className="mt-0.5 font-mono text-[11px] text-paper-mute tabular">
                {bytes(file.size)}
                {prepared && ` · ${prepared.blocks.length} block${prepared.blocks.length === 1 ? "" : "s"} on chain`}
                {prepared?.private && " · sealed"}
              </div>
            </div>
            {isPrivate && <Lock className="size-4 text-paper-mute" />}
          </div>

          <AnimatePresence mode="wait">
            {(phase === "review" || phase === "preparing") && (
              <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* private */}
                <button
                  onClick={() => setPrivate((p) => !p)}
                  className={`mt-5 flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors duration-150 ${
                    isPrivate ? "border-violet bg-violet-soft" : "border-line hover:border-line-2"
                  }`}
                  aria-pressed={isPrivate}
                >
                  <EyeOff className={`mt-0.5 size-4 shrink-0 ${isPrivate ? "text-violet-2" : "text-text-3"}`} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">Private file</span>
                    <span className="mt-1 block text-xs leading-relaxed text-text-2">
                      Sealed with AES-256-GCM before it leaves this tab. The chain only sees ciphertext, and the name and type are
                      hidden too. The key lives in the share link after the #, which browsers never send to a server.
                    </span>
                  </span>
                  <span className={`mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors duration-200 ${isPrivate ? "bg-violet" : "bg-line-2"}`}>
                    <span className={`block size-4 rounded-full bg-white transition-transform duration-200 ${isPrivate ? "translate-x-4" : ""}`} />
                  </span>
                </button>

                {/* keep alive */}
                <div className="mt-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">How long to keep it</span>
                    <span className="text-xs text-text-3">Portaldot keeps data 100,800 blocks (~7 days) per payment</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {KEEP.map((k) => (
                      <button
                        key={k.periods}
                        disabled={!REGISTRY && k.periods > 0}
                        onClick={() => setPeriods(k.periods)}
                        className={`rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                          periods === k.periods ? "border-violet bg-violet-soft" : "border-line hover:border-line-2"
                        }`}
                      >
                        <span className="block text-sm font-medium">{k.label}</span>
                        <span className="block text-[11px] text-text-3">{k.sub}</span>
                      </button>
                    ))}
                  </div>
                  {!REGISTRY && <p className="mt-2 text-xs text-text-3">Keep-alive needs the registry contract, which isn&apos;t deployed on this build.</p>}
                </div>

                {/* cost */}
                <div className="mt-5 rounded-lg border border-line">
                  {[
                    ["Storage fees", estimate?.storeFees, "paid by the upload key, per block"],
                    ...(REGISTRY ? ([["Registry record", estimate ? estimate.registryFee + estimate.registryDeposit : undefined, "fee + storage deposit"]] as const) : []),
                    ...(keepAlive > 0n ? ([["Keep-alive, prepaid", keepAlive, `${periods} renewals, refundable`]] as const) : []),
                  ].map(([k, v, sub]) => (
                    <div key={k as string} className="flex items-center justify-between border-b border-line px-4 py-2.5 last:border-0">
                      <span>
                        <span className="block text-sm text-text-2">{k}</span>
                        <span className="block text-[11px] text-text-3">{sub}</span>
                      </span>
                      <span className="font-mono text-sm tabular">{v === undefined || estimating ? "…" : `${formatPot(v as bigint, 3)} tPOT`}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-ink-3/60 px-4 py-3">
                    <span className="text-sm font-medium">Leaves your wallet, at most</span>
                    <span className="font-mono text-sm font-medium tabular">{estimate ? `${formatPot(estimate.total, 3)} tPOT` : "…"}</span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-text-3">
                  The upload key gets a 15% buffer over the estimate. Whatever it doesn&apos;t spend is sent back to you in the last step.
                </p>

                {estimate?.alreadyStored && (
                  <p className="mt-4 rounded-lg border border-ok/40 bg-ok-soft px-4 py-3 text-sm text-text">
                    This exact file is already on Portaldot. Nothing new will be stored; you only {REGISTRY ? "claim the record" : "get the link"}.
                  </p>
                )}
                {short && (
                  <p className="mt-4 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-text">
                    You have {formatPot(balance!, 2)} tPOT. Test POT comes from the Portaldot team: register a native address on the
                    DoraHacks Hacker House page, or open a ticket in the Portaldot Discord.
                  </p>
                )}
                {error && <p className="mt-4 text-sm text-bad">{error}</p>}

                <button
                  onClick={start}
                  disabled={!estimate || !prepared || phase === "preparing" || short}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-violet px-5 py-3 font-medium text-white transition-[background-color,transform,opacity] duration-150 hover:bg-violet-2 active:scale-[0.99] disabled:opacity-40"
                >
                  <ShieldCheck className="size-4" />
                  {phase === "preparing" ? "Hashing in your browser…" : !estimate ? "Estimating fees…" : "Sign once and store"}
                </button>
              </motion.div>
            )}

            {(phase === "running" || phase === "done" || (phase === "error" && blocks.length > 0)) && (
              <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="mt-5">
                <StageRail stages={STAGES} current={stage} done={phase === "done"} />
                <div className="mt-5">
                  <BlockGrid blocks={blocks} />
                </div>
                <ol className="mt-5 space-y-1 rounded-lg border border-line bg-ink p-3 font-mono text-[11px] text-text-2" aria-live="polite">
                  {stage === "authorize" && log.length < 2 && <li className="text-text">Waiting for your wallet. Approve the one signature.</li>}
                  {log.map((l, i) => (
                    <li key={i}>
                      <span className="text-text-3">{String(i + 1).padStart(2, "0")} </span>
                      {l}
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "done" && result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="mt-5 rounded-xl border border-violet/50 bg-violet-soft p-4">
              <div className="stamp text-[10px] text-violet-2">{result.key ? "Private link · anyone with it can open the file" : "Share link"}</div>
              <div className="mt-2 break-all font-mono text-xs text-text">{link}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton text={link} label="Copy link" className="border border-line-2 text-text-2" />
                <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-line-2 px-2 py-1 text-xs text-text-2 hover:text-text">
                  Open <ArrowUpRight className="size-3.5" />
                </a>
                <button onClick={onClose} className="ml-auto rounded-md bg-violet px-3 py-1 text-xs font-medium text-white hover:bg-violet-2">
                  Done
                </button>
              </div>
            </motion.div>
          )}

          {phase === "error" && (
            <div className="mt-5 rounded-lg border border-bad/40 bg-bad-soft p-4 text-sm">
              <div className="font-medium">Upload stopped</div>
              <p className="mt-1 text-text-2">{error}</p>
              {blocks.some((b) => b.status === "inBlock" || b.status === "finalized") && (
                <p className="mt-2 text-xs text-text-3">
                  Blocks already stored stay on chain. The upload key was saved in this browser; the Drive will offer to return
                  its balance.
                </p>
              )}
              <button onClick={onClose} className="mt-3 rounded-md border border-line-2 px-3 py-1.5 text-xs text-text-2 hover:text-text">
                Close
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
