import type { Address } from "viem";

// Set after `bun scripts/deploy.ts`. Without it the Drive still stores files; it just
// skips the on-chain ownership record.
export const REGISTRY = (process.env.NEXT_PUBLIC_REGISTRY || undefined) as Address | undefined;

export const SITE = process.env.NEXT_PUBLIC_SITE || "https://potdrive.anshverma.tech";
