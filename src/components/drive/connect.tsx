"use client";

import { useEffect, useState } from "react";
import { ChevronRight, LogOut, RefreshCw } from "lucide-react";
import { accountsOf, detectWallets, WALLET_NAMES, type InjectedAccount } from "@/lib/wallet";
import { formatPot } from "@potdrive/sdk/network";
import { Mark } from "../logo";
import { Spinner } from "../ui";

export function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function Avatar({ address, size = 32 }: { address: string; size?: number }) {
  // Deterministic two-tone gradient per address.
  let h = 0;
  for (const c of address) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = h % 360;
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${a} 80% 62%), hsl(${(a + 60) % 360} 80% 52%))` }}
    />
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
            <h3 className="mb-1.5 mt-6 px-4 text-[13px] uppercase text-label-2">Choose an account</h3>
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

export function AccountChip({
  account,
  balance,
  onSwitch,
  onDisconnect,
}: {
  account: InjectedAccount;
  balance: bigint | null;
  onSwitch: () => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-full bg-bg-2 py-1.5 pl-1.5 pr-4 transition-colors duration-200 hover:bg-fill">
        <Avatar address={account.address} size={28} />
        <span className="text-left">
          <span className="block text-[13px] font-medium leading-tight">{account.name || shortAddr(account.address)}</span>
          <span className="block text-[12px] leading-tight text-label-2 tabular">{balance === null ? "…" : `${formatPot(balance, 2)} tPOT`}</span>
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="material absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl shadow-float ring-1 ring-sep">
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar address={account.address} size={36} />
              <div className="min-w-0">
                <div className="text-[15px] font-medium">{account.name || "Account"}</div>
                <div className="break-all font-mono text-[11px] text-label-2">{account.address}</div>
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                onSwitch();
              }}
              className="flex w-full items-center gap-2 border-t border-sep px-4 py-2.5 text-[15px] hover:bg-fill"
            >
              <RefreshCw className="size-4 text-label-2" /> Switch account
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onDisconnect();
              }}
              className="flex w-full items-center gap-2 border-t border-sep px-4 py-2.5 text-[15px] text-red hover:bg-fill"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
