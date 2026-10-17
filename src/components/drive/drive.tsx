"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowUpDown,
  ArrowUpRight,
  CloudUpload,
  Clock3,
  FileUp,
  FolderUp,
  Globe,
  HardDrive,
  Info,
  LayoutGrid,
  Link2,
  List,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Timer,
  X,
} from "lucide-react";
import { formatPot, NETWORK } from "@potdrive/sdk/network";
import { shortCid } from "@potdrive/sdk/cid";
import { useApi, useBalance } from "@/lib/use-api";
import { rememberAccount, rememberedAccount, type InjectedAccount } from "@/lib/wallet";
import { forgetLocalFile, localFiles, pendingSessions, sessionStore } from "@/lib/library";
import { takePending } from "@/lib/pending";
import { REGISTRY, SITE } from "@/lib/config";
import { SIMULATE } from "@/lib/simulate";
import { bytes, duration, mimeLabel, num, untilBlock } from "@/lib/format";
import { useHead } from "../chain-pulse";
import { CopyButton } from "../code";
import { Button, DocIcon, Ring } from "../ui";
import { AccountChip, ConnectCard } from "./connect";
import { expiryTone, type CardFile } from "./file-card";
import { UploadFlow } from "./upload-flow";

const DEMO_ACCOUNT: InjectedAccount = { address: "5CX7xVi2a478v9TgQJ65A1cgWpVwbozohGjdS4gPbH2mKhc6", name: "Demo", source: "simulate" };
const MAX = 64 * 1024 * 1024;
const SOON = Math.round((2 * 86_400_000) / NETWORK.blockTimeMs); // 2 days in blocks

type View = "all" | "recent" | "sites" | "private" | "expiring";
type Sort = "name" | "size" | "date" | "expiry";

export interface DriveFile extends CardFile {
  createdAt?: number;
  storedAtBlock?: number;
  blocks?: number;
}

const VIEWS: { id: View; label: string; icon: typeof HardDrive }[] = [
  { id: "all", label: "My Drive", icon: HardDrive },
  { id: "recent", label: "Recent", icon: Clock3 },
  { id: "sites", label: "Websites", icon: Globe },
  { id: "private", label: "Private", icon: Lock },
  { id: "expiring", label: "Expiring soon", icon: Timer },
];

function hrefOf(f: DriveFile) {
  if (f.mime === "inode/directory") return `/ipfs/${f.root}/`;
  return `/f/${f.root}${f.name && !f.isPrivate ? `?name=${encodeURIComponent(f.name)}` : ""}${f.key ? `#k=${f.key}` : ""}`;
}

const linkOf = (f: DriveFile) => `${SITE}${hrefOf(f)}`;
const isDir = (f: DriveFile) => f.mime === "inode/directory";

function storedTime(f: DriveFile, head: number | null): number | undefined {
  if (f.createdAt) return f.createdAt;
  if (f.storedAtBlock && head) return Date.now() - (head - f.storedAtBlock) * NETWORK.blockTimeMs;
}

