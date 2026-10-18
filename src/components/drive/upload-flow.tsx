"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, ChevronDown, Lock, Minus, X } from "lucide-react";
import type { ApiPromise } from "@polkadot/api";
import type { PreparedFile } from "@potdrive/sdk/prepare";
import type { BlockState, Estimate, Stage, UploadEvent, UploadResult } from "@potdrive/sdk/upload";
import { formatPot } from "@potdrive/sdk/network";
import { bytes, mimeLabel, num } from "@/lib/format";
import { REGISTRY, SITE } from "@/lib/config";
import { signerOf, type InjectedAccount } from "@/lib/wallet";
import { saveLocalFile, sessionStore } from "@/lib/library";
import { fakeEstimate, fakeUpload } from "@/lib/simulate";
import { connectedApi } from "@/lib/use-api";
import { BlockGrid, StepList } from "./blocks";
import { CopyButton } from "../code";
import { Button, DocIcon, Group, Ring, Row, Segmented, Spinner, Switch } from "../ui";

const STAGES: { id: Stage; label: string }[] = [
  { id: "authorize", label: "Approve in your wallet" },
  { id: "store", label: "Store blocks on Portaldot" },
  { id: "verify", label: "Verify from the chain" },
  { id: "sweep", label: "Return unspent tPOT" },
];

const KEEP = [
  { periods: 0, label: "1 week" },
  { periods: 4, label: "5 weeks" },
  { periods: 12, label: "13 weeks" },
];

type Phase = "preparing" | "review" | "running" | "done" | "error";

