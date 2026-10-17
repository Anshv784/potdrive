"use client";

import type { Signer } from "@polkadot/types/types";

// Minimal injected-wallet client (polkadot{.js}, Talisman, SubWallet, Nova…).
// The @polkadot/extension-dapp helper pins an older @polkadot/util, so we talk
// to window.injectedWeb3 directly. It is a tiny, stable interface.

export interface InjectedAccount {
  address: string;
  name?: string;
  type?: string;
  source: string;
}

interface Injected {
  accounts: { get(anyType?: boolean): Promise<Omit<InjectedAccount, "source">[]> };
  signer: Signer;
}

interface InjectedWindowProvider {
  enable(origin: string): Promise<Injected>;
  version?: string;
}

declare global {
  interface Window {
    injectedWeb3?: Record<string, InjectedWindowProvider>;
  }
}

export const WALLET_NAMES: Record<string, string> = {
  "polkadot-js": "Polkadot{.js}",
  talisman: "Talisman",
  "subwallet-js": "SubWallet",
  nova: "Nova Wallet",
  "fearless-wallet": "Fearless",
  enkrypt: "Enkrypt",
};

export async function detectWallets(waitMs = 600): Promise<string[]> {
  // Extensions inject shortly after load.
  const read = () => Object.keys(window.injectedWeb3 ?? {});
  if (read().length) return read();
  await new Promise((r) => setTimeout(r, waitMs));
  return read();
}

const enabled = new Map<string, Promise<Injected>>();

export function enable(source: string): Promise<Injected> {
  let p = enabled.get(source);
  if (!p) {
    const provider = window.injectedWeb3?.[source];
    if (!provider) return Promise.reject(new Error(`${source} is not installed`));
    p = provider.enable("PotDrive");
    p.catch(() => enabled.delete(source));
    enabled.set(source, p);
  }
  return p;
}

export async function accountsOf(source: string): Promise<InjectedAccount[]> {
  const inj = await enable(source);
  const list = await inj.accounts.get(true);
  return list.filter((a) => a.type !== "ethereum").map((a) => ({ ...a, source }));
}

export async function signerOf(source: string): Promise<Signer> {
  return (await enable(source)).signer;
}

const KEY = "potdrive.account";

export function rememberAccount(a: InjectedAccount | null) {
  try {
    if (a) localStorage.setItem(KEY, JSON.stringify({ address: a.address, source: a.source, name: a.name }));
    else localStorage.removeItem(KEY);
  } catch {}
}

export function rememberedAccount(): InjectedAccount | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as InjectedAccount) : null;
  } catch {
    return null;
  }
}
