"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Download, KeyRound, Lock, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ChunkCheck } from "@potdrive/sdk/fetch";
import { shortCid } from "@potdrive/sdk/cid";
import { formatPot, NETWORK } from "@potdrive/sdk/network";
import { bytes, mimeLabel, num, untilBlock } from "@/lib/format";
import { mimeFromName, previewKind, sniff } from "@/lib/sniff";
import { keyFor } from "@/lib/library";
import { useHead } from "../chain-pulse";
import { CopyButton } from "../code";
import { ExpiryRing } from "../drive/file-card";

interface Meta {
  head: number;
  expiresAt: number | null;
  kind: "dag-pb" | "raw";
  blocks: { cid: string; kind: string; block: number | null; index: number | null; size: number | null }[];
  registry: null | { owner: string; name: string; mime: string; size: number; isPrivate: boolean; keepAlive: string; expiresAt: number; storedAt: number };
}

type Load = "loading" | "ok" | "missing" | "corrupt" | "error" | "locked" | "badkey";

export function FileView({ cid, nameHint }: { cid: string; nameHint?: string }) {
  const { head } = useHead();
  const [checks, setChecks] = useState<ChunkCheck[]>([]);
  const [state, setState] = useState<Load>("loading");
  const [data, setData] = useState<Uint8Array | null>(null);
  const [name, setName] = useState(nameHint ?? "");
  const [mime, setMime] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [sealed, setSealed] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [ms, setMs] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const k = new URLSearchParams(window.location.hash.slice(1)).get("k") ?? keyFor(cid) ?? null;
    setKey(k);
  }, [cid]);

  useEffect(() => {
    fetch(`/api/file/${cid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setMeta)
      .catch(() => {});
  }, [cid, run]);

  // fetch + verify every block in the browser, straight from the node
  useEffect(() => {
    let live = true;
    setState("loading");
    setChecks([]);
    const t = performance.now();
    (async () => {
      const { getFile, NotFoundError, IntegrityError } = await import("@potdrive/sdk/fetch");
      try {
        const bytes = await getFile(cid, {
          onLayout: (l) => live && setChecks(l),
          onChunk: (c) =>
            live &&
            setChecks((cs) => {
              const next = cs.slice();
              next[c.index] = c;
              return next;
            }),
        });
        if (!live) return;
        setMs(performance.now() - t);
        setData(bytes);
      } catch (e) {
        if (!live) return;
        setState(e instanceof NotFoundError ? "missing" : e instanceof IntegrityError ? "corrupt" : "error");
      }
    })();
    return () => {
      live = false;
    };
  }, [cid, run]);

  // decrypt / type / preview
  useEffect(() => {
    if (!data) return;
    let live = true;
    let objectUrl: string | null = null;
    (async () => {
      const { isEnvelope, openFile } = await import("@potdrive/sdk/envelope");
      let body = data;
      let type = mimeFromName(nameHint) || meta?.registry?.mime || "";
      if (isEnvelope(data)) {
        setSealed(true);
        if (!key) return live && setState("locked");
        try {
          const opened = await openFile(data, key);
          body = opened.data;
          type = opened.meta.mime;
          if (live) setName(opened.meta.name);
        } catch {
          return live && setState("badkey");
        }
      } else if (meta?.registry?.name && !nameHint) {
        setName(meta.registry.name);
      }
      if (!type || type === "application/octet-stream") type = sniff(body);
      if (!live) return;
      setMime(type);
      objectUrl = URL.createObjectURL(new Blob([body as BlobPart], { type }));
      setUrl(objectUrl);
      setText(previewKind(type) === "text" ? new TextDecoder().decode(body.subarray(0, 200_000)) : null);
      setState("ok");
    })();
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data, key, meta?.registry?.mime, meta?.registry?.name, nameHint]);

  const verified = checks.filter((c) => c.status === "ok").length;
  const size = useMemo(() => checks.reduce((s, c) => s + c.size, 0), [checks]);
  const kind = previewKind(mime);
  const expiry = meta?.expiresAt ?? meta?.registry?.expiresAt ?? null;
  const tryKey = useCallback((k: string) => {
    const v = k.trim().replace(/^.*#k=/, "");
    if (v) setKey(v);
  }, []);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_22rem]">
      {/* preview */}
      <section className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="stamp text-[10px] text-text-3">{sealed ? "Sealed record" : "Record"}</span>
            <h1 className="mt-1 truncate font-serif text-4xl sm:text-5xl">{name || (sealed ? "Private file" : shortCid(cid, 10, 6))}</h1>
          </div>
          {url && (
            <a
              href={url}
              download={name || cid}
              className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-violet-2 active:scale-[0.98]"
            >
              <Download className="size-4" /> Download
            </a>
          )}
        </div>

        <div className="paper mt-6 grid min-h-[22rem] place-items-center overflow-hidden rounded-2xl">
          {state === "loading" && (
            <div className="p-10 text-center">
              <div className="font-serif text-3xl text-paper-ink">Fetching from Portaldot…</div>
              <p className="mt-2 font-mono text-xs text-paper-mute tabular">
                {verified}/{checks.length || "?"} blocks verified
              </p>
            </div>
          )}
          {state === "ok" && url && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="size-full">
              {kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={name} className="mx-auto max-h-[70vh] w-auto object-contain" />
              )}
              {kind === "video" && <video src={url} controls className="mx-auto max-h-[70vh] w-full bg-black" />}
              {kind === "audio" && (
                <div className="grid h-80 place-items-center p-8">
                  <audio src={url} controls className="w-full max-w-md" />
                </div>
              )}
              {kind === "pdf" && <iframe src={url} title={name} className="h-[75vh] w-full" />}
              {kind === "text" && text !== null && (
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap p-6 font-mono text-[12.5px] leading-relaxed text-paper-ink">{text}</pre>
              )}
              {kind === "binary" && (
                <div className="grid h-80 place-items-center p-8 text-center">
                  <div>
                    <div className="font-serif text-6xl text-paper-mute/70">{mimeLabel(mime, name)}</div>
                    <p className="mt-3 text-sm text-paper-mute">No preview for this type. The download is the verified original.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          {(state === "locked" || state === "badkey") && (
            <div className="max-w-sm p-10 text-center">
              <Lock className="mx-auto size-6 text-paper-mute" />
              <div className="mt-3 font-serif text-3xl text-paper-ink">{state === "badkey" ? "That key doesn't open it" : "This file is sealed"}</div>
              <p className="mt-2 text-sm text-paper-mute">
                The chain holds ciphertext only. Paste the full share link or its key to open it here. It never leaves this tab.
              </p>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  tryKey(new FormData(e.currentTarget).get("k") as string);
                }}
              >
                <input name="k" placeholder="#k=… or the link" className="min-w-0 flex-1 rounded-md border border-paper-line bg-paper-2 px-3 py-2 font-mono text-xs text-paper-ink outline-none focus:border-violet" />
                <button className="inline-flex items-center gap-1.5 rounded-md bg-paper-ink px-3 py-2 text-xs text-paper">
                  <KeyRound className="size-3.5" /> Open
                </button>
              </form>
            </div>
          )}
          {(state === "missing" || state === "corrupt" || state === "error") && (
            <div className="max-w-sm p-10 text-center">
              <TriangleAlert className="mx-auto size-6 text-paper-mute" />
              <div className="mt-3 font-serif text-3xl text-paper-ink">
                {state === "missing" ? "Not on Portaldot" : state === "corrupt" ? "Hash mismatch" : "Node unreachable"}
              </div>
              <p className="mt-2 text-sm text-paper-mute">
                {state === "missing"
                  ? "Nothing with this CID is held right now. It was never stored, or it passed its retention period without a renewal."
                  : state === "corrupt"
                    ? "A block came back that does not match its CID. PotDrive refused it."
                    : "The Portaldot node didn't answer. Try again in a moment."}
              </p>
              <button onClick={() => setRun((r) => r + 1)} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-paper-ink px-3 py-2 text-xs text-paper">
                <RefreshCw className="size-3.5" /> Retry
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ledger */}
      <aside className="space-y-4">
        <div className="rounded-2xl border border-line bg-ink-2 p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className={`size-4 ${state === "ok" || (data && verified === checks.length) ? "text-ok" : "text-text-3"}`} />
              Verified in this browser
            </span>
            <button onClick={() => setRun((r) => r + 1)} className="rounded-md p-1 text-text-3 hover:bg-ink-3 hover:text-text" aria-label="Verify again">
              <RefreshCw className="size-3.5" />
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-text-3">
            Each block came from a Portaldot node over bitswap and was re-hashed with blake2b-256 against its CID.
          </p>
          <ol className="mt-4 grid grid-cols-6 gap-1.5" aria-label="Block verification">
            {checks.map((c) => (
              <li
                key={c.index}
                title={`${c.cid} · ${c.status}${c.ms ? ` · ${Math.round(c.ms)} ms` : ""}`}
                className={`h-7 rounded transition-colors duration-300 ${
                  c.status === "ok" ? "bg-violet" : c.status === "pending" ? "bg-ink-3 live-dot" : "bg-bad"
                }`}
              />
            ))}
          </ol>
          <div className="mt-3 flex justify-between font-mono text-[11px] text-text-3 tabular">
            <span>
              {verified}/{checks.length} blocks
            </span>
            <span>{data ? `${bytes(size || data.length)} in ${Math.round(ms)} ms` : "…"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-ink-2 p-5">
          <div className="flex items-center gap-4">
            <div className="relative grid place-items-center">
              <ExpiryRing expiresAt={expiry ?? undefined} head={head} size={52} />
              <span className="absolute font-mono text-[10px] text-text-2">{expiry && head ? untilBlock(expiry, head).split(" ")[0] : "–"}</span>
            </div>
            <div>
              <div className="text-sm font-medium">{expiry && head ? `Kept for ${untilBlock(expiry, head)}` : "Retention"}</div>
              <div className="font-mono text-[11px] text-text-3 tabular">{expiry ? `until block #${num(expiry)}` : meta ? "not held by the chain right now" : "reading chain state…"}</div>
            </div>
          </div>
          {meta?.registry && (
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
              <span className="text-text-3">Keep-alive prepaid</span>
              <span className="font-mono tabular">{formatPot(BigInt(meta.registry.keepAlive) / 10_000n, 3)} tPOT</span>
            </div>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-text-3">
            Portaldot drops data {num(NETWORK.retentionBlocks)} blocks after it was stored, unless someone calls renew. Anyone
            can renew, not just the owner.
          </p>
        </div>

        <dl className="divide-y divide-line rounded-2xl border border-line bg-ink-2 text-sm">
          <div className="px-5 py-3">
            <dt className="flex items-center justify-between text-xs text-text-3">
              CID <CopyButton text={cid} />
            </dt>
            <dd className="mt-1 break-all font-mono text-[11px] text-text-2">{cid}</dd>
          </div>
          {[
            ["Format", meta ? (meta.kind === "dag-pb" ? `UnixFS dag-pb · ${meta.blocks.length - 1} chunks + root` : "raw block") : "…"],
            ["Type", sealed ? "hidden (sealed)" : mime || "…"],
            ["Owner", meta?.registry ? shortCid(meta.registry.owner, 8, 6) : meta ? "not registered" : "…"],
            ["Stored in", meta ? [...new Set(meta.blocks.map((b) => b.block).filter(Boolean))].map((b) => `#${num(b!)}`).join(", ") || "–" : "…"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3">
              <dt className="text-xs text-text-3">{k}</dt>
              <dd className="truncate text-right font-mono text-[11px] text-text-2">{v}</dd>
            </div>
          ))}
          <div className="px-5 py-3">
            <dt className="text-xs text-text-3">Gateway</dt>
            <dd className="mt-1 flex items-center justify-between gap-2">
              <code className="truncate font-mono text-[11px] text-text-2">/ipfs/{shortCid(cid, 10, 6)}</code>
              <CopyButton text={`${typeof window === "undefined" ? "" : window.location.origin}/ipfs/${cid}`} />
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
