import { NETWORK } from "@potdrive/sdk/network";

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KiB", "MiB", "GiB"];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.round(v)} ${units[u]}`;
}

export function blocksToMs(blocks: number): number {
  return blocks * NETWORK.blockTimeMs;
}

export function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function untilBlock(target: number, head: number): string {
  const left = target - head;
  return left <= 0 ? "expired" : duration(blocksToMs(left));
}

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

export function mimeLabel(mime: string, name = ""): string {
  const ext = name.includes(".") ? name.split(".").pop()!.toUpperCase() : "";
  if (ext && ext.length <= 5) return ext;
  if (!mime) return "FILE";
  const [type, sub] = mime.split("/");
  if (type === "image" || type === "video" || type === "audio") return sub.toUpperCase().slice(0, 5);
  if (mime === "application/pdf") return "PDF";
  if (type === "text") return "TXT";
  return "FILE";
}
