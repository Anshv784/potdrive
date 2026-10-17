"use client";

// React bindings for PotDrive: render files stored on Portaldot, verified in the browser.
//   <PotImage cid="bafk…" alt="" />
//   const { url, status } = usePotFile(cid)
import { useEffect, useState, type ImgHTMLAttributes, type VideoHTMLAttributes } from "react";
import { getFile, type ChunkCheck } from "../src/fetch";
import { isEnvelope, openFile } from "../src/envelope";

export type PotStatus = "loading" | "ready" | "missing" | "corrupt" | "error";

export interface PotFile {
  url: string | null;
  bytes: Uint8Array | null;
  status: PotStatus;
  verified: number;
  total: number;
  mime?: string;
}

// Fetches every block from a Portaldot node, re-hashes it, and returns an object URL.
// Pass `secret` (the #k= part of a private link) to decrypt in the browser.
export function usePotFile(cid: string | null | undefined, opts: { secret?: string; mime?: string; rpc?: string } = {}): PotFile {
  const [state, setState] = useState<PotFile>({ url: null, bytes: null, status: "loading", verified: 0, total: 0 });
  useEffect(() => {
    if (!cid) return;
    let live = true;
    let url: string | null = null;
    let verified = 0;
    setState({ url: null, bytes: null, status: "loading", verified: 0, total: 0 });
    getFile(cid, {
      url: opts.rpc,
      onLayout: (l: ChunkCheck[]) => live && setState((s) => ({ ...s, total: l.length })),
      onChunk: (c: ChunkCheck) => {
        if (c.status === "ok") verified++;
        if (live) setState((s) => ({ ...s, verified }));
      },
    })
      .then(async (raw) => {
        let body = raw;
        let mime = opts.mime;
        if (isEnvelope(raw)) {
          if (!opts.secret) throw Object.assign(new Error("sealed"), { status: "error" });
          const opened = await openFile(raw, opts.secret);
          body = opened.data;
          mime = opened.meta.mime;
        }
        url = URL.createObjectURL(new Blob([body as BlobPart], mime ? { type: mime } : undefined));
        if (live) setState((s) => ({ ...s, url, bytes: body, status: "ready", mime }));
      })
      .catch((e: Error) => {
        const status: PotStatus = e.name === "IntegrityError" || /does not match/.test(e.message) ? "corrupt" : /Not stored/.test(e.message) ? "missing" : "error";
        if (live) setState((s) => ({ ...s, status }));
      });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [cid, opts.secret, opts.mime, opts.rpc]);
  return state;
}

export function PotImage({ cid, secret, fallback = null, ...img }: { cid: string; secret?: string; fallback?: React.ReactNode } & ImgHTMLAttributes<HTMLImageElement>) {
  const f = usePotFile(cid, { secret });
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return f.url ? <img src={f.url} {...img} /> : <>{fallback}</>;
}

export function PotVideo({ cid, gateway = "https://potdrive.anshverma.tech", ...video }: { cid: string; gateway?: string } & VideoHTMLAttributes<HTMLVideoElement>) {
  // Video streams through the gateway so the browser can seek with Range requests.
  return <video src={`${gateway}/ipfs/${cid}`} {...video} />;
}
