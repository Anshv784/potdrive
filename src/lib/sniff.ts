// Best-effort Content-Type from a filename or the first bytes.
const EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  json: "application/json",
  csv: "text/csv; charset=utf-8",
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  wasm: "application/wasm",
  woff2: "font/woff2",
  woff: "font/woff",
  ico: "image/x-icon",
  xml: "application/xml",
  webmanifest: "application/manifest+json",
  zip: "application/zip",
};

export function mimeFromName(name?: string | null): string | undefined {
  const ext = name?.split(".").pop()?.toLowerCase();
  return ext ? EXT[ext] : undefined;
}

export function sniff(bytes: Uint8Array): string {
  const b = bytes;
  const at = (sig: number[], off = 0) => sig.every((v, i) => b[off + i] === v);
  if (at([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (at([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (at([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (at([0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (at([0x66, 0x74, 0x79, 0x70], 4)) return "video/mp4";
  if (at([0x1a, 0x45, 0xdf, 0xa3])) return "video/webm";
  if (at([0x49, 0x44, 0x33]) || at([0xff, 0xfb])) return "audio/mpeg";
  if (at([0x50, 0x4b, 0x03, 0x04])) return "application/zip";
  const head = b.subarray(0, 512);
  const text = head.every((c) => c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || c >= 0xc2);
  return text && head.length ? "text/plain; charset=utf-8" : "application/octet-stream";
}

// Never let stored HTML or SVG run as a page on our origin.
export function safeType(mime: string): string {
  if (/html|svg|xml|javascript/i.test(mime)) return "text/plain; charset=utf-8";
  return mime;
}

export type PreviewKind = "image" | "video" | "audio" | "pdf" | "text" | "binary";

export function previewKind(mime: string): PreviewKind {
  if (mime.startsWith("image/") && !mime.includes("svg")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/") || mime === "application/json") return "text";
  return "binary";
}
