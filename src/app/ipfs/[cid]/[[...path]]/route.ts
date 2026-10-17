import { contentHash, parseCid } from "@potdrive/sdk/cid";
import { isEnvelope } from "@potdrive/sdk/envelope";
import { getBlock, IntegrityError, NotFoundError, PathError, readRange, resolvePath, stat, type Stat } from "@potdrive/sdk/fetch";
import { readFile } from "@potdrive/sdk/registry";
import { REGISTRY } from "@/lib/config";
import { mimeFromName, sniff } from "@/lib/sniff";

export const maxDuration = 60;

// Cap a single response so one request can't pull a whole large file through a function.
const MAX_BODY = 32 * 1024 * 1024;

// Stored sites run, but in an opaque origin: no access to this site's cookies or storage.
const SANDBOX = "sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads";

function error(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "Access-Control-Allow-Origin": "*" } });
}

function listing(cid: string, path: string, s: Stat) {
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const base = `/ipfs/${cid}/${path ? `${path.replace(/\/$/, "")}/` : ""}`;
  const rows = s
    .node!.links.map((l) => `<tr><td><a href="${base}${encodeURIComponent(l.name)}">${esc(l.name)}</a></td><td>${l.size.toLocaleString("en-US")} B</td><td><code>${l.cid}</code></td></tr>`)
    .join("");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(path || cid)}</title>
<style>body{font:15px -apple-system,BlinkMacSystemFont,Inter,sans-serif;margin:40px auto;max-width:860px;padding:0 20px;color:#1d1d1f}h1{font-size:28px;letter-spacing:-.02em}td{padding:8px 12px 8px 0;border-bottom:1px solid #e5e5ea}code{font-size:11px;color:#86868b}a{color:#0066cc;text-decoration:none}@media(prefers-color-scheme:dark){body{background:#000;color:#f5f5f7}td{border-color:#2c2c2e}a{color:#2997ff}}</style>
<h1>/${esc(path)}</h1><p style="color:#6e6e73">Directory stored on Portaldot · <code>${cid}</code></p><table>${rows}</table>`;
}

export async function GET(req: Request, ctx: { params: Promise<{ cid: string; path?: string[] }> }) {
  const { cid: raw, path = [] } = await ctx.params;
  const url = new URL(req.url);
  let root;
  try {
    root = parseCid(raw);
  } catch (e) {
    return error(400, (e as Error).message);
  }
  const subpath = path.map(decodeURIComponent).join("/");

  let target: Stat;
  try {
    target = subpath ? await resolvePath(root, subpath) : await stat(root);
    if (target.kind === "directory") {
      // Relative links in a site need the trailing slash.
      if (!url.pathname.endsWith("/")) return Response.redirect(`${url.origin}${url.pathname}/${url.search}`, 301);
      const index = target.node!.links.find((l) => l.name === "index.html");
      if (!index) {
        return new Response(listing(root.toString(), subpath, target), {
          headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": SANDBOX, "Cache-Control": "public, max-age=31536000, immutable" },
        });
      }
      target = await stat(index.cid);
      path.push("index.html");
    }
  } catch (e) {
    if (e instanceof NotFoundError) return error(404, e.message);
    if (e instanceof PathError) return error(404, e.message);
    if (e instanceof IntegrityError) return error(502, e.message);
    return error(503, "Portaldot node unreachable");
  }

  // Content-Type: ?name / path extension, then the registry, then magic bytes.
  const download = url.searchParams.get("download");
  let mime = mimeFromName(download || url.searchParams.get("name") || path.at(-1));
  if (!mime && !subpath && REGISTRY) {
    const rec = await readFile(REGISTRY, contentHash(root)).catch(() => null);
    if (rec?.mime && !["application/octet-stream", "inode/directory"].includes(rec.mime)) mime = rec.mime;
  }
  if (!mime) {
    // Sniff from the first block only when the name and registry say nothing.
    const head = target.raw ?? (target.node?.links[0] ? await getBlock(target.node.links[0].cid).catch(() => new Uint8Array()) : new Uint8Array());
    mime = isEnvelope(head) ? "application/octet-stream" : sniff(head);
  }
  const active = /html|svg|xml|javascript/i.test(mime);

  // HTTP Range: only the chunks covering the range are fetched from chain.
  const size = target.size;
  let start = 0;
  let end = size;
  let status = 200;
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    if (range[1] === "") {
      start = Math.max(0, size - Number(range[2]));
    } else {
      start = Number(range[1]);
      end = range[2] ? Math.min(size, Number(range[2]) + 1) : size;
    }
    if (start >= size || start >= end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    end = Math.min(end, start + MAX_BODY);
    status = 206;
  } else if (size > MAX_BODY) {
    // Browsers retry media with Range; downloads get the first window plus Accept-Ranges.
    end = MAX_BODY;
    status = 206;
  }

  let body: Uint8Array;
  try {
    body = await readRange(target, start, end, { concurrency: 6 });
  } catch (e) {
    if (e instanceof IntegrityError) return error(502, e.message);
    if (e instanceof NotFoundError) return error(404, e.message);
    return error(503, "Portaldot node unreachable");
  }

  const etag = `"${target.cid.toString()}"`;
  const headers = new Headers({
    "Content-Type": mime,
    "Content-Length": String(body.length),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, X-Ipfs-Path, X-PotDrive-Verified",
    "X-Content-Type-Options": "nosniff",
    "X-Ipfs-Path": `/ipfs/${root.toString()}${subpath ? `/${subpath}` : ""}`,
    "X-PotDrive-Verified": "blake2b-256",
  });
  if (active) headers.set("Content-Security-Policy", SANDBOX);
  if (status === 206) headers.set("Content-Range", `bytes ${start}-${end - 1}/${size}`);
  if (download) headers.set("Content-Disposition", `attachment; filename="${download.replace(/["\\\r\n]/g, "_")}"`);
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(body as BodyInit, { status, headers });
}
