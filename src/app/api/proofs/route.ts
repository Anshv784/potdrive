import { connect } from "@potdrive/sdk/chain";
import { NETWORK } from "@potdrive/sdk/network";
import { proofReport, type ProofReport } from "@potdrive/sdk/proofs";

export const maxDuration = 60;

// The public node rate-limits bursts, so one report is shared for 30 seconds.
let cache: { at: number; report: ProofReport } | null = null;

export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > 30_000) {
      const api = await connect(NETWORK.http);
      cache = { at: Date.now(), report: await proofReport(api) };
    }
    return Response.json(cache.report, { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" } });
  } catch {
    return Response.json({ error: "Portaldot node unreachable" }, { status: 503 });
  }
}
