"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { shortCid } from "@potdrive/sdk/cid";
import { NETWORK } from "@potdrive/sdk/network";
import { bytes, mimeLabel, untilBlock } from "@/lib/format";

export interface CardFile {
  root: string;
  name: string;
  mime: string;
  size: number;
  key?: string;
  isPrivate: boolean;
  expiresAt?: number;
  registered: boolean;
}

export function ExpiryRing({ expiresAt, head, size = 34 }: { expiresAt?: number; head: number | null; size?: number }) {
  const left = expiresAt && head ? Math.max(0, expiresAt - head) : null;
  const frac = left === null ? 0 : Math.min(1, left / NETWORK.retentionBlocks);
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const tone = left === null ? "var(--paper-line)" : frac < 0.15 ? "var(--bad)" : frac < 0.4 ? "var(--warn)" : "var(--violet)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-line)" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }}
      />
    </svg>
  );
}

export function FileCard({ f, head, index }: { f: CardFile; head: number | null; index: number }) {
  const href = `/f/${f.root}${f.name && !f.isPrivate ? `?name=${encodeURIComponent(f.name)}` : ""}${f.key ? `#k=${f.key}` : ""}`;
  const isImage = f.mime.startsWith("image/") && !f.isPrivate;
  return (
    <Link
      href={href}
      className="paper group relative block overflow-hidden rounded-xl transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.8)]"
      style={{ rotate: `${((index * 37) % 5) * 0.15 - 0.3}deg` }}
    >
      <div className="relative h-28 border-b border-paper-line bg-paper-2">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/ipfs/${f.root}`} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center">
            <span className="font-serif text-4xl text-paper-mute/70">{mimeLabel(f.mime, f.name)}</span>
          </div>
        )}
        {f.isPrivate && (
          <span className="stamp absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded border border-paper-ink/30 bg-paper px-1.5 py-0.5 text-[9px] text-paper-ink">
            <Lock className="size-2.5" /> Sealed
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{f.name || "Private file"}</div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-paper-mute">
            {bytes(f.size)} · {shortCid(f.root, 8, 4)}
          </div>
        </div>
        <div className="relative grid place-items-center" title={f.expiresAt && head ? `Expires in ${untilBlock(f.expiresAt, head)}` : "Expiry unknown"}>
          <ExpiryRing expiresAt={f.expiresAt} head={head} />
          <span className="absolute font-mono text-[8px] text-paper-mute">
            {f.expiresAt && head ? untilBlock(f.expiresAt, head).split(" ")[0] : "–"}
          </span>
        </div>
      </div>
    </Link>
  );
}
