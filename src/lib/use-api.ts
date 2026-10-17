"use client";

import { useEffect, useState } from "react";
import type { ApiPromise } from "@polkadot/api";

let shared: Promise<ApiPromise> | null = null;

// @polkadot/api is heavy; only pages that sign or read chain state load it.
export function loadApi(): Promise<ApiPromise> {
  if (!shared) {
    shared = import("@potdrive/sdk/chain").then(async ({ connect }) => {
      const api = await connect();
      await api.isReady;
      return api;
    });
    shared.catch(() => (shared = null));
  }
  return shared;
}

export function useApi() {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadApi()
      .then((a) => live && setApi(a))
      .catch((e) => live && setError(String(e?.message ?? e)));
    return () => {
      live = false;
    };
  }, []);
  return { api, error };
}

export function useBalance(api: ApiPromise | null, address: string | undefined) {
  const [free, setFree] = useState<bigint | null>(null);
  useEffect(() => {
    if (!api || !address) {
      setFree(null);
      return;
    }
    let unsub: (() => void) | undefined;
    let live = true;
    api.query.system
      .account(address, (info: unknown) => {
        const data = (info as { data: { free: { toString(): string } } }).data;
        if (live) setFree(BigInt(data.free.toString()));
      })
      .then((u) => {
        if (live) unsub = u as unknown as () => void;
        else (u as unknown as () => void)();
      })
      .catch(() => {});
    return () => {
      live = false;
      unsub?.();
    };
  }, [api, address]);
  return free;
}
