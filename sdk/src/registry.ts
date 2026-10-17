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
}

type RawFile = {
  owner: Address;
  size: bigint;
  chunks: number;
  storedAt: number;
  expiresAt: number;
  isPrivate: boolean;
  listed: boolean;
  name: string;
  mime: string;
};

const toFile = (root: Hex, f: RawFile, keepAlive?: bigint): RegistryFile => ({
  root,
  owner: f.owner,
  size: Number(f.size),
  chunks: Number(f.chunks),
  storedAt: Number(f.storedAt),
  expiresAt: Number(f.expiresAt),
  isPrivate: f.isPrivate,
  listed: f.listed,
  name: f.name,
  mime: f.mime,
  keepAlive,
});

export async function readFile(registry: Address, root: Hex): Promise<RegistryFile | null> {
  const [f, balance] = await Promise.all([
    evm.readContract({ address: registry, abi: registryAbi, functionName: "fileOf", args: [root] }) as Promise<RawFile>,
    evm.readContract({ address: registry, abi: registryAbi, functionName: "keepAlive", args: [root] }) as Promise<bigint>,
  ]);
  if (/^0x0+$/.test(f.owner)) return null;
  return toFile(root, f, balance);
}

export async function readOwned(registry: Address, owner: Address): Promise<RegistryFile[]> {
  const [roots, files] = (await evm.readContract({ address: registry, abi: registryAbi, functionName: "filesOf", args: [owner] })) as [Hex[], RawFile[]];
  return roots.map((r, i) => toFile(r, files[i])).reverse();
}

export async function readPage(registry: Address, offset = 0, limit = 50): Promise<{ files: RegistryFile[]; total: number }> {
  const [page, total] = await Promise.all([
    evm.readContract({ address: registry, abi: registryAbi, functionName: "page", args: [BigInt(offset), BigInt(limit)] }) as Promise<[Hex[], RawFile[], bigint[]]>,
    evm.readContract({ address: registry, abi: registryAbi, functionName: "count" }) as Promise<bigint>,
  ]);
  const [roots, files, balances] = page;
  return { files: roots.map((r, i) => toFile(r, files[i], balances[i])), total: Number(total) };
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