export function UploadFlow({
  account,
  balance,
  file,
  folder,
  parent,
  simulate,
  onClose,
  onDone,
  minimized,
  onMinimize,
  onExpand,
}: {
  api: ApiPromise | null;
  account: InjectedAccount;
  balance: bigint | null;
  file: File;
  // When set, `file` is the first file and the upload is a whole folder (UnixFS directory).
  folder?: { name: string; files: File[] };
  // Upload as a new version of an existing file.
  parent?: { root: string; name: string };
  simulate?: boolean;
  onClose: () => void;
  onDone: (r: UploadResult, f: PreparedFile) => void;
  // Google Drive style: once storing starts, the sheet collapses into a corner panel.
  minimized?: boolean;
  onMinimize?: () => void;
  onExpand?: () => void;
}) {
  const displayName = folder?.name ?? file.name;
  const displaySize = folder ? folder.files.reduce((n, f) => n + f.size, 0) : file.size;
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
      let p: PreparedFile;
      if (folder) {
        const { prepareFolder } = await import("@potdrive/sdk/prepare");
        const entries = await Promise.all(
          folder.files.map(async (f) => ({
            // "site/assets/app.js" -> "assets/app.js"
            path: (f.webkitRelativePath || f.name).split("/").slice(folder.files[0].webkitRelativePath ? 1 : 0).join("/"),
            bytes: new Uint8Array(await f.arrayBuffer()),
          })),
        );
        p = await prepareFolder(entries, { name: folder.name });
      } else {
        const data = new Uint8Array(await file.arrayBuffer());
        p = await prepareFile(data, { name: file.name, mime: file.type, private: isPrivate, parent: parent?.root });
      }
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
  }, [file, folder, isPrivate, parent?.root]);

  // estimate base fees once per prepared file
  const [base, setBase] = useState<Estimate | null>(null);
  useEffect(() => {
    if (!prepared) return;
    let live = true;
    setBase(null);
    setEstimating(true);
    (async () => {
      if (simulate) return fakeEstimate(prepared, 0n);
      const chain = await connectedApi();
      const { estimateUpload } = await import("@potdrive/sdk/upload");
      return estimateUpload(chain, prepared, account.address, { registry: REGISTRY });
    })()
      .then((e) => live && setBase(e))
      .catch((e) => live && setError(String(e?.message ?? e)))
      .finally(() => live && setEstimating(false));
    return () => {
      live = false;
    };
  }, [prepared, account.address, simulate]);

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

  // Gasless uploads through the MetaTx relay.
  const [relay, setRelay] = useState<{ enabled: boolean; maxBytes: number; permits?: { registry: `0x${string}`; permits: `0x${string}` } } | null>(null);
  const [pay, setPay] = useState<"wallet" | "sponsored">("wallet");
  useEffect(() => {
    fetch("/api/relay")
      .then((r) => r.json())
      .then(setRelay)
      .catch(() => setRelay({ enabled: false, maxBytes: 0 }));
  }, []);
  const canSponsor = !!relay?.enabled && !!estimate && estimate.newBytes <= relay.maxBytes;
  const walletShort = balance !== null && estimate !== null && balance < estimate.total;
  useEffect(() => {
    if (canSponsor && walletShort) setPay("sponsored");
  }, [canSponsor, walletShort]);
  const sponsored = pay === "sponsored" && canSponsor;
  const short = !sponsored && walletShort;

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
    onMinimize?.();
    t0.current = performance.now();
    try {
      let r: UploadResult;
      if (simulate) {
        r = await fakeUpload(prepared, keepAlive, onEvent);
      } else {
        const chain = await connectedApi();
        const signer = await signerOf(account.source);
        if (sponsored) {
          const [{ uploadSponsored }, { stringToU8a, u8aToHex }] = await Promise.all([import("@potdrive/sdk/sponsored"), import("@polkadot/util")]);
          r = await uploadSponsored({
            api: chain,
            file: prepared,
            relayUrl: "/api/relay",
            permits: relay?.permits,
            owner: {
              address: account.address,
              signRaw: async (message) => {
                if (!signer.signRaw) throw new Error("This wallet can't sign messages");
                const { signature } = await signer.signRaw({ address: account.address, data: u8aToHex(stringToU8a(message)), type: "bytes" });
                return signature;
              },
            },
            onEvent,
          });
        } else {
          const { uploadFile } = await import("@potdrive/sdk/upload");
          r = await uploadFile({
            api: chain,
            file: prepared,
            owner: { address: account.address, signer },
            registry: REGISTRY,
            keepAlive,
            sessions: sessionStore,
            onEvent,
          });
        }
      }
      saveLocalFile({
        root: r.root,
        name: displayName,
        mime: folder ? "inode/directory" : file.type || "application/octet-stream",
        size: displaySize,
        storedBytes: prepared.storedBytes,
        blocks: prepared.blocks.length,
        key: r.key,
        owner: account.address,
        createdAt: Date.now(),
        expiresAt: Math.max(0, ...r.blocks.map((b) => b.blockNumber ?? 0)) + 100_800 + periods * 100_800 || undefined,
        parent: parent?.root,
        sponsored,
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

  const link = !result
    ? ""
    : folder
      ? `${SITE}/ipfs/${result.root}/`
      : `${SITE}/f/${result.root}${isPrivate ? "" : `?name=${encodeURIComponent(file.name)}`}${result.key ? `#k=${result.key}` : ""}`;


  const done = blocks.filter((b) => b.status === "inBlock" || b.status === "finalized" || b.status === "skipped").length;
  const progress = blocks.length ? done / blocks.length : 0;
  const [showLog, setShowLog] = useState(false);

  if (minimized) {
    const status =
      phase === "done"
        ? result?.deduplicated
          ? "Already on Portaldot"
          : "Stored on Portaldot"
        : phase === "error"
          ? "Upload stopped"
          : stage === "authorize"
            ? "Waiting for your wallet…"
            : stage === "store"
              ? `Storing ${done} of ${blocks.length} blocks`
              : stage === "verify"
                ? "Verifying from the chain…"
                : stage === "sweep"
                  ? "Returning unspent tPOT…"
                  : "Preparing…";
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl bg-surface shadow-float ring-1 ring-sep"
        role="status"
      >
        <div className="flex items-center justify-between bg-bg-2 px-4 py-2.5">
          <span className="text-[13px] font-semibold">
            {phase === "done" ? "1 upload complete" : phase === "error" ? "1 upload stopped" : "Uploading 1 item"}
            {phase === "running" && <span className="ml-1.5 font-normal text-label-2 tabular">{(elapsed / 1000).toFixed(0)}s</span>}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={onExpand} className="rounded-full px-2 py-0.5 text-[13px] text-link hover:bg-accent-soft">
              Details
            </button>
            {phase !== "running" && (
              <button onClick={onClose} aria-label="Dismiss" className="rounded-full p-1 text-label-2 hover:bg-fill">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <DocIcon type={folder ? "DIR" : isPrivate ? "LOCK" : mimeLabel(file.type, file.name)} size={26} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium">{displayName}</div>
            <div className={`text-[12px] ${phase === "error" ? "text-red" : "text-label-2"}`}>{status}</div>
          </div>
          {phase === "done" ? (
            <Check className="size-6 rounded-full bg-green p-1 text-white" strokeWidth={3} />
          ) : phase === "error" ? (
            <X className="size-6 rounded-full bg-red p-1 text-white" strokeWidth={3} />
          ) : (
            <Ring value={progress} size={26} stroke={3} />
          )}
        </div>
        {phase === "done" && link && (
          <div className="flex border-t border-sep px-2 py-1">
            <CopyButton text={link} label="Copy link" className="text-[13px]" />
            <a href={link} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px] text-link hover:bg-accent-soft">
              Open <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" role="dialog" aria-modal aria-label="Upload">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="max-h-[94dvh] w-full max-w-[540px] overflow-y-auto rounded-t-[22px] bg-bg-2 shadow-float sm:rounded-[22px]"
      >
        {/* dialog header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-sep bg-bg-2/95 px-5 py-3.5 backdrop-blur">
          <div className="flex-1 text-[16px] font-semibold">{phase === "done" ? "Stored on Portaldot" : phase === "running" ? "Storing…" : parent ? "Upload new version" : "Upload"}</div>
          {phase === "running" ? (
            <button onClick={onMinimize} aria-label="Minimize" title="Keep uploading in the background" className="grid size-8 place-items-center rounded-full text-label-2 hover:bg-fill">
              <Minus className="size-4" />
            </button>
          ) : (
            <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full text-label-2 hover:bg-fill">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="space-y-6 px-4 pb-8 pt-6 sm:px-6">
          {/* file */}
          <div className="flex flex-col items-center text-center">
            <DocIcon type={folder ? "DIR" : isPrivate ? "LOCK" : mimeLabel(file.type, file.name)} size={56} />
            <div className="mt-3 max-w-full truncate text-[17px] font-semibold">{displayName}</div>
            <div className="text-[13px] text-label-2 tabular">
              {folder && `${folder.files.length} files · `}
              {bytes(displaySize)}
              {prepared && ` · ${prepared.blocks.length} block${prepared.blocks.length === 1 ? "" : "s"} on chain`}
            </div>
          </div>

          {parent && (
            <div className="rounded-xl bg-accent-soft px-4 py-3 text-center text-[14px]">
              New version of <span className="font-semibold">{parent.name}</span>. Unchanged blocks are reused from the previous version.
            </div>
          )}

          <AnimatePresence mode="wait">
            {(phase === "review" || phase === "preparing") && (
              <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                <Group footer="Sealed with AES-256-GCM in this tab. The chain sees only ciphertext; name and type are hidden too. The key goes in the share link after the #.">
                  <Row label={<span className="inline-flex items-center gap-2"><Lock className="size-4 text-label-2" />Private file</span>}>
                    <Switch checked={isPrivate} onChange={setPrivate} label="Private file" disabled={!!folder} />
                  </Row>
                </Group>

                <Group
                  title="Keep on Portaldot"
                  footer={
                    REGISTRY
                      ? "Each payment keeps data 100,800 blocks (about a week). Extra weeks are prepaid to the registry and spent by the keeper. Unused balance is refundable."
                      : "Each payment keeps data 100,800 blocks (about a week). Prepaid keep-alive needs the registry, which isn't deployed on this build."
                  }
                >
                  <div className="px-3 py-2.5">
                    <Segmented
                      label="Keep on Portaldot"
                      value={periods}
                      onChange={setPeriods}
                      options={KEEP.map((k) => ({ value: k.periods, label: k.label, disabled: !REGISTRY && k.periods > 0 }))}
                    />
                  </div>
                </Group>

                {relay?.enabled && (
                  <Group
                    title="Pay with"
                    footer={
                      canSponsor
                        ? sponsored
                          ? relay.permits
                            ? "PotDrive pays every fee. One readable signature covers the storage (MetaTx pallet) and the on-chain registration: the contract re-checks it with sr25519. Nothing leaves your balance."
                            : "PotDrive pays the fees through Portaldot's MetaTx pallet. You sign one readable authorization; nothing leaves your balance. Sponsored files are not registered, so keep-alive is off."
                          : "Sponsored uploads cover up to " + bytes(relay.maxBytes) + " of new data, paid by PotDrive through the MetaTx pallet."
                        : `Sponsorship covers up to ${bytes(relay.maxBytes)} of new data. This upload is larger.`
                    }
                  >
                    <div className="px-3 py-2.5">
                      <Segmented
                        label="Pay with"
                        value={sponsored ? "sponsored" : "wallet"}
                        onChange={(v) => setPay(v as "wallet" | "sponsored")}
                        options={[
                          { value: "wallet", label: "My wallet" },
                          { value: "sponsored", label: "Sponsored, free", disabled: !canSponsor },
                        ]}
                      />
                    </div>
                  </Group>
                )}

                <Group title="Cost" footer={sponsored ? "Fees are paid by the PotDrive relay." : "The upload key gets a 15% buffer over the estimate. Whatever it doesn't spend comes back to you at the end."}>
                  <Row label="Storage" sub={sponsored ? "Paid by the relay, per block" : "Paid per block by the upload key"} detail={estimate && !estimating ? `${formatPot(estimate.storeFees, 2)} tPOT` : <Spinner className="size-4 text-label-3" />} />
                  {REGISTRY && !sponsored && <Row label="Registry record" sub="Fee and storage deposit" detail={estimate ? `${formatPot(estimate.registryFee + estimate.registryDeposit, 2)} tPOT` : "…"} />}
                  {keepAlive > 0n && !sponsored && <Row label="Keep-alive" sub={`${periods} renewals, refundable`} detail={`${formatPot(keepAlive, 2)} tPOT`} />}
                  <Row
                    label={<span className="font-semibold">{sponsored ? "You pay" : "Total, at most"}</span>}
                    detail={<span className="font-semibold text-label">{sponsored ? "0 tPOT" : estimate ? `${formatPot(estimate.total, 2)} tPOT` : "…"}</span>}
                  />
                </Group>

                {estimate?.alreadyStored && (
                  <div className="rounded-xl bg-green-soft px-4 py-3 text-[15px]">This exact file is already on Portaldot. Nothing new is stored; you only {REGISTRY ? "claim the record" : "get the link"}.</div>
                )}
                {estimate && !estimate.alreadyStored && estimate.reused.length > 0 && (
                  <Group gray={false} title="Deduplication" footer="Content-defined chunking found blocks Portaldot already holds, from an earlier version or another file. They are linked, not stored again.">
                    <Row label="Already on Portaldot" sub={`${estimate.reused.length} of ${prepared?.blocks.length} blocks`} detail={bytes(estimate.reusedBytes)} />
                    <Row label="New data to store" detail={bytes(estimate.newBytes)} />
                  </Group>
                )}
                {short && (
                  <div className="rounded-xl bg-orange-soft px-4 py-3 text-[15px]">
                    You have {formatPot(balance!, 2)} tPOT. Test POT comes from the Portaldot team: register a native address on the DoraHacks Hacker House page, or open a ticket in the Portaldot Discord.
                  </div>
                )}
                {error && <p className="px-4 text-[13px] text-red">{error}</p>}

                <div>
                  <Button size="lg" className="w-full" onClick={start} disabled={!estimate || !prepared || phase === "preparing" || short}>
                    {phase === "preparing" ? "Hashing on this device…" : !estimate ? "Estimating…" : "Store on Portaldot"}
                  </Button>
                  <p className="mt-2 text-center text-[13px] text-label-2">
                    {sponsored ? "You'll sign one authorization message in your wallet. No transaction fee." : "You'll approve one transaction in your wallet."}
                  </p>
                </div>
              </motion.div>
            )}

            {(phase === "running" || phase === "done" || (phase === "error" && blocks.length > 0)) && (
              <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="space-y-6">
                <div className="flex items-center gap-5 rounded-xl bg-surface p-5">
                  <div className="relative grid place-items-center">
                    <Ring value={phase === "done" ? 1 : progress} size={84} stroke={7} tone={phase === "done" ? "var(--green)" : "var(--accent)"} />
                    <span className="absolute text-[17px] font-semibold tabular">
                      {phase === "done" ? <Check className="size-7 text-green" strokeWidth={3} /> : `${Math.round(progress * 100)}%`}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <StepList
                      steps={STAGES.map((s) => ({ ...s, detail: s.id === "store" && blocks.length ? `${done}/${blocks.length}` : undefined }))}
                      current={stage}
                      done={phase === "done"}
                      failed={phase === "error"}
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-surface p-4">
                  <BlockGrid blocks={blocks} />
                  <button onClick={() => setShowLog((s) => !s)} className="mt-4 inline-flex items-center gap-1 text-[13px] text-link">
                    {showLog ? "Hide details" : "Show details"} <ChevronDown className={`size-3.5 transition-transform duration-200 ${showLog ? "rotate-180" : ""}`} />
                  </button>
                  {showLog && (
                    <ol className="mt-2 space-y-1 font-mono text-[11.5px] text-label-2 [letter-spacing:0]" aria-live="polite">
                      {log.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ol>
                  )}
                  {stage === "authorize" && phase === "running" && <p className="mt-3 text-[13px] text-label-2">Waiting for your wallet. Approve the one transaction to continue.</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "done" && result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }}>
              <Group title={result.key ? "Private link" : "Share link"} footer={result.key ? "Anyone with this link can open the file. The key after # never reaches a server." : "Anyone with the link can open the file. Their browser verifies every block."}>
                <div className="break-all px-4 py-3 font-mono text-[12px] text-label-2 [letter-spacing:0]">{link}</div>
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <CopyButton text={link} label="Copy link" className="text-[15px]" />
                  <a href={link} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] text-link hover:bg-accent-soft">
                    Open <ArrowUpRight className="size-4" />
                  </a>
                </div>
              </Group>
            </motion.div>
          )}

          {phase === "done" && (
            <Button size="lg" variant="gray" className="w-full" onClick={onClose}>
              Done
            </Button>
          )}

          {phase === "error" && (
            <div className="rounded-xl bg-red-soft p-4 text-[15px]">
              <div className="font-semibold">Upload stopped</div>
              <p className="mt-1 text-label-2">{error}</p>
              {blocks.some((b) => b.status === "inBlock" || b.status === "finalized") && (
                <p className="mt-2 text-[13px] text-label-2">Blocks already stored stay on chain. The upload key is saved in this browser and the Drive will offer to return its balance.</p>
              )}
              <Button variant="gray" size="sm" className="mt-3" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
