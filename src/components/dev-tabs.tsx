"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Atom, Check, Code2, Copy, Globe, Terminal } from "lucide-react";

export interface DevItem {
  id: string;
  label: string;
  icon: "code" | "atom" | "terminal" | "globe";
  desc: string;
  file: string;
  lang: string;
  code: string;
  html: string;
}

const ICONS = { code: Code2, atom: Atom, terminal: Terminal, globe: Globe };
const EASE = [0.22, 1, 0.36, 1] as const;
const INSTALL = "npm i @potdrive/sdk";

function useCopy() {
  const [done, setDone] = useState<string | null>(null);
  const copy = (key: string, text: string) =>
    navigator.clipboard?.writeText(text).then(() => {
      setDone(key);
      setTimeout(() => setDone(null), 1400);
    });
  return { done, copy };
}

export function DevTabs({ items }: { items: DevItem[] }) {
  const [on, setOn] = useState(0);
  const { done, copy } = useCopy();
  const cur = items[on];

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      {/* picker */}
      <div className="flex flex-col gap-2">
        <div role="tablist" aria-label="Ways to use PotDrive" className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {items.map((it, i) => {
            const I = ICONS[it.icon];
            const sel = i === on;
            return (
              <button
                key={it.id}
                role="tab"
                aria-selected={sel}
                aria-controls="dev-code"
                onClick={() => setOn(i)}
                className={`group relative flex items-start gap-3 rounded-2xl p-3.5 text-left transition-colors duration-200 ${
                  sel ? "bg-surface shadow-card ring-1 ring-accent/30" : "ring-1 ring-transparent hover:bg-surface/60 hover:ring-sep"
                }`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors duration-200 ${
                    sel ? "bg-accent text-white" : "bg-fill text-label-2 group-hover:text-label"
                  }`}
                >
                  <I className="size-[18px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">{it.label}</span>
                  <span className="mt-0.5 hidden text-[13px] leading-snug text-label-2 sm:block">{it.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 rounded-2xl bg-surface p-3.5 ring-1 ring-sep">
          <div className="text-[11px] font-medium uppercase tracking-wide text-label-3">Install</div>
          <button
            onClick={() => copy("install", INSTALL)}
            className="mt-1.5 flex w-full items-center justify-between gap-3 rounded-lg bg-bg-2 px-3 py-2 font-mono text-[13px] transition-colors duration-200 hover:bg-fill"
          >
            <span>
              <span className="text-label-3">$ </span>
              {INSTALL}
            </span>
            {done === "install" ? <Check className="size-4 text-green" strokeWidth={3} /> : <Copy className="size-4 text-label-3" />}
          </button>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <Link href="/docs/sdk" className="inline-flex items-center gap-0.5 text-accent hover:underline">
              SDK reference <ArrowUpRight className="size-3.5" />
            </Link>
            <Link href="/docs/mcp" className="inline-flex items-center gap-0.5 text-accent hover:underline">
              MCP server <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* editor */}
      <div id="dev-code" role="tabpanel" className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-[#0d1117] text-[#e6edf3] shadow-float ring-1 ring-black/10 dark:ring-white/10">
        <div className="flex items-stretch border-b border-white/10 bg-[#010409]">
          <div className="flex min-w-0 overflow-x-auto">
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => setOn(i)}
                className={`relative shrink-0 px-4 py-2.5 font-mono text-[12px] transition-colors duration-200 ${
                  i === on ? "bg-[#0d1117] text-[#e6edf3]" : "text-[#7d8590] hover:text-[#e6edf3]"
                }`}
              >
                {i === on && <motion.span layoutId="dev-tab" className="absolute inset-x-0 top-0 h-0.5 bg-[#818cf8]" transition={{ duration: 0.3, ease: EASE }} />}
                {it.file}
              </button>
            ))}
          </div>
          <button
            onClick={() => copy(cur.id, cur.code)}
            aria-label="Copy code"
            className="ml-auto flex shrink-0 items-center gap-1.5 px-4 text-[12px] text-[#7d8590] transition-colors duration-200 hover:text-[#e6edf3]"
          >
            {done === cur.id ? <Check className="size-3.5 text-[#3fb950]" strokeWidth={3} /> : <Copy className="size-3.5" />}
            {done === cur.id ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="relative min-h-[22rem] flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={cur.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
              transition={{ duration: 0.28, ease: EASE }}
              className="code-window overflow-x-auto py-4 font-mono text-[13px] leading-[1.7] [letter-spacing:0]"
              dangerouslySetInnerHTML={{ __html: cur.html }}
            />
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 bg-[#010409] px-4 py-1.5 font-mono text-[11px] text-[#7d8590]">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#3fb950]" /> Portaldot V3 testnet
          </span>
          <span className="ml-auto">{cur.lang}</span>
        </div>
      </div>
    </div>
  );
}
