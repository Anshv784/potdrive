// Portaldot V3 testnet. Endpoints moved to portaldot.dev on 2026-10-16.
export const NETWORK = {
  name: "Portaldot V3 Testnet",
  ws: "wss://test-node-v3.portaldot.dev",
  http: "https://test-node-v3.portaldot.dev",
  evm: "https://test-evm-rpc-v3.portaldot.dev",
  explorer: "https://node-console.portaldot.dev",
  chainId: 420420777,
  ss58: 42,
  decimals: 14,
  symbol: "tPOT",
  blockTimeMs: 6000,
  // TransactionStorage.RetentionPeriod, read from chain state.
  retentionBlocks: 100_800,
  // TransactionStorage.MaxTransactionSize.
  maxTransactionBytes: 8 * 1024 * 1024,
} as const;

// 1 MiB leaves, the same size Polkadot's Bulletin chain uses. Bitswap caps blocks at 2 MiB.
export const CHUNK_SIZE = 1024 * 1024;

// Revive maps native balances to 18-decimal EVM values (nativeToEthRatio = 10_000).
export const NATIVE_TO_EVM = 10_000n;

export const PLANCK = 10n ** BigInt(NETWORK.decimals);

export function formatPot(planck: bigint, digits = 4): string {
  const whole = planck / PLANCK;
  const frac = planck % PLANCK;
  if (digits === 0) return whole.toLocaleString("en-US");
  const fracStr = frac.toString().padStart(NETWORK.decimals, "0").slice(0, digits).replace(/0+$/, "");
  return fracStr ? `${whole.toLocaleString("en-US")}.${fracStr}` : whole.toLocaleString("en-US");
}

export function retentionMs(): number {
  return NETWORK.retentionBlocks * NETWORK.blockTimeMs;
}
