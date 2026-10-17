"use client";

import { useEffect, useState } from "react";
import { rpc } from "@potdrive/sdk/rpc";

export function useHead(interval = 6000) {
  const [head, setHead] = useState<number | null>(null);
  const [down, setDown] = useState(false);
  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const h = await rpc<{ number: string }>("chain_getHeader");
        if (!live) return;
        setHead(parseInt(h.number, 16));
        setDown(false);
      } catch {
        if (live) setDown(true);
      }
    };
    tick();
    const id = setInterval(tick, interval);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [interval]);
  return { head, down };
}

export function ChainPulse({ className = "" }: { className?: string }) {
  const { head, down } = useHead();
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-[11px] text-text-2 ${className}`} title="Portaldot V3 testnet, best block">
      <span className={`size-1.5 rounded-full ${down ? "bg-bad" : "bg-ok live-dot"}`} />
      <span className="tabular">{down ? "node unreachable" : head === null ? "connecting" : `#${head.toLocaleString("en-US")}`}</span>
    </span>
  );
}
