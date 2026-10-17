"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, ChevronsUpDown, Copy, HardDrive, Inbox, LogOut, RefreshCw, TriangleAlert, Wallet } from "lucide-react";
import { accountsOf, detectWallets, WALLET_NAMES, type InjectedAccount } from "@/lib/wallet";
import { formatPot, NETWORK, PLANCK } from "@potdrive/sdk/network";
import { bytes } from "@/lib/format";
import { Mark } from "../logo";
import { Spinner } from "../ui";

export function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function Avatar({ address, size = 32 }: { address: string; size?: number }) {
  // Deterministic three-hue swirl per address, with a soft inner ring.
  let h = 0;
  for (const c of address) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = h % 360;
  const b = (a + 50 + ((h >>> 9) % 70)) % 360;
  const c = (a + 180 + ((h >>> 17) % 60)) % 360;
  return (
    <span
      aria-hidden
      className="relative inline-block shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)]"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from ${h % 360}deg, hsl(${a} 80% 60%), hsl(${b} 85% 58%), hsl(${c} 75% 55%), hsl(${a} 80% 60%))`,
      }}
    >
      <span className="absolute inset-[22%] rounded-full bg-white/25 blur-[1px]" />
    </span>
  );
}

export function ConnectCard({ onPick }: { onPick: (a: InjectedAccount) => void }) {
  const [wallets, setWallets] = useState<string[] | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    detectWallets().then(setWallets);
  }, []);

  const open = async (source: string) => {
    setBusy(source);
    setError(null);
    try {
      const list = await accountsOf(source);
      if (!list.length) setError(`${WALLET_NAMES[source] ?? source} has no Polkadot accounts yet. Create one, then try again.`);
      setAccounts(list);
    } catch (e) {
      setError((e as Error).message || "The wallet declined the connection.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-md text-center">
      <Mark size={64} className="mx-auto" />
      <h1 className="headline mt-6 text-[40px]">Sign in with your wallet.</h1>
      <p className="mt-3 text-[17px] text-label-2">
        PotDrive asks for one signature per upload. Use any wallet that holds a Portaldot address, the ones that start with 5.
      </p>

      <div className="mt-8 text-left">
        {wallets === null ? (
          <div className="grid h-24 place-items-center text-label-3">
            <Spinner className="size-5" />
          </div>
        ) : wallets.length === 0 ? (
          <div className="rounded-xl bg-bg-2 p-5 text-[15px] text-label-2">
            No wallet extension found. Install{" "}
            <a className="text-link hover:underline" href="https://talisman.xyz" target="_blank" rel="noreferrer">
              Talisman
            </a>
            ,{" "}
            <a className="text-link hover:underline" href="https://www.subwallet.app" target="_blank" rel="noreferrer">
              SubWallet
            </a>{" "}
            or{" "}
            <a className="text-link hover:underline" href="https://polkadot.js.org/extension/" target="_blank" rel="noreferrer">
              polkadot&#123;.js&#125;
            </a>
            , then reload this page.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-bg-2">
            {wallets.map((w) => (
              <button
                key={w}
                onClick={() => open(w)}
                disabled={!!busy}
                className="flex w-full items-center gap-3 border-b border-sep px-4 py-3.5 text-left transition-colors duration-200 last:border-0 hover:bg-fill disabled:opacity-60"
              >
                <span className="flex-1 text-[17px]">{WALLET_NAMES[w] ?? w}</span>
                {busy === w ? <Spinner className="size-4 text-label-3" /> : <ChevronRight className="size-4 text-label-3" />}
              </button>
            ))}
          </div>
        )}

        {accounts.length > 0 && (
          <>
            <h3 className="mb-2 mt-6 px-1 text-[13px] font-medium text-label-2">Choose an account</h3>
            <div className="overflow-hidden rounded-xl bg-bg-2">
              {accounts.map((a) => (
                <button
                  key={a.address}
                  onClick={() => onPick(a)}
                  className="flex w-full items-center gap-3 border-b border-sep px-4 py-3 text-left transition-colors duration-200 last:border-0 hover:bg-fill"
                >
                  <Avatar address={a.address} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px]">{a.name || "Account"}</span>
                    <span className="block font-mono text-[12px] text-label-2">{shortAddr(a.address)}</span>
                  </span>
                  <ChevronRight className="size-4 text-label-3" />
                </button>
              ))}
            </div>
          </>
        )}
        {error && <p className="mt-4 px-4 text-[13px] text-red">{error}</p>}
      </div>
    </div>
  );
}

// Measured on Portaldot V3 (docs/limits): about 104.87 tPOT per MiB stored.
const POT_PER_MIB = 104.87;
const EASE = [0.22, 1, 0.36, 1] as const;

export function AccountCard({
  account,
  balance,
  head,
  used,
  files,
  expiring,
  quota,
  hasInbox,
  onInbox,
  onSwitch,
  onDisconnect,
}: {
  account: InjectedAccount;
  balance: bigint | null;
  head: number | null;
  used: number;
  files: number;
  expiring: number;
  quota: number;
  hasInbox: boolean;
  onInbox: () => void;
  onSwitch: () => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const copy = () =>
    navigator.clipboard?.writeText(account.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });

  const pot = balance === null ? null : Number(balance / (PLANCK / 100n)) / 100;
  const mib = pot === null ? null : pot / POT_PER_MIB;
  const empty = balance === 0n;
  const pct = Math.min(100, (used / quota) * 100);
  const wallet = WALLET_NAMES[account.source] ?? (account.source === "simulate" ? "Demo mode" : account.source);
  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-fill";

  return (
    <div ref={box} className="relative">
      <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-sep">
        {/* identity */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex w-full items-center gap-2.5 px-3 pb-2.5 pt-3 text-left transition-colors duration-150 hover:bg-fill/60"
        >
          <span className="relative">
            <Avatar address={account.address} size={34} />
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-green ring-2 ring-surface" title="Connected" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold leading-tight">{account.name || "Account"}</span>
            <span className="block truncate text-[11px] leading-tight text-label-3">
              {wallet} · <span className="font-mono">{shortAddr(account.address)}</span>
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-label-3" />
        </button>

        {/* balance */}
        <div className={`mx-2 rounded-xl px-3 py-2.5 ${empty ? "bg-orange-soft" : "bg-bg-2"}`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-label-3">Balance</span>
            {mib !== null && !empty && <span className="text-[11px] text-label-3 tabular">≈ {mib >= 10 ? Math.floor(mib) : mib.toFixed(1)} MiB of storage</span>}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-[20px] font-semibold tracking-tight tabular">{balance === null ? "…" : formatPot(balance, 2)}</span>
            <span className="text-[12px] font-medium text-label-2">{NETWORK.symbol}</span>
          </div>
          {empty && (
            <a href="/docs/quickstart#before" className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-orange hover:underline">
              <Wallet className="size-3.5" /> Get test POT to start uploading
            </a>
          )}
        </div>

        {/* storage */}
        <div className="px-3 pb-3 pt-2.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <HardDrive className="size-3.5 text-label-2" /> On Portaldot
            </span>
            <span className="text-label-3 tabular">
              {bytes(used)} · {files} item{files === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
            <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${Math.max(pct, used ? 2 : 0)}%` }} transition={{ duration: 0.6, ease: EASE }} />
          </div>
          {expiring > 0 && (
            <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-orange">
              <TriangleAlert className="size-3.5" /> {expiring} expiring within 2 days
            </div>
          )}
        </div>
      </div>

      {/* menu, opens upward */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ transformOrigin: "50% 100%" }}
            className="absolute inset-x-0 bottom-full z-30 mb-2 overflow-hidden rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-sep"
          >
            <div className="px-2.5 pb-2 pt-1.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-label-3">Address</div>
              <div className="mt-1 break-all font-mono text-[11px] leading-relaxed text-label-2">{account.address}</div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-label-3">
                <span className="size-1.5 rounded-full bg-green" /> {NETWORK.name}
                {head !== null && <span className="tabular">· #{head.toLocaleString("en-US")}</span>}
              </div>
            </div>
            <div className="my-1 h-px bg-sep" />
            <button role="menuitem" onClick={copy} className={item}>
              {copied ? <Check className="size-4 text-green" /> : <Copy className="size-4 text-label-2" />}
              {copied ? "Copied" : "Copy address"}
            </button>
            {!hasInbox && (
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onInbox();
                }}
                className={item}
              >
                <Inbox className="size-4 text-label-2" /> Set up share inbox
              </button>
            )}
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSwitch();
              }}
              className={item}
            >
              <RefreshCw className="size-4 text-label-2" /> Switch account
            </button>
            <div className="my-1 h-px bg-sep" />
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDisconnect();
              }}
              className={`${item} text-red`}
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
