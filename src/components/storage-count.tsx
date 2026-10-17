"use client";

import { useEffect, useState } from "react";
import { u8aToHex } from "@polkadot/util";
import { xxhashAsU8a } from "@polkadot/util-crypto";
import { rpc } from "@potdrive/sdk/rpc";

// Storage prefix of TransactionStorage.Transactions: one key per block that holds data.
const PREFIX = u8aToHex(new Uint8Array([...xxhashAsU8a("TransactionStorage", 128), ...xxhashAsU8a("Transactions", 128)]));

export function useStoredBlocks() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        let total = 0;
        let start: string | null = null;
        for (;;) {
          const keys: string[] = await rpc<string[]>("state_getKeysPaged", [PREFIX, 1000, start]);
          total += keys.length;
          if (keys.length < 1000) break;
          start = keys[keys.length - 1];
        }
        if (live) setCount(total);
      } catch {
        if (live) setCount(null);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);
  return count;
}

export function StorageCount() {
  const count = useStoredBlocks();
  return <span className="tabular">{count === null ? "…" : count.toLocaleString("en-US")}</span>;
}
