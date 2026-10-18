import type { Address } from "viem";

// Set after `bun scripts/deploy.ts`. Without it the Drive still stores files; it just
// skips the on-chain ownership record.
export const REGISTRY = (process.env.NEXT_PUBLIC_REGISTRY || undefined) as Address | undefined;

// Optional PotDrivePermits module (`deploy.ts --permits`): lets one wallet signature both
// authorize a sponsored upload and register it on chain.
export const PERMITS = (process.env.NEXT_PUBLIC_PERMITS || undefined) as Address | undefined;

export const SITE = process.env.NEXT_PUBLIC_SITE || "https://potdrive.anshverma.tech";
