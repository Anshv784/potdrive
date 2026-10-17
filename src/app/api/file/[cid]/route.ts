import { contentHash, DAG_PB, parseCid } from "@potdrive/sdk/cid";
import { connect } from "@potdrive/sdk/chain";
import { NotFoundError } from "@potdrive/sdk/fetch";
import { NETWORK } from "@potdrive/sdk/network";
import { expiresAt, placements } from "@potdrive/sdk/renew";
import { readFile } from "@potdrive/sdk/registry";
import { REGISTRY } from "@/lib/config";

export const maxDuration = 60;

// Where a file lives on Portaldot: every block's (block, index) placement, the expiry
// the chain will enforce, and the registry record if there is one.
export async function GET(_req: Request, ctx: { params: Promise<{ cid: string }> }) {
  const { cid: raw } = await ctx.params;
  let cid;
  try {
    cid = parseCid(raw);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const api = await connect(NETWORK.http);
    const [ps, record, head] = await Promise.all([
      placements(api, cid),
      REGISTRY ? readFile(REGISTRY, contentHash(cid)).catch(() => null) : null,
      api.rpc.chain.getHeader().then((h) => h.number.toNumber()),
    ]);
    return Response.json(
      {
        cid: cid.toString(),
        kind: cid.code === DAG_PB ? "dag-pb" : "raw",
        contentHash: contentHash(cid),
        head,
        expiresAt: expiresAt(ps) ?? null,
        blocks: ps.map((p) => ({ cid: p.cid, kind: p.kind, block: p.entry?.block ?? null, index: p.entry?.index ?? null, size: p.entry?.size ?? null })),
        registry: record
          ? { ...record, keepAlive: record.keepAlive?.toString() ?? "0", address: REGISTRY }
          : null,
      },
      { headers: { "Cache-Control": "public, max-age=10" } },
    );
  } catch (e) {
    if (e instanceof NotFoundError) return Response.json({ error: e.message }, { status: 404 });
    return Response.json({ error: "Portaldot node unreachable" }, { status: 503 });
  }
}
