import type { ApiPromise } from "@polkadot/api";
import { NETWORK } from "./network";
import { listStored } from "./state";

// TransactionStorage makes the block author of block N include check_proof for the data
// stored at N - RetentionPeriod: a randomly chosen 256-byte chunk plus its trie proof.
// The runtime rejects the block if the proof is missing or wrong, and emits ProofChecked.

export interface ProofBlock {
  number: number;
  hash: string;
  author?: string;
  // null when the node could not be read for this block.
  checked: boolean | null;
  // Data stored RetentionPeriod blocks earlier, which this block had to prove.
  due: boolean;
}

export interface ProofReport {
  head: number;
  blocks: ProofBlock[];
  checkedCount: number;
  dueCount: number;
  nextDue: number | null;
}

export async function proofReport(api: ApiPromise, depth = 12): Promise<ProofReport> {
  const head = (await api.rpc.chain.getHeader()).number.toNumber();
  const entries = await listStored(api);
  const storedBlocks = new Set(entries.map((e) => e.block));
  const nextDue = entries.length ? Math.min(...entries.map((e) => e.block)) + NETWORK.retentionBlocks : null;

  const numbers = Array.from({ length: depth }, (_, i) => head - i).filter((n) => n > 0);
  const read = async (number: number): Promise<ProofBlock> => {
      const hash = (await api.rpc.chain.getBlockHash(number)).toHex();
      const [block, events] = await Promise.all([
        api.rpc.chain.getBlock(hash),
        api.query.system.events.at(hash).catch(() => null),
      ]);
      const hasInherent = block.block.extrinsics.some((x) => x.method.section === "transactionStorage" && x.method.method === "checkProof");
      const evs = (events as unknown as { event: { section: string; method: string } }[] | null) ?? [];
      const proved = evs.some(({ event }) => event.section === "transactionStorage" && event.method === "ProofChecked");
      return { number, hash, checked: hasInherent || proved, due: storedBlocks.has(number - NETWORK.retentionBlocks) };
  };
  const one = async (number: number): Promise<ProofBlock> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await read(number);
      } catch {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    return { number, hash: "", checked: null, due: storedBlocks.has(number - NETWORK.retentionBlocks) };
  };
  // Two at a time: the public node answers 503 to bursts.
  const blocks: ProofBlock[] = [];
  for (let i = 0; i < numbers.length; i += 2) blocks.push(...(await Promise.all(numbers.slice(i, i + 2).map(one))));
  return {
    head,
    blocks,
    checkedCount: blocks.filter((b) => b.checked === true).length,
    dueCount: blocks.filter((b) => b.due).length,
    nextDue,
  };
}
