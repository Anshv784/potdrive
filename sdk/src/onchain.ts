import { bytesToHex, decodeAbiParameters, decodeErrorResult, encodeAbiParameters, type Hex } from "viem";
import type { CID } from "multiformats/cid";
import { checkAbi, checkBytecode } from "./abi";
import { contentHash, DAG_PB } from "./cid";
import { getBlock } from "./fetch";
import { evm } from "./registry";

// Ask Portaldot's own runtime to verify a stored file, for free. PotDriveCheck's creation code
// runs through eth_call (nothing is deployed, nothing is paid): the System precompile hashes
// the block with blake2b-256 and the Solidity UnixFS decoder parses it. The answer comes from
// the chain's execution, not from PotDrive's servers or the reader's own code.

/** The public EVM RPC caps request bodies; raw blocks above this are not sent whole. */
export const CHECK_MAX_RAW = 32 * 1024;

export interface ChainCheck {
  cid: string;
  /** blake2b-256 the runtime computed matches the CID's digest */
  matches: boolean;
  root: Hex;
  kind: "raw" | "directory" | "file";
  size: number;
  links: number;
  chainId: number;
  block: number;
  ms: number;
}

export class ChainCheckError extends Error {
  constructor(
    message: string,
    readonly reason: string,
  ) {
    super(message);
  }
}

const REPORT = [
  {
    type: "tuple",
    components: [
      { name: "root", type: "bytes32" },
      { name: "kind", type: "uint8" },
      { name: "size", type: "uint64" },
      { name: "links", type: "uint32" },
      { name: "signatureValid", type: "bool" },
      { name: "chainId", type: "uint256" },
      { name: "blockNumber", type: "uint256" },
    ],
  },
] as const;

const ARGS = [{ type: "bytes" }, { type: "bool" }, { type: "bytes32" }, { type: "bytes" }, { type: "bytes" }] as const;
const KINDS = ["raw", "directory", "file"] as const;

/** Runs the check over `block` (the CID's root block). */
export async function checkBlockOnChain(cid: CID, block: Uint8Array): Promise<ChainCheck> {
  const dagPb = cid.code === DAG_PB;
  if (!dagPb && block.length > CHECK_MAX_RAW) {
    throw new ChainCheckError(`Single blocks over ${CHECK_MAX_RAW / 1024} KiB are too large to send through the public RPC`, "TooLarge");
  }
  const data = (checkBytecode + encodeAbiParameters(ARGS, [bytesToHex(block), dagPb, `0x${"0".repeat(64)}`, "0x", "0x"]).slice(2)) as Hex;
  const t = performance.now();
  let out: Hex | undefined;
  try {
    out = (await evm.call({ data })).data;
  } catch (e) {
    const raw = (e as { walk?: (f: (x: unknown) => boolean) => { data?: Hex } | null }).walk?.((x) => !!(x as { data?: unknown })?.data)?.data;
    if (raw) {
      const err = decodeErrorResult({ abi: checkAbi, data: raw });
      throw new ChainCheckError(`The runtime refused this block: ${err.errorName}`, err.errorName);
    }
    throw e;
  }
  const r = decodeAbiParameters(REPORT, out!)[0];
  return {
    cid: cid.toString(),
    matches: r.root.toLowerCase() === contentHash(cid).toLowerCase(),
    root: r.root,
    kind: KINDS[r.kind] ?? "raw",
    size: Number(r.size),
    links: r.links,
    chainId: Number(r.chainId),
    block: Number(r.blockNumber),
    ms: Math.round(performance.now() - t),
  };
}

/** Fetches the CID's root block from Portaldot over bitswap, then has the runtime check it. */
export async function checkOnChain(cid: CID, rpcUrl?: string): Promise<ChainCheck> {
  return checkBlockOnChain(cid, await getBlock(cid, rpcUrl));
}
