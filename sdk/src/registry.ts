import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import { createPublicClient, defineChain, encodeFunctionData, http, type Address, type Hex } from "viem";
import { registryAbi } from "./abi";
import { NATIVE_TO_EVM, NETWORK } from "./network";
import { contentHash } from "./cid";
import type { PreparedFile } from "./prepare";

export const portaldot = defineChain({
  id: NETWORK.chainId,
  name: NETWORK.name,
  nativeCurrency: { name: "Test POT", symbol: NETWORK.symbol, decimals: 18 },
  rpcUrls: { default: { http: [NETWORK.evm] } },
});

export const evm = createPublicClient({ chain: portaldot, transport: http(NETWORK.evm) });

export interface RegistryFile {
  root: Hex;
  owner: Address;
  size: number;
  chunks: number;
  storedAt: number;
  expiresAt: number;
  isPrivate: boolean;
  listed: boolean;
  name: string;
  mime: string;
  keepAlive?: bigint;
  registeredIn?: number;
}

type Tuple = readonly [Address, bigint, number, number, number, bigint, boolean, boolean];

const ZERO = /^0x0+$/;

async function state(registry: Address, root: Hex): Promise<Tuple> {
  return (await evm.readContract({ address: registry, abi: registryAbi, functionName: "fileOf", args: [root] })) as Tuple;
}

function merge(root: Hex, t: Tuple, meta: { name: string; mime: string; block?: number }): RegistryFile {
  const [owner, size, chunks, storedAt, expiresAt, keepAlive, isPrivate, listed] = t;
  return {
    root,
    owner,
    size: Number(size),
    chunks: Number(chunks),
    storedAt: Number(storedAt),
    expiresAt: Number(expiresAt),
    isPrivate,
    listed,
    name: meta.name,
    mime: meta.mime,
    keepAlive,
    registeredIn: meta.block,
  };
}

// Revive keeps the index cheap by putting names, types and listings in logs.
const registeredEvent = registryAbi.find((x) => x.type === "event" && x.name === "Registered")!;
const transferredEvent = registryAbi.find((x) => x.type === "event" && x.name === "Transferred")!;

export const REGISTRY_FROM_BLOCK = BigInt(Number(process.env.NEXT_PUBLIC_REGISTRY_BLOCK ?? process.env.POTDRIVE_REGISTRY_BLOCK ?? 0));

async function logs<T>(registry: Address, event: typeof registeredEvent | typeof transferredEvent, args?: Record<string, unknown>) {
  const latest = await evm.getBlockNumber();
  const out: T[] = [];
  const step = 10_000n;
  for (let from = REGISTRY_FROM_BLOCK; from <= latest; from += step) {
    const to = from + step - 1n > latest ? latest : from + step - 1n;
    const page = await evm.getLogs({ address: registry, event: event as never, args: args as never, fromBlock: from, toBlock: to });
    out.push(...(page as unknown as T[]));
  }
  return out;
}

interface RegLog {
  args: { root: Hex; owner: Address; name: string; mime: string };
  blockNumber: bigint;
}

async function registrations(registry: Address, owner?: Address): Promise<RegLog[]> {
  return logs<RegLog>(registry, registeredEvent, owner ? { owner } : undefined);
}

export async function readFile(registry: Address, root: Hex): Promise<RegistryFile | null> {
  const t = await state(registry, root);
  if (ZERO.test(t[0])) return null;
  const reg = (await logs<RegLog>(registry, registeredEvent).catch(() => [])).find((l) => l.args.root.toLowerCase() === root.toLowerCase());
  return merge(root, t, { name: reg?.args.name ?? "", mime: reg?.args.mime ?? "", block: reg ? Number(reg.blockNumber) : undefined });
}

