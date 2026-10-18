import { parseCid } from "@potdrive/sdk/cid";
import { NotFoundError } from "@potdrive/sdk/fetch";
import { ChainCheckError, checkOnChain } from "@potdrive/sdk/onchain";

export const maxDuration = 30;

// Has Portaldot's runtime verify a stored file: the root block is fetched over bitswap and
// PotDriveCheck runs through eth_call (blake2b via the System precompile, UnixFS decoded in
// Solidity). Free, nothing deployed. Results are stable per CID, so they cache well.
export async function GET(_req: Request, ctx: { params: Promise<{ cid: string }> }) {
  const { cid: raw } = await ctx.params;
  let cid;
  try {
    cid = parseCid(raw);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const result = await checkOnChain(cid);
    return Response.json(result, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
  } catch (e) {
    if (e instanceof NotFoundError) return Response.json({ error: "Portaldot does not hold this block" }, { status: 404 });
    if (e instanceof ChainCheckError) return Response.json({ error: e.message, reason: e.reason }, { status: 422 });
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
