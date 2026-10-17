"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Check, Copy, Lock, Upload } from "lucide-react";
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
const B32 = "abcdefghijklmnopqrstuvwxyz234567";
const EASE = [0.22, 1, 0.36, 1] as const;

// Flickers through random base32 before landing on the real hash, like it's being computed.
function Scramble({ text, on }: { text: string; on: boolean }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (!on) return;
    let n = 0;
    const id = setInterval(() => {
      n++;
      const keep = Math.floor((n / 9) * text.length);
      setOut(text.slice(0, keep) + [...text.slice(keep)].map((c) => (c === "…" ? c : B32[(Math.random() * 32) | 0])).join(""));
      if (n >= 9) {
        clearInterval(id);
        setOut(text);
      }
    }, 34);
    return () => clearInterval(id);
  }, [text, on]);
  return <>{on ? out : "·".repeat(Math.min(text.length, 22))}</>;
}

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
  const [copied, setCopied] = useState(false);
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

      <div className="grid gap-0 md:grid-cols-[17rem_1fr]">
        {/* file */}
        <div className="relative flex flex-col items-center justify-center gap-5 border-b border-sep px-6 py-8 md:border-b-0 md:border-r">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--sep)_1px,transparent_1px)] [background-size:14px_14px]"
          />
          <AnimatePresence mode="wait">
            {doc && (
              <motion.div
                key={doc.root}
                initial={{ opacity: 0, y: 8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative flex w-full flex-col items-center text-center"
              >
                <motion.div animate={complete ? { y: [0, -4, 0] } : {}} transition={{ duration: 0.6, ease: EASE }}>
                  <DocIcon type={mimeLabel(doc.mime, doc.name)} size={60} />
                </motion.div>
                <div className="mt-3 max-w-[14rem] truncate text-[15px] font-semibold">{doc.name}</div>
                <div className="text-[13px] text-label-2 tabular">{bytes(doc.size)}</div>

                {/* the file as a byte strip, cut into blocks */}
                <div className="mt-5 w-full">
                  <div className="flex h-3 w-full gap-[3px]">
                    {doc.slips
                      .filter((x) => x.kind === "chunk")
                      .map((x) => (
                        <motion.span
                          key={x.i}
                          className="h-full rounded-[3px]"
                          style={{ flexGrow: x.size }}
                          initial={{ backgroundColor: "var(--fill-2)", scaleY: 0.6 }}
                          animate={revealed > x.i ? { backgroundColor: "var(--green)", scaleY: 1 } : { backgroundColor: "var(--fill-2)", scaleY: 0.6 }}
                          transition={{ duration: 0.35, ease: EASE }}
                        />
                      ))}
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[11px] text-label-3">
                    <span>0</span>
                    <span>{bytes(doc.size)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative h-7">
            <AnimatePresence mode="wait">
              {complete ? (
                <motion.div
                  key="ok"
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1 text-[12px] font-semibold text-green"
                >
                  <Check className="size-3.5" strokeWidth={3} /> Content addressed
                </motion.div>
              ) : (
                <motion.div key="wait" exit={{ opacity: 0 }} className="inline-flex items-center gap-2 px-3 py-1 text-[12px] text-label-3">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" /> Hashing in your browser
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* blocks */}
        <div className="p-4 sm:p-6">
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] font-medium text-label-2">
              {doc ? `${doc.slips.filter((x) => x.kind === "chunk").length} blocks${doc.slips.some((x) => x.kind === "root") ? " + 1 root" : ""}` : "Reading…"}
            </div>
            <div className="font-mono text-[11px] text-label-3">≤ 1 MiB each</div>
          </div>
          <ol className="mt-3 space-y-1.5">
            {shown.map((x, idx) => {
              const on = revealed > idx;
              const root = x.kind === "root";
              return (
                <motion.li
                  key={`${doc?.root}-${x.i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.04, ease: EASE }}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition-colors duration-300 ${
                    on ? (root ? "bg-accent/[0.07] ring-accent/25" : "bg-bg-2 ring-transparent hover:ring-sep") : "bg-bg-2/60 ring-transparent"
                  }`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-semibold transition-colors duration-300 ${
                      on ? (root ? "bg-accent text-white" : "bg-green text-white") : "bg-fill-2 text-label-3"
                    }`}
                  >
                    {on ? <Check className="size-3.5" strokeWidth={3.5} /> : root ? "R" : x.i + 1}
                  </span>
                  <span className="w-14 shrink-0 text-[13px] font-medium">{root ? "Root" : `Block ${x.i + 1}`}</span>
                  <span className={`min-w-0 flex-1 truncate font-mono text-[12px] ${on ? "text-label-2" : "text-label-3/60"}`}>
                    <Scramble text={shortCid(x.cid, 12, 8)} on={on} />
                  </span>
                  <span className="hidden shrink-0 rounded-md bg-fill px-1.5 py-0.5 font-mono text-[11px] text-label-2 tabular sm:inline">
                    {root ? "links" : bytes(x.size)}
                  </span>
                </motion.li>
              );
            })}
            {hidden > 0 && <li className="px-3 py-1.5 text-[12px] text-label-3">and {hidden} more</li>}
          </ol>

          {/* content id */}
          <div className={`mt-4 rounded-xl p-3.5 ring-1 transition-colors duration-500 ${complete ? "bg-accent/[0.05] ring-accent/20" : "bg-bg-2 ring-transparent"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-medium text-label-2">Content ID · blake2b-256</div>
              {complete && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(doc!.root).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1400);
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-label-2 transition-colors hover:bg-fill hover:text-label"
                >
                  {copied ? <Check className="size-3.5 text-green" strokeWidth={3} /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            <div className="mt-1.5 break-all font-mono text-[12px] leading-relaxed">
              {complete ? <Scramble text={doc!.root} on /> : <span className="text-label-3">Waiting for every block…</span>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
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
              <button
                onClick={() => input.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-sep-2 px-3 py-1.5 text-[12px] text-label-2 transition-colors hover:border-accent hover:text-accent"
              >
                <Upload className="size-3.5" /> Drop a file here, or pick one
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 text-[12px] text-label-3">
              <Lock className="size-3" /> Hashed locally. Nothing is uploaded from here.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
