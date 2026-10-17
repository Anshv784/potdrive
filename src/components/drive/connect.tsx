"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { accountsOf, detectWallets, WALLET_NAMES, type InjectedAccount } from "@/lib/wallet";
import { formatPot } from "@potdrive/sdk/network";

export function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
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
      setError((e as Error).message || "The wallet refused the connection.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-ink-2 p-6 sm:p-8">
      <div className="grid size-11 place-items-center rounded-xl bg-violet-soft text-violet-2">
        <Wallet className="size-5" />
      </div>
      <h2 className="mt-5 font-serif text-3xl">Connect a Polkadot wallet</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-2">
        PotDrive uses one signature per upload, from any wallet that holds a Portaldot address (they start with a 5). Your
        files are tied to that address.
      </p>

      {wallets === null ? (
        <div className="mt-6 h-11 animate-pulse rounded-lg bg-ink-3" />
      ) : wallets.length === 0 ? (
        <div className="mt-6 rounded-lg border border-line bg-ink-3/60 p-4 text-sm text-text-2">
          No wallet extension found. Install{" "}
          <a className="text-violet-2 underline underline-offset-2" href="https://talisman.xyz" target="_blank" rel="noreferrer">
            Talisman
          </a>
          ,{" "}
          <a className="text-violet-2 underline underline-offset-2" href="https://www.subwallet.app" target="_blank" rel="noreferrer">
            SubWallet
          </a>{" "}
          or{" "}
          <a className="text-violet-2 underline underline-offset-2" href="https://polkadot.js.org/extension/" target="_blank" rel="noreferrer">
            polkadot&#123;.js&#125;
          </a>
          , then reload.
        </div>
      ) : (
        <div className="mt-6 grid gap-2">
          {wallets.map((w) => (
            <button
              key={w}
              onClick={() => open(w)}
              disabled={!!busy}
              className="flex items-center justify-between rounded-lg border border-line-2 px-4 py-3 text-left transition-colors duration-150 hover:border-violet hover:bg-violet-soft disabled:opacity-60"
            >
              <span className="font-medium">{WALLET_NAMES[w] ?? w}</span>
              <span className="text-xs text-text-3">{busy === w ? "Waiting for wallet…" : "Connect"}</span>
            </button>
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="mt-6">
          <div className="stamp text-[10px] text-text-3">Choose an account</div>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
            {accounts.map((a) => (
              <li key={a.address}>
                <button
                  onClick={() => onPick(a)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-150 hover:bg-ink-3"
                >
                  <span className="font-medium">{a.name || "Account"}</span>
                  <span className="font-mono text-xs text-text-3">{shortAddr(a.address)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-bad">{error}</p>}
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
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-lg border border-line-2 bg-ink-2 px-3 py-2 text-left transition-colors duration-150 hover:border-text-3"
      >
        <span className="grid size-7 place-items-center rounded-full bg-violet-soft font-mono text-[10px] text-violet-2">
          {(account.name || "A").slice(0, 1).toUpperCase()}
        </span>
        <span>
          <span className="block text-sm leading-tight">{account.name || shortAddr(account.address)}</span>
          <span className="block font-mono text-[11px] leading-tight text-text-3 tabular">
            {balance === null ? "…" : `${formatPot(balance, 2)} tPOT`}
          </span>
        </span>
        <ChevronDown className="size-4 text-text-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-line bg-ink-2 p-1 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.7)]">
          <div className="px-3 py-2 font-mono text-[11px] break-all text-text-3">{account.address}</div>
          <button
            onClick={() => {
              setOpen(false);
              onSwitch();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-2 hover:bg-ink-3 hover:text-text"
          >
            <Wallet className="size-4" /> Switch account
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDisconnect();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-2 hover:bg-ink-3 hover:text-text"
          >
            <LogOut className="size-4" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