export async function readOwned(registry: Address, owner: Address): Promise<RegistryFile[]> {
  const [mine, incoming, all] = await Promise.all([
    registrations(registry, owner),
    logs<{ args: { root: Hex } }>(registry, transferredEvent, { to: owner }),
    registrations(registry),
  ]);
  const meta = new Map(all.map((l) => [l.args.root.toLowerCase(), l]));
  const roots = [...new Set([...mine.map((l) => l.args.root), ...incoming.map((l) => l.args.root)])];
  const files = await Promise.all(
    roots.map(async (root) => {
      const m = meta.get(root.toLowerCase());
      return merge(root, await state(registry, root), { name: m?.args.name ?? "", mime: m?.args.mime ?? "", block: m ? Number(m.blockNumber) : undefined });
    }),
  );
  return files.filter((f) => f.owner.toLowerCase() === owner.toLowerCase()).sort((a, b) => b.storedAt - a.storedAt);
}

export async function readPage(registry: Address, offset = 0, limit = 50): Promise<{ files: RegistryFile[]; total: number }> {
  const all = (await registrations(registry)).reverse();
  const slice = all.slice(offset, offset + limit);
  const files = await Promise.all(
    slice.map(async (l) => merge(l.args.root, await state(registry, l.args.root), { name: l.args.name, mime: l.args.mime, block: Number(l.blockNumber) })),
  );
  return { files, total: all.length };
}

// ---- writes, sent as native revive.call extrinsics so one Polkadot wallet does everything ----

export async function evmAddressOf(api: ApiPromise, ss58: string): Promise<Address> {
  return (await api.call.reviveApi.address(ss58)).toString() as Address;
}

export function registerCalldata(file: PreparedFile): Hex {
  const chunks = file.blocks.length > 1 ? file.blocks.length - 1 : 1;
  return encodeFunctionData({
    abi: registryAbi,
    functionName: "register",
    args: [contentHash(file.root), BigInt(file.storedBytes), chunks, file.private, file.name, file.mime],
  });
}

export function fundCalldata(root: Hex): Hex {
  return encodeFunctionData({ abi: registryAbi, functionName: "fund", args: [root] });
}

export function withdrawCalldata(root: Hex): Hex {
  return encodeFunctionData({ abi: registryAbi, functionName: "withdraw", args: [root] });
}

export function setListedCalldata(root: Hex, listed: boolean): Hex {
  return encodeFunctionData({ abi: registryAbi, functionName: "setListed", args: [root, listed] });
}

type Deposit = { charge?: string | number; Charge?: string | number };
type Flags = number | { bits: number };
interface DryRun {
  weightRequired?: { refTime: string | number; proofSize: string | number };
  gasRequired?: { refTime: string | number; proofSize: string | number };
  storageDeposit?: Deposit;
  maxStorageDeposit?: Deposit;
  result?: { ok?: { flags: Flags; data: string }; Ok?: { flags: Flags; data: string }; err?: unknown; Err?: unknown };
}

const reverted = (flags: Flags) => ((typeof flags === "number" ? flags : flags.bits) & 1) === 1;
const charge = (d?: Deposit) => BigInt(d?.charge ?? d?.Charge ?? 0);

export class ContractRevert extends Error {}

// Dry-runs the call to size weight and storage deposit, then returns a signed-ready
// revive.call. `value` is in native planck; the contract sees it scaled to 18 decimals.
export async function reviveCall(
  api: ApiPromise,
  origin: string,
  dest: Address,
  data: Hex,
  value = 0n,
): Promise<SubmittableExtrinsic<"promise">> {
  const res = (await api.call.reviveApi.call(origin, dest, value, null, null, data)).toJSON() as DryRun;
  const ok = res.result?.ok ?? res.result?.Ok;
  if (!ok || reverted(ok.flags)) {
    throw new ContractRevert(`Registry call would revert${ok?.data ? ` (${ok.data.slice(0, 10)})` : ""}`);
  }
  const w = res.weightRequired ?? res.gasRequired!;
  const weight = {
    refTime: (BigInt(w.refTime) * 12n) / 10n,
    proofSize: (BigInt(w.proofSize) * 12n) / 10n,
  };
  const deposit = [charge(res.storageDeposit), charge(res.maxStorageDeposit)].reduce((a, b) => (a > b ? a : b));
  return api.tx.revive.call(dest, value, weight, (deposit * 12n) / 10n + 1n, data);
}

export function evmValue(planck: bigint): bigint {
  return planck * NATIVE_TO_EVM;
}

export function nativeValue(wei: bigint): bigint {
  return wei / NATIVE_TO_EVM;
}
