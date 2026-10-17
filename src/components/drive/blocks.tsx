"use client";

import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import type { BlockState } from "@potdrive/sdk/upload";
import { shortCid } from "@potdrive/sdk/cid";
import { bytes } from "@/lib/format";

const label: Record<BlockState["status"], string> = {
  queued: "queued",
  skipped: "on chain",
  sent: "sending",
  inBlock: "in block",
  finalized: "final",
  failed: "failed",
};

export function BlockTile({ b }: { b: BlockState }) {
  const tone =
    b.status === "finalized" || b.status === "skipped"
      ? "paper border-paper-line"
      : b.status === "inBlock"
        ? "border-violet bg-violet text-white"
        : b.status === "sent"
          ? "border-violet/70 bg-violet-soft text-text"
          : b.status === "failed"
            ? "border-bad bg-bad-soft text-text"
            : "border-dashed border-line-2 bg-transparent text-text-3";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex min-h-[86px] flex-col justify-between rounded-lg border p-2.5 transition-[background-color,border-color,color] duration-300 ${tone}`}
      title={b.cid}
    >
      <div className="flex items-center justify-between font-mono text-[10px]">
        <span className={b.kind === "root" ? "font-semibold" : ""}>{b.kind === "root" ? "ROOT" : `#${String(b.i + 1).padStart(2, "0")}`}</span>
        {b.status === "finalized" || b.status === "skipped" ? (
          <Check className="size-3.5 text-violet" />
        ) : b.status === "failed" ? (
          <X className="size-3.5 text-bad" />
        ) : b.status === "sent" ? (
          <span className="size-1.5 rounded-full bg-violet-2 live-dot" />
        ) : null}
      </div>
      <div>
        <div className="truncate font-mono text-[10px] opacity-70">{shortCid(b.cid, 6, 4)}</div>
        <div className="mt-0.5 flex items-center justify-between font-mono text-[10px]">
          <span className="tabular opacity-80">{bytes(b.size)}</span>
          <span className="tabular">{b.blockNumber ? `#${b.blockNumber.toLocaleString("en-US")}` : label[b.status]}</span>
        </div>
      </div>
    </motion.li>
  );
}

export function BlockGrid({ blocks }: { blocks: BlockState[] }) {
  return (
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Upload progress by block">
      {blocks.map((b) => (
        <BlockTile key={b.i} b={b} />
      ))}
    </ol>
  );
}

export function StageRail({ stages, current, done }: { stages: { id: string; label: string }[]; current: string; done: boolean }) {
  const at = stages.findIndex((s) => s.id === current);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
      {stages.map((s, i) => {
        const state = done || i < at ? "done" : i === at ? "now" : "next";
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors duration-300 ${
                state === "done"
                  ? "border-violet/50 bg-violet-soft text-violet-2"
                  : state === "now"
                    ? "border-violet text-text"
                    : "border-line text-text-3"
              }`}
            >
              {state === "done" ? <Check className="size-3" /> : state === "now" ? <span className="size-1.5 rounded-full bg-violet-2 live-dot" /> : null}
              {s.label}
            </span>
            {i < stages.length - 1 && <span className="h-px w-3 bg-line-2" />}
          </li>
        );
      })}
    </ol>
  );
}
