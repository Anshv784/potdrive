"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cidFromContentHash, DAG_PB, RAW, shortCid } from "@potdrive/sdk/cid";
import { NETWORK } from "@potdrive/sdk/network";
import type { StoredEntry } from "@potdrive/sdk/state";
import { bytes, duration, num } from "@/lib/format";
import { FileCard } from "../drive/file-card";

interface RegFile {
  root: string;
  owner: string;
  size: number;
  chunks: number;
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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <span className="stamp text-[10px] text-violet-2">Network archive</span>
      <h1 className="mt-2 max-w-3xl font-serif text-5xl leading-[1.05]">Everything Portaldot is holding right now.</h1>
      <p className="mt-3 max-w-2xl text-text-2">
        Read live from <code className="font-mono text-sm text-text">TransactionStorage.Transactions</code>. Every row is data validators
        are currently required to prove they still have.
      </p>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
        {[
          ["Stored items", stats ? num(data!.entries.length) : "…"],
          ["Bytes held", stats ? bytes(stats.total) : "…"],
          ["Blocks with data", stats ? num(stats.blocks) : "…"],
          ["Next expiry", stats ? (stats.next ? `in ${duration((stats.next - data!.head) * NETWORK.blockTimeMs)}` : "–") : "…"],
        ].map(([k, v]) => (
          <div key={k} className="bg-ink-2 px-5 py-5">
            <dt className="text-xs text-text-3">{k}</dt>
            <dd className="mt-1 font-serif text-3xl tabular">{v}</dd>
          </div>
        ))}
      </dl>

      {/* retention shelf */}
      <section className="mt-10 rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Retention shelf</h2>
          <span className="text-xs text-text-3">each mark is one stored item, placed at the moment the chain may drop it</span>
        </div>
        <div className="relative mt-6 h-28">
          <div className="absolute inset-x-0 bottom-6 h-px bg-line-2" />
          {Array.from({ length: 8 }, (_, d) => (
            <div key={d} className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${(d * DAY * 100) / retentionMs}%` }}>
              <span className="mb-1 h-2 w-px bg-line-2" />
              <span className="font-mono text-[10px] text-text-3">{d === 0 ? "now" : `+${d}d`}</span>
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
                transition={{ delay: Math.min(i * 0.02, 0.6), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                title={`#${num(e.block)} · tx ${e.index} · ${bytes(e.size)}`}
                className={`absolute bottom-6 w-[3px] origin-bottom rounded-t ${isRoot ? "bg-violet-2" : "bg-violet/60"}`}
                style={{ left: `${left}%`, height: h }}
              />
            );
          })}
          {data && data.entries.length === 0 && (
            <div className="absolute inset-x-0 top-6 text-center text-sm text-text-3">The shelf is empty. Nothing is stored on Portaldot right now.</div>
          )}
        </div>
      </section>

      {data?.registry && data.registry.files.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="stamp text-[11px] text-text-3">Public PotDrive records</h2>
            <span className="font-mono text-xs text-text-3">{num(data.registry.total)} registered in total</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.registry.files.map((f, i) => (
              <FileCard
                key={f.root}
                index={i}
                head={data.head}
                f={{
                  root: cidFromContentHash(f.root, f.chunks > 1 ? DAG_PB : RAW).toString(),
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

      <section className="mt-12">
        <h2 className="stamp mb-4 text-[11px] text-text-3">Raw TransactionStorage</h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-ink-2 text-xs text-text-3">
              <tr>
                <th className="px-4 py-2.5 font-normal">Block</th>
                <th className="px-4 py-2.5 font-normal">Tx</th>
                <th className="px-4 py-2.5 font-normal">Size</th>
                <th className="px-4 py-2.5 font-normal">Content hash</th>
                <th className="px-4 py-2.5 text-right font-normal">Expires</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {!data && !error &&
                [0, 1, 2].map((i) => (
                  <tr key={i} className="border-t border-line">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-3 w-full animate-pulse rounded bg-ink-3" />
                    </td>
                  </tr>
                ))}
              {error && (
                <tr className="border-t border-line">
                  <td colSpan={5} className="px-4 py-6 text-center text-text-3">The Portaldot node didn&apos;t answer. Retrying every 15 seconds.</td>
                </tr>
              )}
              {data?.entries.length === 0 && (
                <tr className="border-t border-line">
                  <td colSpan={5} className="px-4 py-6 text-center text-text-3">No entries.</td>
                </tr>
              )}
              {data?.entries.slice(0, 200).map((e) => {
                const isRoot = roots.has(e.contentHash.toLowerCase());
                const cid = cidFromContentHash(e.contentHash, isRoot ? DAG_PB : RAW).toString();
                return (
                  <tr key={`${e.block}-${e.index}`} className="border-t border-line text-text-2 hover:bg-ink-2">
                    <td className="px-4 py-2.5 tabular">#{num(e.block)}</td>
                    <td className="px-4 py-2.5 tabular">{e.index}</td>
                    <td className="px-4 py-2.5 tabular">{bytes(e.size)}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/f/${cid}`} className="hover:text-violet-2">
                        {shortCid(cid, 14, 8)}
                      </Link>
                      {isRoot && <span className="ml-2 rounded bg-violet-soft px-1.5 py-0.5 text-[10px] text-violet-2">root</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">{duration((e.expiresAt - data.head) * NETWORK.blockTimeMs)}</td>
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
