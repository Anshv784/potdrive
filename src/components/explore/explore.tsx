"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cidFromContentHash, DAG_PB, RAW, shortCid } from "@potdrive/sdk/cid";
import { NETWORK } from "@potdrive/sdk/network";
import type { StoredEntry } from "@potdrive/sdk/state";
import { bytes, duration, num } from "@/lib/format";
import { FileCard } from "../drive/file-card";
import { ProofMonitor } from "./proofs";

interface RegFile {
  root: string;
  owner: string;
  size: number;
  chunks: number;
  kind: number;
  proven: boolean;
  expiresAt: number;
  isPrivate: boolean;
  name: string;
  mime: string;
}

interface Data {
  head: number;
  entries: StoredEntry[];
  registry: { total: number; address: string; files: RegFile[] } | null;
}

const DAY = 86_400_000;

export function Explore() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/stored")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => live && (setData(d), setError(false)))
        .catch(() => live && setError(true));
    load();
    const id = setInterval(load, 15_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const roots = useMemo(() => new Set(data?.registry?.files.map((f) => f.root.toLowerCase()) ?? []), [data]);
  const stats = useMemo(() => {
    if (!data) return null;
    const total = data.entries.reduce((s, e) => s + e.size, 0);
    const blocks = new Set(data.entries.map((e) => e.block)).size;
    const next = data.entries.length ? Math.min(...data.entries.map((e) => e.expiresAt)) : null;
    return { total, blocks, next };
  }, [data]);

  const retentionMs = NETWORK.retentionBlocks * NETWORK.blockTimeMs;

  return (
    <div className="mx-auto max-w-[1024px] px-5 py-14">
      <div className="text-center">
        <p className="eyebrow text-accent">Network</p>
        <h1 className="headline mx-auto mt-2 max-w-3xl text-[40px] sm:text-[56px]">Everything Portaldot is holding.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[19px] text-label-2">
          Read live from TransactionStorage. Every entry is data validators are required to prove they still have.
        </p>
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Stored items", stats ? num(data!.entries.length) : "…"],
          ["Bytes held", stats ? bytes(stats.total) : "…"],
          ["Blocks with data", stats ? num(stats.blocks) : "…"],
          ["Next expiry", stats ? (stats.next ? duration((stats.next - data!.head) * NETWORK.blockTimeMs) : "None") : "…"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[22px] bg-bg-2 p-6">
            <dt className="text-[13px] text-label-2">{k}</dt>
            <dd className="headline mt-1 text-[32px] tabular">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6 rounded-[22px] bg-bg-2 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold">Retention timeline</h2>
          <span className="text-[13px] text-label-2">Each mark is one stored item, placed where the chain may drop it.</span>
        </div>
        <div className="relative mt-6 h-28">
          <div className="absolute inset-x-0 bottom-6 h-px bg-sep-2" />
          {Array.from({ length: 8 }, (_, d) => (
            <div key={d} className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${(d * DAY * 100) / retentionMs}%` }}>
              <span className="mb-1 h-2 w-px bg-sep-2" />
              <span className="text-[11px] text-label-3">{d === 0 ? "Now" : `${d}d`}</span>
            </div>
          ))}
          {data?.entries.map((e, i) => {
            const left = Math.min(100, Math.max(0, ((e.expiresAt - data.head) / NETWORK.retentionBlocks) * 100));
            const h = 14 + Math.min(56, Math.log2(Math.max(2, e.size)) * 2.6);
            const isRoot = roots.has(e.contentHash.toLowerCase());
            return (
              <motion.span
                key={`${e.block}-${e.index}`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.6), duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                title={`#${num(e.block)} · tx ${e.index} · ${bytes(e.size)}`}
                className={`absolute bottom-6 w-1 origin-bottom rounded-full ${isRoot ? "bg-accent" : "bg-green"}`}
                style={{ left: `${left}%`, height: h }}
              />
            );
          })}
          {data && data.entries.length === 0 && <div className="absolute inset-x-0 top-6 text-center text-[15px] text-label-2">Nothing is stored on Portaldot right now.</div>}
        </div>
      </section>

      <ProofMonitor />

      {data?.registry && data.registry.files.length > 0 && (
        <section className="mt-14">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="headline text-[28px]">Public files</h2>
            <span className="text-[13px] text-label-2">{num(data.registry.total)} registered</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {data.registry.files.map((f, i) => (
              <FileCard
                key={f.root}
                index={i}
                head={data.head}
                f={{
                  root: cidFromContentHash(f.root, f.kind === 0 ? RAW : DAG_PB).toString(),
                  name: f.name,
                  mime: f.mime,
                  size: f.size,
                  isPrivate: f.isPrivate,
                  expiresAt: f.expiresAt,
                  registered: true,
                }}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-14">
        <h2 className="headline mb-4 text-[28px]">TransactionStorage</h2>
        <div className="overflow-x-auto rounded-[22px] bg-bg-2">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead className="text-[13px] text-label-2">
              <tr>
                <th className="px-5 py-3 font-normal">Block</th>
                <th className="px-5 py-3 font-normal">Index</th>
                <th className="px-5 py-3 font-normal">Size</th>
                <th className="px-5 py-3 font-normal">Content ID</th>
                <th className="px-5 py-3 text-right font-normal">Expires in</th>
              </tr>
            </thead>
            <tbody>
              {!data && !error &&
                [0, 1, 2].map((i) => (
                  <tr key={i} className="border-t border-sep">
                    <td colSpan={5} className="px-5 py-3.5">
                      <div className="h-3 w-full animate-pulse rounded-full bg-fill" />
                    </td>
                  </tr>
                ))}
              {error && (
                <tr className="border-t border-sep">
                  <td colSpan={5} className="px-5 py-8 text-center text-label-2">Can&apos;t reach the Portaldot node. Retrying every 15 seconds.</td>
                </tr>
              )}
              {data?.entries.length === 0 && (
                <tr className="border-t border-sep">
                  <td colSpan={5} className="px-5 py-8 text-center text-label-2">No entries yet.</td>
                </tr>
              )}
              {data?.entries.slice(0, 200).map((e) => {
                const isRoot = roots.has(e.contentHash.toLowerCase());
                const cid = cidFromContentHash(e.contentHash, isRoot ? DAG_PB : RAW).toString();
                return (
                  <tr key={`${e.block}-${e.index}`} className="border-t border-sep">
                    <td className="px-5 py-3 tabular">{num(e.block)}</td>
                    <td className="px-5 py-3 tabular">{e.index}</td>
                    <td className="px-5 py-3 tabular">{bytes(e.size)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/f/${cid}`} className="font-mono text-[13px] text-link hover:underline">
                        {shortCid(cid, 12, 6)}
                      </Link>
                      {isRoot && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">Root</span>}
                    </td>
                    <td className="px-5 py-3 text-right tabular text-label-2">{duration((e.expiresAt - data.head) * NETWORK.blockTimeMs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
