"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowDownToLine, CheckCircle2, KeyRound, Lock, RotateCw, TriangleAlert } from "lucide-react";
import type { ChunkCheck } from "@potdrive/sdk/fetch";
import { shortCid } from "@potdrive/sdk/cid";
import { formatPot, NETWORK } from "@potdrive/sdk/network";
import { bytes, mimeLabel, num, untilBlock } from "@/lib/format";
import { mimeFromName, previewKind, sniff } from "@/lib/sniff";
import { keyFor } from "@/lib/library";
import { useHead } from "../chain-pulse";
import { CopyButton } from "../code";
import { expiryTone } from "../drive/file-card";
import { Button, DocIcon, Group, Ring, Row, Spinner } from "../ui";

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

  const { frac, tone } = expiryTone(expiry ?? undefined, head);
  const allOk = checks.length > 0 && verified === checks.length;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-label-2">{sealed ? "Private file" : "File"} on Portaldot</p>
          <h1 className="headline mt-1 truncate text-[32px] sm:text-[40px]">{name || (sealed ? "Private file" : shortCid(cid, 10, 6))}</h1>
        </div>
        {url && (
          <a
            href={url}
            download={name || cid}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-[15px] text-white transition-colors duration-200 hover:bg-accent-hover"
          >
            <ArrowDownToLine className="size-4" /> Download
          </a>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* preview */}
        <section className="grid min-h-[420px] place-items-center overflow-hidden rounded-[22px] bg-bg-2">
          {state === "loading" && (
            <div className="p-10 text-center">
              <Spinner className="mx-auto size-7 text-label-3" />
              <div className="mt-4 text-[17px] font-semibold">Fetching from Portaldot</div>
              <p className="mt-1 text-[13px] text-label-2 tabular">
                {verified} of {checks.length || "?"} blocks verified
              </p>
            </div>
          )}
          {state === "ok" && url && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="grid size-full place-items-center">
              {kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={name} className="max-h-[70vh] w-auto object-contain" />
              )}
              {kind === "video" && <video src={url} controls className="max-h-[70vh] w-full bg-black" />}
              {kind === "audio" && (
                <div className="w-full max-w-md p-10 text-center">
                  <DocIcon type={mimeLabel(mime, name)} size={64} />
                  <audio src={url} controls className="mt-6 w-full" />
                </div>
              )}
              {kind === "pdf" && <iframe src={url} title={name} className="h-[75vh] w-full bg-white" />}
              {kind === "text" && text !== null && (
                <pre className="max-h-[70vh] w-full self-start overflow-auto whitespace-pre-wrap p-6 font-mono text-[13px] leading-relaxed [letter-spacing:0]">{text}</pre>
              )}
              {kind === "binary" && (
                <div className="p-10 text-center">
                  <DocIcon type={mimeLabel(mime, name)} size={80} />
                  <p className="mt-5 text-[15px] text-label-2">No preview for this type. The download is the verified original.</p>
                </div>
              )}
            </motion.div>
          )}
          {(state === "locked" || state === "badkey") && (
            <div className="max-w-sm p-10 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-fill">
                <Lock className="size-7 text-label-2" />
              </span>
              <div className="headline mt-5 text-[24px]">{state === "badkey" ? "That key doesn't open it." : "This file is private."}</div>
              <p className="mt-2 text-[15px] text-label-2">Portaldot holds ciphertext only. Paste the full link or its key to open it here. It never leaves this tab.</p>
              <form
                className="mt-5 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  tryKey(new FormData(e.currentTarget).get("k") as string);
                }}
              >
                <input name="k" placeholder="Link or key" aria-label="Link or key" className="h-10 min-w-0 flex-1 rounded-full bg-surface px-4 text-[15px] outline-none ring-1 ring-sep focus:ring-2 focus:ring-accent" />
                <Button type="submit">
                  <KeyRound className="size-4" /> Open
                </Button>
              </form>
            </div>
          )}
          {(state === "missing" || state === "corrupt" || state === "error") && (
            <div className="max-w-sm p-10 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-fill">
                <TriangleAlert className="size-7 text-orange" />
              </span>
              <div className="headline mt-5 text-[24px]">
                {state === "missing" ? "Not on Portaldot." : state === "corrupt" ? "Hash mismatch." : "Can't reach Portaldot."}
              </div>
              <p className="mt-2 text-[15px] text-label-2">
                {state === "missing"
                  ? "Nothing with this ID is held right now. It was never stored, or its retention ran out without a renewal."
                  : state === "corrupt"
                    ? "A block came back that doesn't match its ID, so PotDrive refused it."
                    : "The Portaldot node didn't answer. Try again in a moment."}
              </p>
              <Button variant="gray" className="mt-5" onClick={() => setRun((r) => r + 1)}>
                <RotateCw className="size-4" /> Try Again
              </Button>
            </div>
          )}
        </section>

        {/* info */}
        <aside className="space-y-6">
          <div className="rounded-[22px] bg-bg-2 p-5">
            <div className="flex items-center gap-3">
              {allOk ? <CheckCircle2 className="size-6 text-green" /> : state === "loading" ? <Spinner className="size-5 text-label-3" /> : <TriangleAlert className="size-5 text-orange" />}
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{allOk ? "Verified on this device" : state === "loading" ? "Verifying" : "Not verified"}</div>
                <div className="text-[12px] text-label-2 tabular">
                  {verified} of {checks.length} blocks · {data ? `${bytes(size || data.length)} in ${Math.round(ms)} ms` : "…"}
                </div>
              </div>
              <button onClick={() => setRun((r) => r + 1)} className="rounded-full p-1.5 text-link hover:bg-accent-soft" aria-label="Verify again">
                <RotateCw className="size-4" />
              </button>
            </div>
            <ol className="mt-4 grid grid-cols-8 gap-1.5" aria-label="Block verification">
              {checks.map((c) => (
                <li
                  key={c.index}
                  title={`${c.cid} · ${c.status}${c.ms ? ` · ${Math.round(c.ms)} ms` : ""}`}
                  className={`aspect-square rounded-md transition-colors duration-300 ${c.status === "ok" ? "bg-green" : c.status === "pending" ? "pulse-soft bg-fill-2" : "bg-red"}`}
                />
              ))}
            </ol>
            <p className="mt-3 text-[12px] leading-snug text-label-2">
              Every block came straight from a Portaldot node and was re-hashed with blake2b-256 against its ID.
            </p>
          </div>

          <Group gray title="Retention">
            <div className="flex items-center gap-4 px-4 py-3.5">
              <div className="relative grid place-items-center">
                <Ring value={frac} size={44} stroke={4} tone={tone} />
              </div>
              <div>
                <div className="text-[15px] font-medium">{expiry && head ? `Kept for ${untilBlock(expiry, head)}` : meta ? "Not held right now" : "Reading chain…"}</div>
                <div className="text-[12px] text-label-2 tabular">{expiry ? `until block ${num(expiry)}` : `${num(NETWORK.retentionBlocks)} blocks per payment`}</div>
              </div>
            </div>
            {meta?.registry && <Row label="Keep-alive prepaid" detail={`${formatPot(BigInt(meta.registry.keepAlive) / 10_000n, 2)} tPOT`} />}
          </Group>

          <Group gray title="Info">
            <Row label="Kind" detail={sealed ? "Encrypted" : mime ? mimeLabel(mime, name) : "…"} />
            <Row label="Format" detail={meta ? (meta.kind === "dag-pb" ? `${meta.blocks.length - 1} blocks + root` : "Single block") : "…"} />
            <Row label="Owner" detail={meta?.registry ? <span className="font-mono text-[13px]">{shortCid(meta.registry.owner, 6, 4)}</span> : meta ? "Unregistered" : "…"} />
            <Row
              label="Stored in"
              detail={meta ? [...new Set(meta.blocks.map((b) => b.block).filter(Boolean))].map((b) => `#${num(b!)}`).join(", ") || "–" : "…"}
            />
          </Group>

          <Group gray title="Content ID">
            <div className="break-all px-4 pt-3 font-mono text-[12px] text-label-2 [letter-spacing:0]">{cid}</div>
            <div className="flex px-2 py-1.5">
              <CopyButton text={cid} label="Copy ID" className="text-[15px]" />
              <CopyButton text={`${typeof window === "undefined" ? "" : window.location.origin}/ipfs/${cid}`} label="Copy Gateway URL" className="ml-auto text-[15px]" />
            </div>
          </Group>
        </aside>
      </div>
    </div>
  );
}