function relTime(t?: number) {
  if (!t) return "–";
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function kindOf(f: DriveFile) {
  if (isDir(f)) return "Website / folder";
  if (f.isPrivate) return "Private file";
  const l = mimeLabel(f.mime, f.name);
  const family = f.mime.startsWith("image/") ? "image" : f.mime.startsWith("video/") ? "video" : f.mime.startsWith("audio/") ? "audio" : "document";
  return l === "FILE" ? "Document" : `${l} ${family}`;
}

const open = (f: DriveFile) => window.open(hrefOf(f), isDir(f) ? "_blank" : "_self");

export function Drive() {
  const params = useSearchParams();
  const simulate = SIMULATE && params.has("simulate");
  const { api, error: apiError } = useApi();
  const { head } = useHead();
  const [account, setAccount] = useState<InjectedAccount | null>(null);
  const [picking, setPicking] = useState(false);
  const realBalance = useBalance(api, simulate ? undefined : account?.address);
  const balance = simulate ? 5_000n * 10n ** 14n : realBalance;
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [upload, setUpload] = useState<File | null>(null);
  const [folder, setFolder] = useState<{ name: string; files: File[] } | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stranded, setStranded] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState<Sort>("date");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; root: string } | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const folderPicker = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (simulate) return setAccount(DEMO_ACCOUNT);
    const saved = rememberedAccount();
    if (saved) setAccount(saved);
    const p = takePending();
    if (p) setUpload(p);
    try {
      const l = localStorage.getItem("potdrive.layout");
      if (l === "grid" || l === "list") setLayout(l);
    } catch {}
  }, [simulate]);

  const refresh = useCallback(async () => {
    if (!account) return setFiles([]);
    setLoading(true);
    const byRoot = new Map<string, DriveFile>();
    for (const f of localFiles(account.address)) {
      byRoot.set(f.root, {
        root: f.root,
        name: f.name,
        mime: f.mime,
        size: f.size,
        key: f.key,
        isPrivate: !!f.key,
        expiresAt: f.expiresAt,
        registered: false,
        createdAt: f.createdAt,
        blocks: f.blocks,
      });
    }
    if (REGISTRY && api && !simulate) {
      try {
        const [{ evmAddressOf, readOwned }, { cidFromContentHash, DAG_PB, RAW }] = await Promise.all([import("@potdrive/sdk/registry"), import("@potdrive/sdk/cid")]);
        for (const r of await readOwned(REGISTRY, await evmAddressOf(api, account.address))) {
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
            createdAt: prev?.createdAt,
            storedAtBlock: r.storedAt,
            blocks: prev?.blocks ?? r.chunks,
          });
        }
      } catch {
        // registry unreachable: the local list still shows
      }
    }
    setFiles([...byRoot.values()]);
    setLoading(false);
    setStranded(pendingSessions(account.address).length);
  }, [account, api, simulate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const chooseFile = (f: File) => {
    if (f.size > MAX) return setNotice(`${f.name} is ${bytes(f.size)}. The Drive takes up to 64 MiB per upload; the CLI has no cap.`);
    setNotice(null);
    setFolder(null);
    setMinimized(false);
    setUpload(f);
  };

  const chooseFolder = (list: File[]) => {
    const clean = list.filter((f) => !f.name.startsWith("."));
    if (!clean.length) return;
    const total = clean.reduce((n, f) => n + f.size, 0);
    if (total > MAX) return setNotice(`That folder is ${bytes(total)}. The Drive takes up to 64 MiB per upload.`);
    setNotice(null);
    setFolder({ name: clean[0].webkitRelativePath.split("/")[0] || "folder", files: clean });
    setMinimized(false);
    setUpload(clean[0]);
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

  const expiring = useCallback((f: DriveFile) => !!(f.expiresAt && head && f.expiresAt - head < SOON), [head]);

  const counts = useMemo(
    () => ({
      all: files.length,
      recent: 0,
      sites: files.filter(isDir).length,
      private: files.filter((f) => f.isPrivate).length,
      expiring: files.filter(expiring).length,
    }),
    [files, expiring],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = files.filter((f) => {
      if (view === "sites" && !isDir(f)) return false;
      if (view === "private" && !f.isPrivate) return false;
      if (view === "expiring" && !expiring(f)) return false;
      return !q || f.name.toLowerCase().includes(q) || f.root.includes(q);
    });
    const time = (f: DriveFile) => storedTime(f, head) ?? 0;
    list.sort((a, b) =>
      sort === "name"
        ? (a.name || "~").localeCompare(b.name || "~")
        : sort === "size"
          ? b.size - a.size
          : sort === "expiry"
            ? (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity)
            : time(b) - time(a),
    );
    return view === "recent" ? list.slice(0, 20) : list;
  }, [files, view, query, sort, head, expiring]);

  const total = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);
  const sel = files.find((f) => f.root === selected) ?? null;

  if (!account || picking) {
    return (
      <div className="px-5 py-20">
        <ConnectCard
          onPick={(a) => {
            setAccount(a);
            rememberAccount(a);
            setPicking(false);
          }}
        />
        {apiError && <p className="mt-6 text-center text-[13px] text-red">Portaldot node unreachable: {apiError}</p>}
      </div>
    );
  }

  const saveLayout = (l: "list" | "grid") => {
    setLayout(l);
    try {
      localStorage.setItem("potdrive.layout", l);
    } catch {}
  };

  const openMenu = (f: DriveFile, x: number, y: number) => {
    setSelected(f.root);
    setMenu({ x, y, root: f.root });
  };

  return (
    <div
      className="relative flex h-[calc(100dvh-5.4rem)] overflow-hidden sm:h-[calc(100dvh-3rem)]"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        dragDepth.current++;
        setDragging(true);
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) chooseFile(f);
      }}
      onClick={() => {
        setMenu(null);
        setNewOpen(false);
      }}
    >
      <input
        ref={picker}
        type="file"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) chooseFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={folderPicker}
        type="file"
        className="sr-only"
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => {
          chooseFolder([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />

      {/* sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sep bg-surface-2 px-3 py-4 md:flex">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNewOpen((o) => !o);
            }}
            aria-haspopup="menu"
            aria-expanded={newOpen}
            className="flex h-12 items-center gap-2.5 rounded-2xl bg-surface px-4 text-[15px] font-medium shadow-card ring-1 ring-sep transition-[box-shadow,transform] duration-200 hover:shadow-float active:scale-[0.98]"
          >
            <Plus className="size-5 text-accent" strokeWidth={2.4} /> New
          </button>
          <AnimatePresence>
            {newOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="material absolute left-0 top-14 z-30 w-56 origin-top-left overflow-hidden rounded-xl p-1 shadow-float ring-1 ring-sep"
                onClick={(e) => e.stopPropagation()}
                role="menu"
              >
                <MenuItem
                  icon={FileUp}
                  label="File upload"
                  onClick={() => {
                    setNewOpen(false);
                    picker.current?.click();
                  }}
                />
                <MenuItem
                  icon={FolderUp}
                  label="Folder or website"
                  onClick={() => {
                    setNewOpen(false);
                    folderPicker.current?.click();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="mt-5 space-y-0.5" aria-label="Drive sections">
          {VIEWS.map((v) => {
            const on = view === v.id;
            const n = counts[v.id];
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                aria-current={on ? "page" : undefined}
                className={`flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[14px] transition-colors duration-150 ${on ? "bg-accent-soft font-medium text-accent" : "text-label hover:bg-fill"}`}
              >
                <v.icon className="size-[18px]" strokeWidth={1.8} />
                <span className="flex-1 text-left">{v.label}</span>
                {n > 0 && <span className={`text-[12px] tabular ${v.id === "expiring" ? "text-orange" : "text-label-3"}`}>{n}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="px-1">
            <div className="flex items-center gap-2 text-[13px] font-medium">
              <HardDrive className="size-4 text-label-2" /> On Portaldot
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, (total / MAX) * 100)}%` }} />
            </div>
            <div className="mt-1.5 text-[12px] text-label-2 tabular">
              {bytes(total)} in {files.length} item{files.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className={`rounded-xl px-3 py-2.5 ${balance === 0n ? "bg-orange-soft" : "bg-fill"}`}>
            <div className="text-[12px] text-label-2">Balance</div>
            <div className="text-[15px] font-semibold tabular">{balance === null ? "…" : `${formatPot(balance, 2)} tPOT`}</div>
            {balance === 0n && (
              <a href="/docs/quickstart#before" className="mt-1 block text-[12px] leading-snug text-link hover:underline">
                No test POT yet. How to get it
              </a>
            )}
          </div>
          <AccountChip
            account={account}
            balance={balance}
            onSwitch={() => setPicking(true)}
            onDisconnect={() => {
              rememberAccount(null);
              setAccount(null);
            }}
          />
        </div>
      </aside>

      {/* main */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-sep px-4 py-2.5 sm:px-6">
          <button onClick={() => picker.current?.click()} className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-white md:hidden" aria-label="Upload a file">
            <Plus className="size-5" />
          </button>
          <label className="flex h-9 flex-1 items-center gap-2 rounded-full bg-bg-2 px-3.5 text-[14px] transition-colors focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent sm:max-w-md">
            <Search className="size-4 text-label-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or CID"
              aria-label="Search files"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-label-3 focus-visible:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <X className="size-4 text-label-3" />
              </button>
            )}
          </label>
          <div className="ml-auto flex items-center gap-1">
            <label className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-label-2 hover:bg-fill sm:flex">
              <ArrowUpDown className="size-4" />
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="appearance-none bg-transparent pr-1 outline-none" aria-label="Sort by">
                <option value="date">Date stored</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="expiry">Expires</option>
              </select>
            </label>
            <div className="flex rounded-lg bg-fill p-0.5" role="radiogroup" aria-label="Layout">
              {(["list", "grid"] as const).map((l) => (
                <button
                  key={l}
                  role="radio"
                  aria-checked={layout === l}
                  aria-label={l === "list" ? "List view" : "Grid view"}
                  onClick={() => saveLayout(l)}
                  className={`grid size-7 place-items-center rounded-md transition-colors ${layout === l ? "bg-surface shadow-card" : "text-label-2"}`}
                >
                  {l === "list" ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-5 sm:px-6" onClick={() => setSelected(null)}>
          <div className="flex items-baseline justify-between">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{VIEWS.find((v) => v.id === view)!.label}</h1>
            {simulate && <span className="text-[12px] text-label-3">simulation · dev only</span>}
          </div>

          {/* mobile sections */}
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${view === v.id ? "bg-accent text-white" : "bg-bg-2 text-label"}`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {stranded > 0 && (
            <Banner action={<Button size="sm" onClick={recover}>Return it</Button>}>An upload in this browser didn&apos;t finish. Its upload key may still hold some of your tPOT.</Banner>
          )}
          {notice && (
            <Banner
              action={
                <button onClick={() => setNotice(null)} aria-label="Dismiss" className="text-label-2">
                  <X className="size-4" />
                </button>
              }
            >
              {notice}
            </Banner>
          )}
          {balance === 0n && files.length === 0 && (
            <Banner action={<a href="/docs/quickstart#before" className="text-[14px] text-link hover:underline">How to get tPOT</a>}>
              Your account has 0 tPOT, so uploads can&apos;t be paid for yet. Test POT comes from the Portaldot team.
            </Banner>
          )}

          {view === "all" && !query && layout === "list" && files.length > 4 && (
            <div className="mt-5">
              <div className="mb-2 text-[13px] font-medium text-label-2">Suggested</div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[...files]
                  .sort((a, b) => (storedTime(b, head) ?? 0) - (storedTime(a, head) ?? 0))
                  .slice(0, 4)
                  .map((f) => (
                    <button key={f.root} onClick={() => open(f)} className="overflow-hidden rounded-xl bg-bg-2 text-left ring-1 ring-sep transition-shadow hover:shadow-float">
                      <div className="grid h-24 place-items-center bg-surface">
                        <Thumb f={f} size={38} />
                      </div>
                      <div className="px-3 py-2">
                        <div className="truncate text-[13px] font-medium">{f.name || "Private file"}</div>
                        <div className="text-[11px] text-label-2">Stored {relTime(storedTime(f, head))}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            {loading && files.length === 0 ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded-lg bg-bg-2" />
                ))}
              </div>
            ) : shown.length === 0 ? (
              <Empty view={view} query={query} onUpload={() => picker.current?.click()} onFolder={() => folderPicker.current?.click()} />
            ) : layout === "list" ? (
              <table className="w-full table-fixed text-left text-[13px]">
                <thead className="text-[12px] text-label-2">
                  <tr className="border-b border-sep">
                    <th className="py-2 pl-2 font-normal">Name</th>
                    <th className="hidden w-36 py-2 font-normal lg:table-cell">Kind</th>
                    <th className="hidden w-24 py-2 font-normal sm:table-cell">Size</th>
                    <th className="hidden w-28 py-2 font-normal md:table-cell">Stored</th>
                    <th className="w-28 py-2 font-normal">Expires</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((f) => {
                    const on = selected === f.root;
                    const { frac, tone } = expiryTone(f.expiresAt, head);
                    const muted = on ? "text-white/80" : "text-label-2";
                    return (
                      <tr
                        key={f.root}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(f.root);
                        }}
                        onDoubleClick={() => open(f)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openMenu(f, e.clientX, e.clientY);
                        }}
                        className={`cursor-default border-b border-sep transition-colors ${on ? "bg-accent text-white" : "hover:bg-bg-2"}`}
                      >
                        <td className="py-2 pl-2">
                          <div className="flex items-center gap-3">
                            <Thumb f={f} size={22} />
                            <span className="truncate font-medium">{f.name || "Private file"}</span>
                            {f.isPrivate && <Lock className={`size-3.5 shrink-0 ${on ? "text-white/80" : "text-label-3"}`} />}
                          </div>
                        </td>
                        <td className={`hidden truncate py-2 lg:table-cell ${muted}`}>{kindOf(f)}</td>
                        <td className={`hidden py-2 tabular sm:table-cell ${muted}`}>{bytes(f.size)}</td>
                        <td className={`hidden py-2 md:table-cell ${muted}`}>{relTime(storedTime(f, head))}</td>
                        <td className={`py-2 ${muted}`}>
                          <span className="inline-flex items-center gap-1.5 tabular">
                            <Ring value={frac} size={12} stroke={2.5} tone={on ? "white" : tone} />
                            {f.expiresAt && head ? untilBlock(f.expiresAt, head) : "–"}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const r = e.currentTarget.getBoundingClientRect();
                              openMenu(f, r.right - 208, r.bottom + 4);
                            }}
                            aria-label={`Actions for ${f.name || "file"}`}
                            className={`rounded-md p-1 ${on ? "hover:bg-white/20" : "text-label-2 hover:bg-fill"}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {shown.map((f) => {
                  const on = selected === f.root;
                  const { frac, tone } = expiryTone(f.expiresAt, head);
                  return (
                    <div
                      key={f.root}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(f.root);
                      }}
                      onDoubleClick={() => open(f)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openMenu(f, e.clientX, e.clientY);
                      }}
                      className={`cursor-default overflow-hidden rounded-xl transition-[box-shadow,background-color] ${on ? "bg-accent-soft ring-2 ring-accent" : "bg-bg-2 ring-1 ring-sep hover:shadow-float"}`}
                    >
                      <div className="grid h-32 place-items-center overflow-hidden bg-surface">
                        <Thumb f={f} size={56} large />
                      </div>
                      <div className="px-3 py-2.5">
                        <div className="truncate text-[13px] font-medium">{f.name || "Private file"}</div>
                        <div className="flex items-center gap-1 text-[11px] text-label-2 tabular">
                          <Ring value={frac} size={10} stroke={2} tone={tone} />
                          {bytes(f.size)} · {f.expiresAt && head ? untilBlock(f.expiresAt, head) : "–"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* details */}
      <AnimatePresence>
        {sel && (
          <motion.aside
            key="details"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="absolute inset-y-0 right-0 z-20 w-[320px] overflow-y-auto border-l border-sep bg-surface-2 shadow-float lg:static lg:shadow-none"
            onClick={(e) => e.stopPropagation()}
            aria-label="File details"
          >
            <Details f={sel} head={head} onClose={() => setSelected(null)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* context menu */}
      {menu &&
        (() => {
          const f = files.find((x) => x.root === menu.root);
          if (!f) return null;
          return (
            <div
              className="material fixed z-50 w-52 overflow-hidden rounded-xl p-1 shadow-float ring-1 ring-sep"
              style={{ left: Math.max(8, Math.min(menu.x, window.innerWidth - 216)), top: Math.min(menu.y, window.innerHeight - 230) }}
              onClick={(e) => e.stopPropagation()}
              role="menu"
            >
              <MenuItem
                icon={ArrowUpRight}
                label="Open"
                onClick={() => {
                  setMenu(null);
                  open(f);
                }}
              />
              <MenuItem
                icon={Link2}
                label="Copy link"
                onClick={() => {
                  setMenu(null);
                  navigator.clipboard.writeText(linkOf(f));
                }}
              />
              {!isDir(f) && !f.isPrivate && (
                <MenuItem
                  icon={ArrowDownToLine}
                  label="Download"
                  onClick={() => {
                    setMenu(null);
                    window.open(`/ipfs/${f.root}?download=${encodeURIComponent(f.name || f.root)}`);
                  }}
                />
              )}
              <MenuItem
                icon={Info}
                label="Get Info"
                onClick={() => {
                  setMenu(null);
                  setSelected(f.root);
                }}
              />
              <div className="my-1 border-t border-sep" />
              <MenuItem
                icon={X}
                label="Remove from this list"
                danger
                onClick={() => {
                  setMenu(null);
                  forgetLocalFile(f.root);
                  setSelected(null);
                  refresh();
                }}
              />
            </div>
          );
        })()}

      {/* full-window drop target */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-3 z-40 grid place-items-center rounded-3xl border-2 border-dashed border-accent bg-accent-soft backdrop-blur-sm"
          >
            <div className="text-center">
              <CloudUpload className="mx-auto size-14 text-accent" strokeWidth={1.4} />
              <div className="mt-3 text-[22px] font-semibold">Drop to store on Portaldot</div>
              <div className="mt-1 text-[14px] text-label-2">You&apos;ll review the cost before anything is sent.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {upload && (
        <UploadFlow
          api={api}
          account={account}
          balance={balance}
          file={upload}
          folder={folder ?? undefined}
          simulate={simulate}
          minimized={minimized}
          onMinimize={() => setMinimized(true)}
          onExpand={() => setMinimized(false)}
          onClose={() => {
            setUpload(null);
            setFolder(null);
            setMinimized(false);
          }}
          onDone={() => refresh()}
        />
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Info; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[14px] transition-colors hover:bg-accent hover:text-white ${danger ? "text-red" : ""}`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function Thumb({ f, size, large }: { f: DriveFile; size: number; large?: boolean }) {
  const image = f.mime.startsWith("image/") && !f.mime.includes("svg") && !f.isPrivate;
  if (image && large) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/ipfs/${f.root}`} alt="" loading="lazy" className="size-full object-cover" />;
  }
  return <DocIcon type={isDir(f) ? "DIR" : f.isPrivate ? "LOCK" : mimeLabel(f.mime, f.name)} size={size} />;
}

function Banner({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-orange-soft px-4 py-3 text-[14px]">
      <span>{children}</span>
      {action}
    </div>
  );
}

const EMPTY: Record<View, [string, string]> = {
  all: ["Your drive is empty.", "Drop a file anywhere on this page, or use New. Files are hashed on this device first, then stored in Portaldot's TransactionStorage with one approval."],
  recent: ["Nothing recent.", "Files you store show up here."],
  sites: ["No websites yet.", "Upload a folder with an index.html, or run potdrive deploy ./dist. It's served from the chain at /ipfs/<cid>/."],
  private: ["No private files.", "Turn on Private when uploading. The file is encrypted on this device and the key lives only in its link."],
  expiring: ["Nothing expiring soon.", "Files with under two days of retention left show up here so you can renew them."],
};

function Empty({ view, query, onUpload, onFolder }: { view: View; query: string; onUpload: () => void; onFolder: () => void }) {
  if (query) return <div className="py-24 text-center text-[15px] text-label-2">No files match &ldquo;{query}&rdquo;.</div>;
  const [title, body] = EMPTY[view];
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <DocIcon type={view === "sites" ? "DIR" : view === "private" ? "LOCK" : "FILE"} size={64} />
      <div className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">{title}</div>
      <p className="mt-2 max-w-md text-[15px] text-label-2">{body}</p>
      {(view === "all" || view === "sites") && (
        <div className="mt-6 flex gap-3">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onUpload();
            }}
          >
            <FileUp className="size-4" /> Upload file
          </Button>
          <Button
            variant="gray"
            onClick={(e) => {
              e.stopPropagation();
              onFolder();
            }}
          >
            <FolderUp className="size-4" /> Upload folder
          </Button>
        </div>
      )}
    </div>
  );
}

function Details({ f, head, onClose }: { f: DriveFile; head: number | null; onClose: () => void }) {
  const { frac, tone } = expiryTone(f.expiresAt, head);
  const image = f.mime.startsWith("image/") && !f.mime.includes("svg") && !f.isPrivate;
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold">{f.name || "Private file"}</div>
          <div className="text-[13px] text-label-2">{kindOf(f)}</div>
        </div>
        <button onClick={onClose} aria-label="Close details" className="rounded-full p-1 text-label-2 hover:bg-fill">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid h-44 place-items-center overflow-hidden rounded-xl bg-bg-2">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/ipfs/${f.root}`} alt="" className="size-full object-contain" />
        ) : (
          <Thumb f={f} size={72} />
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => open(f)} className="flex h-9 items-center justify-center rounded-full bg-accent text-[14px] text-white hover:bg-accent-hover">
          Open
        </button>
        <CopyButton text={linkOf(f)} label="Copy link" className="h-9 justify-center !rounded-full bg-fill text-[14px] !text-label hover:bg-fill-2" />
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-xl bg-bg-2 p-3">
        <Ring value={frac} size={40} stroke={4} tone={tone} />
        <div>
          <div className="text-[14px] font-medium">{f.expiresAt && head ? `Kept for ${untilBlock(f.expiresAt, head)}` : "Retention unknown"}</div>
          <div className="text-[12px] text-label-2 tabular">{f.expiresAt ? `until block ${num(f.expiresAt)}` : `${num(NETWORK.retentionBlocks)} blocks per payment`}</div>
        </div>
      </div>

      <dl className="mt-5 space-y-3 text-[13px]">
        {[
          ["Size", bytes(f.size)],
          ["Blocks on chain", f.blocks ? num(f.blocks) : "–"],
          ["Stored", relTime(storedTime(f, head))],
          ["Ownership", f.registered ? "Registry on Revive" : "This browser"],
          ["Time left", f.expiresAt && head ? duration((f.expiresAt - head) * NETWORK.blockTimeMs) : "–"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-label-2">{k}</dt>
            <dd className="text-right tabular">{v}</dd>
          </div>
        ))}
        <div>
          <dt className="text-label-2">Content ID</dt>
          <dd className="mt-1 flex items-center gap-1">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px]" title={f.root}>
              {shortCid(f.root, 14, 8)}
            </code>
            <CopyButton text={f.root} label="Copy" />
          </dd>
        </div>
      </dl>
      {f.isPrivate && (
        <p className="mt-5 rounded-xl bg-bg-2 p-3 text-[12px] leading-relaxed text-label-2">
          Encrypted on your device. Its key is saved in this browser and in the copied link, nowhere else.
        </p>
      )}
    </div>
  );
}
