"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { buildFileDag } from "@potdrive/sdk/dag";
import { CHUNK_SIZE } from "@potdrive/sdk/network";
import { shortCid } from "@potdrive/sdk/cid";
import { bytes, mimeLabel } from "@/lib/format";
import { setPending } from "@/lib/pending";
import { Button, DocIcon } from "./ui";

interface Slip {
  i: number;
  size: number;
  cid: string;
  kind: "chunk" | "root";
}

interface Doc {
  name: string;
  mime: string;
  size: number;
  slips: Slip[];
  root: string;
  file?: File;
}

const MAX_SLIPS = 6;

function sample(): Uint8Array {
  // A deterministic 3.4 MiB "PDF" so the first visit always shows a multi-block file.
  const out = new Uint8Array(Math.round(3.4 * 1024 * 1024));
  let x = 2463534242;
  for (let i = 0; i < out.length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = x & 0xff;
  }
  out.set(new TextEncoder().encode("%PDF-1.7"), 0);
  return out;
}

function describe(data: Uint8Array, name: string, mime: string, file?: File): Doc {
  const dag = buildFileDag(data, CHUNK_SIZE);
  const slips: Slip[] = dag.leaves.map((l, i) => ({ i, size: l.bytes.length, cid: l.cid.toString(), kind: "chunk" }));
  if (dag.blocks.length > 1) slips.push({ i: slips.length, size: dag.blocks.at(-1)!.bytes.length, cid: dag.root.toString(), kind: "root" });
  return { name, mime, size: data.length, slips, root: dag.root.toString(), file };
}

export function ArchiveDemo() {
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const play = useCallback((d: Doc) => {
    setDoc(d);
    setRevealed(0);
    if (timer.current) clearInterval(timer.current);
    const shown = Math.min(d.slips.length, MAX_SLIPS);
    timer.current = setInterval(() => {
      setRevealed((r) => {
        if (r >= shown + 1 && timer.current) clearInterval(timer.current);
        return r + 1;
      });
    }, 320);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => play(describe(sample(), "Field Notes.pdf", "application/pdf")), 500);
    return () => {
      clearTimeout(id);
      if (timer.current) clearInterval(timer.current);
    };
  }, [play]);

  const take = async (file: File) => play(describe(new Uint8Array(await file.arrayBuffer()), file.name, file.type, file));

  const shown = doc ? doc.slips.slice(0, MAX_SLIPS) : [];
  const hidden = doc ? doc.slips.length - shown.length : 0;
  const complete = !!doc && revealed > shown.length;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) take(f);
      }}
      className={`overflow-hidden rounded-[22px] bg-surface text-left shadow-float ring-1 transition-[box-shadow] duration-300 ${over ? "ring-2 ring-accent" : "ring-sep"}`}
    >
      {/* window chrome */}
      <div className="flex h-11 items-center gap-2 border-b border-sep bg-surface-2 px-4">
        <span className="text-[13px] font-medium text-label-2">
          <span className="sm:hidden">On chain</span>
          <span className="hidden sm:inline">What goes on chain</span>
        </span>
        <Button variant="gray" size="sm" className="ml-auto h-7 text-[12px]" onClick={() => input.current?.click()}>
          <span className="sm:hidden">Your file</span>
          <span className="hidden sm:inline">Try your own file</span>
        </Button>
        <input
          ref={input}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) take(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid gap-0 md:grid-cols-[15rem_1fr]">
        {/* file */}
        <div className="flex flex-col items-center justify-center border-b border-sep px-6 py-8 md:border-b-0 md:border-r">
          <AnimatePresence mode="wait">
            {doc && (
              <motion.div
                key={doc.root}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center"
              >
                <DocIcon type={mimeLabel(doc.mime, doc.name)} size={64} />
                <div className="mt-3 max-w-[12rem] truncate text-[15px] font-medium">{doc.name}</div>
                <div className="text-[13px] text-label-2 tabular">{bytes(doc.size)}</div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {complete && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-soft px-2.5 py-1 text-[12px] font-medium text-green"
              >
                <Check className="size-3.5" strokeWidth={3} /> Addressed
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* blocks */}
        <div className="p-4 sm:p-5">
          <div className="text-[13px] text-label-2">
            {doc ? `${doc.slips.filter((s) => s.kind === "chunk").length} × 1 MiB blocks${doc.slips.some((s) => s.kind === "root") ? " + 1 root" : ""}` : "Reading…"}
          </div>
          <ol className="mt-2 overflow-hidden rounded-xl bg-bg-2">
            {shown.map((s, idx) => {
              const on = revealed > idx;
              return (
                <li key={`${doc?.root}-${s.i}`} className="flex items-center gap-3 border-b border-sep px-3.5 py-2.5 last:border-0">
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-300 ${on ? (s.kind === "root" ? "bg-accent" : "bg-green") : "bg-fill-2"}`}
                  >
                    {on && <Check className="size-3 text-white" strokeWidth={3.5} />}
                  </span>
                  <span className="w-12 shrink-0 text-[13px] font-medium">{s.kind === "root" ? "Root" : `Block ${s.i + 1}`}</span>
                  <span className={`min-w-0 flex-1 truncate font-mono text-[12px] transition-colors duration-300 ${on ? "text-label-2" : "text-label-3/50"}`}>
                    {on ? shortCid(s.cid, 12, 8) : "hashing…"}
                  </span>
                  <span className="hidden shrink-0 text-[12px] text-label-3 tabular sm:inline">{bytes(s.size)}</span>
                </li>
              );
            })}
            {hidden > 0 && <li className="px-3.5 py-2 text-[12px] text-label-3">and {hidden} more</li>}
          </ol>

          <div className="mt-4">
            <div className="text-[13px] text-label-2">Content ID · blake2b-256</div>
            <div className="mt-1 break-all font-mono text-[12px] leading-relaxed">
              {complete ? doc!.root : <span className="text-label-3">Computing…</span>}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            {doc?.file ? (
              <Button
                size="sm"
                onClick={() => {
                  setPending(doc.file!);
                  router.push("/drive");
                }}
              >
                Store it on Portaldot
              </Button>
            ) : (
              <span className="text-[12px] text-label-3">Drop a file on this window. It&apos;s hashed in your browser, never uploaded from here.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
