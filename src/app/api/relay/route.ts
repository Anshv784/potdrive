import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { connect } from "@potdrive/sdk/chain";
import { dispatchMetaTx, metaTxSigner, sponsorTerms, verifySponsorAuth, type SponsorAuth } from "@potdrive/sdk/metatx";
import { permitsAbi } from "@potdrive/sdk/abi";
import { reviveCall } from "@potdrive/sdk/registry";
import { signatureArray } from "@potdrive/sdk/permit";
import { decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";
import { bytesToHex, encodeFunctionData, stringToHex, type Hex } from "viem";
import { PERMITS, REGISTRY } from "@/lib/config";
import { formatPot, NETWORK } from "@potdrive/sdk/network";
import { send } from "@potdrive/sdk/tx";

export const maxDuration = 60;

// Sponsor for gasless uploads (MetaTx pallet). Pays fees for store() meta-transactions
// signed by an upload key that the user's wallet authorized for one root and a byte budget.
//   GET  → status
//   POST { action: "open", auth, signature }              → fund the upload key's existential deposit
//   POST { action: "dispatch", auth, signature, metaTx }   → submit metaTx.dispatch, pay the fee
//   POST { action: "register", auth, signature, upload }   → submit the same signature to
//        PotDrivePermits, which re-checks it on chain and registers the file for the signer

const MAX_BYTES = Number(process.env.RELAY_MAX_BYTES ?? 256 * 1024);
const KEY_FLOAT = 11n * 10n ** 12n; // 0.11 tPOT: existential deposit + pallet byte fees
// Best effort per instance. Bounds abuse together with the auth's byte budget and expiry.
const used = new Map<string, number>();

async function relayer() {
  if (!process.env.RELAYER_SEED) return null;
  await cryptoWaitReady();
  return new Keyring({ type: "sr25519", ss58Format: NETWORK.ss58 }).addFromUri(process.env.RELAYER_SEED);
}

export async function GET() {
  const r = await relayer();
  if (!r) return Response.json({ enabled: false, maxBytes: 0 });
  try {
    const api = await connect(NETWORK.http);
    const info = (await api.query.system.account(r.address)) as unknown as { data: { free: { toString(): string } } };
    const free = BigInt(info.data.free.toString());
    return Response.json({
      enabled: free > 10n ** 15n,
      relayer: r.address,
      balance: formatPot(free, 2),
      maxBytes: MAX_BYTES,
      permits: PERMITS && REGISTRY ? { registry: REGISTRY, permits: PERMITS } : undefined,
    });
  } catch {
    return Response.json({ enabled: false, maxBytes: 0 });
  }
}

function bad(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  const r = await relayer();
  if (!r) return bad("Sponsored uploads are not configured on this deployment", 503);
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    auth?: SponsorAuth;
    signature?: string;
    metaTx?: string;
    upload?: { rootNode: Hex; leaf: Hex; leafSize: string };
  } | null;
  if (!body?.auth || !body.signature) return bad("Missing authorization");
  const { auth, signature } = body;
  if (!verifySponsorAuth(auth, signature)) return bad("The wallet signature does not match this authorization", 401);
  if (auth.bytes > MAX_BYTES) return bad(`Sponsored uploads are limited to ${MAX_BYTES} bytes of new data`);

  const api = await connect();
  const head = (await api.rpc.chain.getHeader()).number.toNumber();
  if (head > auth.expires) return bad("Authorization expired", 401);

  if (body.action === "open") {
    const info = (await api.query.system.account(auth.uploadKey)) as unknown as { data: { free: { toString(): string } } };
    if (BigInt(info.data.free.toString()) >= KEY_FLOAT / 2n) return Response.json({ tx: "", blockNumber: head });
    const inc = await send(api, api.tx.balances.transferKeepAlive(auth.uploadKey, KEY_FLOAT), r);
    return Response.json({ tx: inc.hash, blockNumber: inc.blockNumber });
  }

  if (body.action === "dispatch") {
    if (!body.metaTx) return bad("Missing metaTx");
    let built;
    try {
      built = dispatchMetaTx(api, body.metaTx);
    } catch {
      return bad("Malformed meta-transaction");
    }
    const { metaTx, tx } = built;
    if (metaTxSigner(metaTx) !== auth.uploadKey) return bad("Meta-transaction is not signed by the authorized upload key", 401);
    if (metaTx.call.section !== "transactionStorage" || metaTx.call.method !== "store") return bad("Only transactionStorage.store is sponsored");
    const size = (metaTx.call.args[0] as unknown as { length: number }).length;
    const spent = (used.get(signature) ?? 0) + size;
    if (spent > auth.bytes) return bad("Byte budget for this authorization is used up");
    try {
      const inc = await send(api, tx, r);
      used.set(signature, spent);
      const stored = inc.events.find(({ event }) => api.events.transactionStorage.Stored.is(event));
      const failed = inc.events.find(({ event }) => api.events.metaTx.Dispatched.is(event) && (event.data[0] as unknown as { isErr: boolean }).isErr);
      if (failed || !stored) return bad("The chain rejected the meta-transaction", 422);
      return Response.json({ blockNumber: inc.blockNumber, index: Number(stored.event.data[0].toString()) });
    } catch (e) {
      return bad((e as Error).message, 502);
    }
  }
  if (body.action === "register") {
    if (!PERMITS || !REGISTRY || !auth.permit) return bad("On-chain registration is not configured", 503);
    if (auth.permit.registry.toLowerCase() !== REGISTRY.toLowerCase()) return bad("The permit names a different registry", 401);
    if (!body.upload) return bad("Missing upload");
    const { isPrivate, name, mime, parent } = auth.permit;
    const data = encodeFunctionData({
      abi: permitsAbi,
      functionName: "register",
      args: [
        { rootNode: body.upload.rootNode, leaf: body.upload.leaf, leafSize: BigInt(body.upload.leafSize) },
        { isPrivate, name, mime, parent },
        u8aToHex(decodeAddress(auth.account)) as Hex,
        auth.expires,
        bytesToHex(Uint8Array.from(signatureArray(signature as Hex))),
        stringToHex(sponsorTerms(auth)),
      ],
    });
    try {
      // The contract re-checks the signature with sr25519 and proves the root block itself.
      const inc = await send(api, await reviveCall(api, r.address, PERMITS, data), r);
      return Response.json({ tx: inc.hash, blockNumber: inc.blockNumber });
    } catch (e) {
      return bad((e as Error).message, 502);
    }
  }
  return bad("Unknown action");
}
