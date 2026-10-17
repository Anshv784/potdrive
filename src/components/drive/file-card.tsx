"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { NETWORK } from "@potdrive/sdk/network";
import { bytes, mimeLabel, untilBlock } from "@/lib/format";
import { DocIcon, Ring } from "../ui";

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

export function expiryTone(expiresAt: number | undefined, head: number | null) {
  if (!expiresAt || !head) return { frac: 0, tone: "var(--fill-2)" };
  const frac = Math.max(0, Math.min(1, (expiresAt - head) / NETWORK.retentionBlocks));
  return { frac, tone: frac < 0.15 ? "var(--red)" : frac < 0.4 ? "var(--orange)" : "var(--green)" };
}

export function FileCard({ f, head }: { f: CardFile; head: number | null; index?: number }) {
  const dir = f.mime === "inode/directory";
  const href = dir ? `/ipfs/${f.root}/` : `/f/${f.root}${f.name && !f.isPrivate ? `?name=${encodeURIComponent(f.name)}` : ""}${f.key ? `#k=${f.key}` : ""}`;
  const isImage = f.mime.startsWith("image/") && !f.mime.includes("svg") && !f.isPrivate;
  const { frac, tone } = expiryTone(f.expiresAt, head);
  return (
    <Link href={href} target={dir ? "_blank" : undefined} prefetch={dir ? false : undefined} className="group flex flex-col items-center rounded-2xl p-3 text-center transition-colors duration-200 hover:bg-bg-2">
      <div className="relative grid h-32 w-full place-items-center">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/ipfs/${f.root}`} alt="" loading="lazy" className="max-h-32 max-w-full rounded-lg object-contain shadow-card" />
        ) : (
          <DocIcon type={f.isPrivate ? "LOCK" : mimeLabel(f.mime, f.name)} size={72} />
        )}
        {f.isPrivate && (
          <span className="absolute bottom-1 right-[calc(50%-48px)] grid size-6 place-items-center rounded-full bg-label text-bg shadow-card">
            <Lock className="size-3" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="mt-2 w-full truncate text-[13px] font-medium">{f.name || "Private file"}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-label-2 tabular">
        <Ring value={frac} size={12} stroke={2.5} tone={tone} />
        {bytes(f.size)} · {f.expiresAt && head ? untilBlock(f.expiresAt, head) : "–"}
      </div>
    </Link>
  );
}
