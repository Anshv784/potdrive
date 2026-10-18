import type { ApiPromise } from "@polkadot/api";
import type { KeyringPair } from "@polkadot/keyring/types";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { registryAbi } from "./abi";
import { NETWORK } from "./network";
import { expiresAt, placements } from "./renew";
import { cidOf, evmValue, readPage, reviveCall, type RegistryFile } from "./registry";
import { listStored } from "./state";
import { send } from "./tx";

export interface KeeperAction {
  root: Hex;
  cid: string;
  name: string;
  action: "renewed" | "healthy" | "underfunded" | "expired" | "failed";
  expiresAt?: number;
  cost?: string;
  error?: string;
}

// Renew once a file has less than this left. The keeper runs daily, so 36h leaves
// a full missed run of slack.
export const RENEW_WINDOW_BLOCKS = Math.round((36 * 3_600_000) / NETWORK.blockTimeMs);

export async function runKeeper(api: ApiPromise, keeper: KeyringPair, registry: Address, opts: { dryRun?: boolean } = {}): Promise<KeeperAction[]> {
  const head = (await api.rpc.chain.getHeader()).number.toNumber();
  const entries = await listStored(api);
  const files: RegistryFile[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await readPage(registry, offset, 100);
    files.push(...page.files);
    if (offset + 100 >= page.total) break;
  }

  const out: KeeperAction[] = [];
  for (const f of files) {
    if (!f.keepAlive || f.keepAlive === 0n) continue;
    const cid = cidOf(f).toString();
    const base = { root: f.root, cid, name: f.name || "private file" };
    try {
      const ps = await placements(api, cid, entries);
      const exp = expiresAt(ps);
      if (exp === undefined) {
        out.push({ ...base, action: "expired" });
        continue;
      }
      if (exp - head > RENEW_WINDOW_BLOCKS) {
        out.push({ ...base, action: "healthy", expiresAt: exp });
        continue;
      }
      // Price the renewals exactly as the chain will charge them.
      const txs = ps.map((p) => api.tx.transactionStorage.renew(p.entry!.block, p.entry!.index));
      const fees = await Promise.all(txs.map(async (t) => BigInt((await t.paymentInfo(keeper.address)).partialFee.toString())));
      const cost = fees.reduce((a, b) => a + b, 0n);
      if (evmValue(cost) > f.keepAlive) {
        out.push({ ...base, action: "underfunded", expiresAt: exp, cost: cost.toString() });
        continue;
      }
      if (opts.dryRun) {
        out.push({ ...base, action: "renewed", expiresAt: exp, cost: cost.toString() });
        continue;
      }
      const nonce = (await api.rpc.system.accountNextIndex(keeper.address)).toNumber();
      const included = await Promise.all(txs.map((t, i) => send(api, t, keeper, { nonce: nonce + i })));
      const newExpiry = Math.min(...included.map((i) => i.blockNumber)) + NETWORK.retentionBlocks;
      // The contract checks the claim against what it proved: capped per stored byte, near
      // expiry only, at most one retention period ahead.
      const claim = encodeFunctionData({ abi: registryAbi, functionName: "claimRenewal", args: [f.root, newExpiry, evmValue(cost)] });
      await send(api, await reviveCall(api, keeper.address, registry, claim), keeper);
      out.push({ ...base, action: "renewed", expiresAt: newExpiry, cost: cost.toString() });
    } catch (e) {
      out.push({ ...base, action: "failed", error: (e as Error).message });
    }
  }
  return out;
}
