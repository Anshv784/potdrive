import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { connect } from "@potdrive/sdk/chain";
import { runKeeper } from "@potdrive/sdk/keeper";
import { NETWORK } from "@potdrive/sdk/network";
import { REGISTRY } from "@/lib/config";

export const maxDuration = 300;

// Daily Vercel cron. Renews registry files whose owners prepaid keep-alive, then
// claims the exact fee back from that file's balance in the registry.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const dryRun = new URL(req.url).searchParams.has("dry");
  if (!dryRun && auth !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!REGISTRY || !process.env.KEEPER_SEED) return Response.json({ error: "keeper not configured" }, { status: 503 });

  await cryptoWaitReady();
  const keeper = new Keyring({ type: "sr25519", ss58Format: NETWORK.ss58 }).addFromUri(process.env.KEEPER_SEED);
  const api = await connect();
  const actions = await runKeeper(api, keeper, REGISTRY, { dryRun });
  return Response.json({ keeper: keeper.address, dryRun, ranAt: new Date().toISOString(), actions });
}
