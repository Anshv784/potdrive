"use client";

import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import type { BlockState } from "@potdrive/sdk/upload";
import { bytes } from "@/lib/format";
import { Spinner } from "../ui";

export function BlockGrid({ blocks }: { blocks: BlockState[] }) {
  return (
    <ol className="grid grid-cols-5 gap-2 sm:grid-cols-8" aria-label="Upload progress by block">
      {blocks.map((b) => {
        const done = b.status === "finalized" || b.status === "skipped" || b.status === "inBlock";
        const bg =
          b.status === "failed"
            ? "bg-red"
            : done
              ? b.kind === "root"
                ? "bg-accent"
                : "bg-green"
              : b.status === "sent"
                ? "bg-accent-soft"
                : "bg-fill";
        return (
          <motion.li
            key={b.i}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            title={`${b.kind === "root" ? "Root" : `Block ${b.i + 1}`} · ${bytes(b.size)}${b.blockNumber ? ` · in #${b.blockNumber.toLocaleString("en-US")}` : ""}`}
            className={`grid aspect-square place-items-center rounded-[10px] transition-colors duration-300 ${bg}`}
          >
            {b.status === "failed" ? (
              <X className="size-4 text-white" strokeWidth={3} />
            ) : done ? (
              <Check className="size-4 text-white" strokeWidth={3} />
            ) : b.status === "sent" ? (
              <Spinner className="size-4 text-accent" />
            ) : (
              <span className="text-[11px] text-label-3 tabular">{b.kind === "root" ? "R" : b.i + 1}</span>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}

export function StepList({ steps, current, done, failed }: { steps: { id: string; label: string; detail?: string }[]; current: string; done: boolean; failed?: boolean }) {
  const at = steps.findIndex((s) => s.id === current);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const state = done || i < at ? "done" : i === at ? (failed ? "failed" : "now") : "next";
        return (
          <li key={s.id} className="flex items-center gap-3">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
                state === "done" ? "bg-green" : state === "failed" ? "bg-red" : state === "now" ? "bg-accent-soft" : "bg-fill"
              }`}
            >
              {state === "done" ? (
                <Check className="size-3.5 text-white" strokeWidth={3} />
              ) : state === "failed" ? (
                <X className="size-3.5 text-white" strokeWidth={3} />
              ) : state === "now" ? (
                <Spinner className="size-3.5 text-accent" />
              ) : null}
            </span>
            <span className={`flex-1 text-[15px] ${state === "next" ? "text-label-3" : "text-label"}`}>{s.label}</span>
            {s.detail && <span className="text-[13px] text-label-2 tabular">{s.detail}</span>}
          </li>
        );
      })}
    </ol>
  );
}
