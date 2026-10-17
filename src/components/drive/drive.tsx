"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CloudUpload, FolderUp, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useApi, useBalance } from "@/lib/use-api";
import { rememberAccount, rememberedAccount, type InjectedAccount } from "@/lib/wallet";
import { localFiles, pendingSessions, sessionStore, type LocalFile } from "@/lib/library";
import { takePending } from "@/lib/pending";
import { REGISTRY } from "@/lib/config";
import { SIMULATE } from "@/lib/simulate";
import { bytes } from "@/lib/format";
import { useHead } from "../chain-pulse";
import { Button } from "../ui";
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
  const [folder, setFolder] = useState<{ name: string; files: File[] } | null>(null);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const choose = (f: File) => {
    if (f.size > 64 * 1024 * 1024) return setTooBig(`${f.name} is ${bytes(f.size)}. The Drive takes up to 64 MiB per file.`);
    setTooBig(null);
    setFolder(null);
    setUpload(f);
  };

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

  const picker = useRef<HTMLInputElement>(null);
  const folderPicker = useRef<HTMLInputElement>(null);

  if (!account || picking) {
    return (
      <div className="px-5 py-20">
        <ConnectCard onPick={pick} />
        {apiError && <p className="mt-6 text-center text-[13px] text-red">Portaldot node unreachable: {apiError}</p>}
      </div>
    );
  }

  return (
    <div
      className="mx-auto min-h-[70vh] max-w-[1024px] px-5 py-10"
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
        if (f) choose(f);
      }}
    >
      <input
        ref={picker}
        type="file"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) choose(f);
          e.target.value = "";
        }}
      />
      <input
        ref={folderPicker}
        type="file"
        className="sr-only"
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => {
          const list = [...(e.target.files ?? [])].filter((f) => !f.name.startsWith("."));
          e.target.value = "";
          if (!list.length) return;
          const total = list.reduce((n, f) => n + f.size, 0);
          if (total > 64 * 1024 * 1024) return setTooBig(`That folder is ${bytes(total)}. The Drive takes up to 64 MiB per upload.`);
          setTooBig(null);
          setFolder({ name: list[0].webkitRelativePath.split("/")[0] || "folder", files: list });
          setUpload(list[0]);
        }}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-[40px] sm:text-[48px]">Drive</h1>
          <p className="mt-1 text-[15px] text-label-2 tabular">
            {files.length} item{files.length === 1 ? "" : "s"} · {bytes(total)} on Portaldot
            {simulate && " · simulation (dev only)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AccountChip
            account={account}
            balance={simulate ? 5_000n * 10n ** 14n : balance}
            onSwitch={() => setPicking(true)}
            onDisconnect={() => {
              rememberAccount(null);
              setAccount(null);
            }}
          />
          <Button variant="gray" onClick={() => folderPicker.current?.click()} title="Upload a folder or a built website">
            <FolderUp className="size-4" /> Folder
          </Button>
          <Button onClick={() => picker.current?.click()}>
            <Plus className="size-4" strokeWidth={2.5} /> Upload
          </Button>
        </div>
      </div>

      {stranded > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-orange-soft px-4 py-3 text-[15px]">
          <span>An upload in this browser didn&apos;t finish. Its upload key may still hold some of your tPOT.</span>
          <Button size="sm" onClick={recover}>
            Return it
          </Button>
        </div>
      )}
      {tooBig && <p className="mt-4 text-[13px] text-orange">{tooBig}</p>}

      <div className="mt-8 border-t border-sep pt-6">
        {loadingFiles && files.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-bg-2" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <button
            onClick={() => picker.current?.click()}
            className={`flex w-full flex-col items-center rounded-[28px] px-6 py-20 text-center transition-colors duration-200 ${over ? "bg-accent-soft" : "bg-bg-2 hover:bg-fill"}`}
          >
            <CloudUpload className="size-14 text-accent" strokeWidth={1.4} />
            <span className="headline mt-5 text-[28px]">Drop a file to store it on Portaldot.</span>
            <span className="mt-2 max-w-md text-[15px] text-label-2">
              Up to 64 MiB. Hashed on this device first, then written to Portaldot&apos;s TransactionStorage with one approval.
            </span>
          </button>
        ) : (
          <>
            <motion.div layout className={`grid grid-cols-2 gap-2 rounded-2xl transition-colors duration-200 sm:grid-cols-4 lg:grid-cols-6 ${over ? "bg-accent-soft" : ""}`}>
              {files.map((f) => (
                <FileCard key={f.root} f={f} head={head} />
              ))}
            </motion.div>
            <p className="mt-8 text-center text-[13px] text-label-3">
              {REGISTRY ? "Owned files come from the PotDrive registry on Revive." : "Showing files this browser uploaded. The registry isn't deployed on this build yet."}{" "}
              Drag a file anywhere here to upload.
            </p>
          </>
        )}
      </div>

      {upload && (
        <UploadFlow
          api={api}
          account={account}
          balance={simulate ? 5_000n * 10n ** 14n : balance}
          file={upload}
          folder={folder ?? undefined}
          simulate={simulate}
          onClose={() => {
            setUpload(null);
            setFolder(null);
          }}
          onDone={() => refresh()}
        />
      )}
    </div>
  );
}
