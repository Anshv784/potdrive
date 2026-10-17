"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Upload } from "lucide-react";
import { motion } from "motion/react";
import { useApi, useBalance } from "@/lib/use-api";
import { rememberAccount, rememberedAccount, type InjectedAccount } from "@/lib/wallet";
import { localFiles, pendingSessions, sessionStore, type LocalFile } from "@/lib/library";
import { takePending } from "@/lib/pending";
import { REGISTRY } from "@/lib/config";
import { SIMULATE } from "@/lib/simulate";
import { bytes } from "@/lib/format";
import { useHead } from "../chain-pulse";
import { AccountChip, ConnectCard } from "./connect";
import { FileCard, type CardFile } from "./file-card";
import { UploadFlow } from "./upload-flow";

const DEMO_ACCOUNT: InjectedAccount = { address: "5CX7xVi2a478v9TgQJ65A1cgWpVwbozohGjdS4gPbH2mKhc6", name: "Demo", source: "simulate" };

export function Drive() {
  const params = useSearchParams();
  const simulate = SIMULATE && params.has("simulate");
  const { api, error: apiError } = useApi();
  const { head } = useHead();
  const [account, setAccount] = useState<InjectedAccount | null>(null);
  const [picking, setPicking] = useState(false);
  const balance = useBalance(api, simulate ? undefined : account?.address);
  const [files, setFiles] = useState<CardFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [upload, setUpload] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [stranded, setStranded] = useState(0);

  useEffect(() => {
    if (simulate) return setAccount(DEMO_ACCOUNT);
    const saved = rememberedAccount();
    if (saved) setAccount(saved);
    const p = takePending();
    if (p) setUpload(p);
  }, [simulate]);

  const refresh = useCallback(async () => {
    if (!account) return setFiles([]);
    setLoadingFiles(true);
    const local = localFiles(account.address);
    const byRoot = new Map<string, CardFile>();
    const fromLocal = (f: LocalFile): CardFile => ({
      root: f.root,
      name: f.name,
      mime: f.mime,
      size: f.size,
      key: f.key,
      isPrivate: !!f.key,
      expiresAt: f.expiresAt,
      registered: false,
    });
    local.forEach((f) => byRoot.set(f.root, fromLocal(f)));
    if (REGISTRY && api && !simulate) {
      try {
        const [{ evmAddressOf, readOwned }, { cidFromContentHash, DAG_PB, RAW }] = await Promise.all([
          import("@potdrive/sdk/registry"),
          import("@potdrive/sdk/cid"),
        ]);
        const owned = await readOwned(REGISTRY, await evmAddressOf(api, account.address));
        for (const r of owned) {
          const cid = cidFromContentHash(r.root, r.chunks > 1 ? DAG_PB : RAW).toString();
          const prev = byRoot.get(cid);
          byRoot.set(cid, {
            root: cid,
            name: prev?.name ?? r.name,
            mime: prev?.mime ?? r.mime,
            size: prev?.size ?? r.size,
            key: prev?.key,
            isPrivate: r.isPrivate,
            expiresAt: r.expiresAt,
            registered: true,
          });
        }
      } catch {
        // registry unreachable: local list still shows
      }
    }
    setFiles([...byRoot.values()]);
    setLoadingFiles(false);
    setStranded(pendingSessions(account.address).length);
  }, [account, api, simulate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pick = (a: InjectedAccount) => {
    setAccount(a);
    rememberAccount(a);
    setPicking(false);
  };

  const recover = async () => {
    if (!api || !account) return;
    const { recoverSession } = await import("@potdrive/sdk/upload");
    for (const s of pendingSessions(account.address)) {
      await recoverSession(api, s.mnemonic, account.address).catch(() => {});
      sessionStore.clear(s.root);
    }
    setStranded(0);
  };

  const total = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);

  if (!account || picking) {
    return (
      <div className="px-4 py-16 sm:px-6">
        <ConnectCard onPick={pick} />
        {apiError && <p className="mt-4 text-center text-sm text-bad">Portaldot node unreachable: {apiError}</p>}
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) setUpload(f);
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-5xl">Your drive</h1>
          <p className="mt-2 font-mono text-xs text-text-3 tabular">
            {files.length} file{files.length === 1 ? "" : "s"} · {bytes(total)} on Portaldot
            {simulate && " · simulation (dev only)"}
          </p>
        </div>
        <AccountChip
          account={account}
          balance={simulate ? 5_000n * 10n ** 14n : balance}
          onSwitch={() => setPicking(true)}
          onDisconnect={() => {
            rememberAccount(null);
            setAccount(null);
          }}
        />
      </div>

      {stranded > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm">
          <span>An upload in this browser didn&apos;t finish. Its upload key may still hold some of your tPOT.</span>
          <button onClick={recover} className="rounded-md bg-warn px-3 py-1.5 text-xs font-medium text-ink">
            Return it to my account
          </button>
        </div>
      )}

      <label
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center transition-[border-color,background-color] duration-200 ${
          over ? "border-violet bg-violet-soft" : "border-line-2 bg-ink-2/60 hover:border-text-3"
        }`}
      >
        <input
          type="file"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setUpload(f);
            e.target.value = "";
          }}
        />
        <span className="grid size-12 place-items-center rounded-xl bg-violet-soft text-violet-2">
          <Upload className="size-5" />
        </span>
        <span className="mt-4 text-lg font-medium">Drop a file, or click to choose</span>
        <span className="mt-1 max-w-md text-sm text-text-3">
          Up to 64 MiB. Hashed in your browser first, then stored in Portaldot&apos;s TransactionStorage with one signature.
        </span>
      </label>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="stamp text-[11px] text-text-3">Records</h2>
          {REGISTRY ? null : <span className="text-xs text-text-3">Registry not deployed yet: showing files remembered by this browser</span>}
        </div>
        {loadingFiles && files.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-ink-3" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-2xl border border-line px-6 py-14 text-center">
            <p className="font-serif text-2xl">Nothing filed yet.</p>
            <p className="mt-2 text-sm text-text-3">Your first upload will show up here as a record card, with how long Portaldot keeps it.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {files.map((f, i) => (
              <FileCard key={f.root} f={f} head={head} index={i} />
            ))}
          </motion.div>
        )}
      </section>

      {upload && (
        <UploadFlow
          api={api}
          account={account}
          balance={simulate ? 5_000n * 10n ** 14n : balance}
          file={upload}
          simulate={simulate}
          onClose={() => setUpload(null)}
          onDone={() => refresh()}
        />
      )}
    </div>
  );
}
