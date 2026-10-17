"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { buildFileDag } from "@potdrive/sdk/dag";
import { CHUNK_SIZE } from "@potdrive/sdk/network";
import { shortCid } from "@potdrive/sdk/cid";
import { bytes, mimeLabel } from "@/lib/format";
import { setPending } from "@/lib/pending";

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

const MAX_SLIPS = 9;

function sample(): Uint8Array {
  // A deterministic 3.4 MiB "PDF" so the first visit always shows a multi-chunk file.
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
  if (dag.blocks.length > 1) {
    slips.push({ i: slips.length, size: dag.blocks.at(-1)!.bytes.length, cid: dag.root.toString(), kind: "root" });
  }
  return { name, mime, size: data.length, slips, root: dag.root.toString(), file };
}

export function ArchiveDemo() {
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
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
    }, 260);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => play(describe(sample(), "field-notes.pdf", "application/pdf")), 400);
    return () => {
      clearTimeout(id);
      if (timer.current) clearInterval(timer.current);
    };
  }, [play]);

  const take = async (file: File) => {
    setBusy(true);
    const data = new Uint8Array(await file.arrayBuffer());
    play(describe(data, file.name, file.type, file));
    setBusy(false);
  };

  const shown = doc ? doc.slips.slice(0, MAX_SLIPS) : [];
  const hidden = doc ? doc.slips.length - shown.length : 0;
  const complete = doc && revealed > shown.length;

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
      className={`relative rounded-2xl border bg-ink-2/80 p-4 transition-[border-color,box-shadow] duration-200 sm:p-5 ${
        over ? "border-violet shadow-[0_0_0_4px_var(--violet-soft)]" : "border-line"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="stamp text-[10px] text-text-3">What goes on chain</span>
        <button
          onClick={() => input.current?.click()}
          className="rounded-md border border-line-2 px-2.5 py-1 text-xs text-text-2 transition-colors duration-150 hover:border-text-3 hover:text-text"
        >
          {busy ? "Reading…" : "Try your own file"}
        </button>
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

      {/* the record card */}
      <AnimatePresence mode="wait">
        {doc && (
          <motion.div
            key={doc.root}
            initial={{ opacity: 0, y: 10, rotate: -0.6 }}
            animate={{ opacity: 1, y: 0, rotate: -0.6 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="paper relative rounded-lg px-4 py-3 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6)]"
          >
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-md border border-paper-line bg-paper-2 font-mono text-[10px] font-semibold text-paper-mute">
                {mimeLabel(doc.mime, doc.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{doc.name}</div>
                <div className="mt-0.5 font-mono text-[11px] text-paper-mute tabular">
                  {bytes(doc.size)} · {doc.slips.filter((s) => s.kind === "chunk").length} chunk
                  {doc.slips.filter((s) => s.kind === "chunk").length === 1 ? "" : "s"} of 1 MiB
                </div>
              </div>
              <AnimatePresence>
                {complete && (
                  <motion.span
                    initial={{ opacity: 0, scale: 1.6, rotate: -14 }}
                    animate={{ opacity: 1, scale: 1, rotate: -8 }}
                    transition={{ type: "spring", stiffness: 420, damping: 18 }}
                    className="stamp shrink-0 rounded border-2 border-violet px-1.5 py-0.5 text-[10px] font-semibold text-violet"
                  >
                    Addressed
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* slips */}
      <ol className="mt-3 space-y-1.5" aria-label="Blocks">
        {shown.map((s, idx) => (
          <motion.li
            key={`${doc?.root}-${s.i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={revealed > idx ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`flex items-center gap-3 rounded-md border px-3 py-2 font-mono text-[11px] ${
              s.kind === "root" ? "border-violet/60 bg-violet-soft text-text" : "border-line bg-ink-3/60 text-text-2"
            }`}
          >
            <span className={`w-12 shrink-0 ${s.kind === "root" ? "text-violet-2" : "text-text-3"}`}>
              {s.kind === "root" ? "root" : `#${String(s.i + 1).padStart(2, "0")}`}
            </span>
            <span className="w-16 shrink-0 tabular">{bytes(s.size)}</span>
            <span className="min-w-0 flex-1 truncate">{shortCid(s.cid, 14, 8)}</span>
            <span className="hidden shrink-0 text-text-3 sm:inline">{s.kind === "root" ? "dag-pb" : "raw"}</span>
          </motion.li>
        ))}
        {hidden > 0 && revealed > shown.length - 1 && (
          <li className="px-3 py-1 font-mono text-[11px] text-text-3">+ {hidden} more blocks</li>
        )}
      </ol>

      <div className="mt-4 border-t border-line pt-4">
        <div className="stamp text-[10px] text-text-3">Content ID · blake2b-256</div>
        <div className="mt-1.5 break-all font-mono text-[12px] leading-relaxed text-text">
          {complete ? doc!.root : <span className="text-text-3">computing…</span>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {doc?.file ? (
            <button
              onClick={() => {
                setPending(doc.file!);
                router.push("/drive");
              }}
              className="rounded-md bg-violet px-3.5 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-violet-2 active:scale-[0.98]"
            >
              Store it on Portaldot
            </button>
          ) : (
            <span className="text-xs text-text-3">Drop a file here. It is hashed in your browser and never uploaded from this page.</span>
          )}
        </div>
      </div>
    </div>
  );
}
