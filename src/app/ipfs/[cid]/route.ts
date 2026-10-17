import { getFile, IntegrityError, NotFoundError } from "@potdrive/sdk/fetch";
import { contentHash, parseCid } from "@potdrive/sdk/cid";
import { isEnvelope } from "@potdrive/sdk/envelope";
import { readFile } from "@potdrive/sdk/registry";
import { REGISTRY } from "@/lib/config";
import { mimeFromName, safeType, sniff } from "@/lib/sniff";

export const maxDuration = 60;

// IPFS-style gateway over Portaldot. Every block is fetched with bitswap_v1_get and
// re-hashed against its CID before a single byte is returned.
export async function GET(req: Request, ctx: { params: Promise<{ cid: string }> }) {
  const { cid: raw } = await ctx.params;
  const url = new URL(req.url);
  let cid;
  try {
    cid = parseCid(raw);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  let data: Uint8Array;
  try {
    data = await getFile(cid, { concurrency: 6 });
  } catch (e) {
    if (e instanceof NotFoundError) return Response.json({ error: e.message }, { status: 404 });
    if (e instanceof IntegrityError) return Response.json({ error: e.message }, { status: 502 });
    return Response.json({ error: "Portaldot node unreachable" }, { status: 503 });
  }

  const download = url.searchParams.get("download");
  const name = download || url.searchParams.get("name");
  let mime = mimeFromName(name);
  if (!mime && REGISTRY) {
    const rec = await readFile(REGISTRY, contentHash(cid)).catch(() => null);
    if (rec?.mime && rec.mime !== "application/octet-stream") mime = rec.mime;
  }
  if (isEnvelope(data)) mime = "application/octet-stream";
  mime = safeType(mime ?? sniff(data));

  const headers = new Headers({
    "Content-Type": mime,
    "Content-Length": String(data.length),
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${cid.toString()}"`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox",
    "X-Ipfs-Path": `/ipfs/${cid.toString()}`,
    "X-PotDrive-Verified": "blake2b-256",
  });
  if (download) headers.set("Content-Disposition", `attachment; filename="${download.replace(/["\\\r\n]/g, "_")}"`);
  if (req.headers.get("if-none-match") === headers.get("ETag")) return new Response(null, { status: 304, headers });
  return new Response(data as BodyInit, { headers });
}
