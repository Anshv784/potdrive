import { connect } from "@potdrive/sdk/chain";
import { NETWORK } from "@potdrive/sdk/network";
import { listStored } from "@potdrive/sdk/state";
import { readPage } from "@potdrive/sdk/registry";
import { REGISTRY } from "@/lib/config";

export const maxDuration = 60;

// Everything Portaldot's TransactionStorage holds right now, plus the PotDrive registry.
export async function GET() {
  try {
    const api = await connect(NETWORK.http);
    const [entries, head, page] = await Promise.all([
      listStored(api),
      api.rpc.chain.getHeader().then((h) => h.number.toNumber()),
      REGISTRY ? readPage(REGISTRY, 0, 60).catch(() => null) : null,
    ]);
    return Response.json(
      {
        head,
        entries,
        registry: page
          ? { total: page.total, address: REGISTRY, files: page.files.filter((f) => f.listed).map((f) => ({ ...f, keepAlive: f.keepAlive?.toString() ?? "0" })) }
          : null,
      },
      { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } },
    );
  } catch {
    return Response.json({ error: "Portaldot node unreachable" }, { status: 503 });
  }
}
