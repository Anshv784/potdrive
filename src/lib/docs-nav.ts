export interface DocLink {
  href: string;
  title: string;
  summary: string;
  // Extra words for search.
  keywords?: string;
}

export interface DocGroup {
  title: string;
  items: DocLink[];
}

export const DOCS: DocGroup[] = [
  {
    title: "Get started",
    items: [
      { href: "/docs", title: "Overview", summary: "What PotDrive is and how the pieces fit together." },
      { href: "/docs/quickstart", title: "Quickstart", summary: "Store your first file from the Drive, the SDK or the CLI.", keywords: "install wallet tpot faucet" },
    ],
  },
  {
    title: "Concepts",
    items: [
      { href: "/docs/storage", title: "TransactionStorage", summary: "How Portaldot holds data: indexing, retention, renewals and storage proofs.", keywords: "pallet retention renew checkProof fee indexing bitswap" },
      { href: "/docs/content-addressing", title: "Content addressing", summary: "Blake2b CIDs, UnixFS DAGs, FastCDC chunking and deduplication.", keywords: "cid multihash dag-pb unixfs fastcdc dedup chunking" },
      { href: "/docs/uploads", title: "One-signature uploads", summary: "The upload key, its lifecycle, and why blocks can't share a batch.", keywords: "session key batch sweep recover nonce" },
      { href: "/docs/verification", title: "Verification and trust", summary: "What a reader checks, what it trusts, and what validators prove.", keywords: "integrity availability trust proof" },
    ],
  },
  {
    title: "Guides",
    items: [
      { href: "/docs/sponsored", title: "Gasless uploads", summary: "Upload with 0 tPOT: a relay pays through Portaldot's MetaTx pallet.", keywords: "metatx meta transaction relay sponsor gasless free" },
      { href: "/docs/versions", title: "Versions", summary: "New versions link to the old one and only pay for blocks that changed.", keywords: "version history parent dedup" },
      { href: "/docs/private-files", title: "Private files", summary: "Client-side AES-256-GCM, the envelope format and share links.", keywords: "encryption aes gcm key fragment envelope" },
      { href: "/docs/sharing", title: "Share with a wallet", summary: "Seal a private file's key to another address with X25519 inbox keys.", keywords: "share inbox x25519 ecies recipient" },
      { href: "/docs/nfts", title: "NFTs", summary: "Mint on Portaldot's native Nfts pallet with media stored on Portaldot.", keywords: "nft nfts pallet mint collection metadata" },
      { href: "/docs/websites", title: "Host a website", summary: "Deploy a static site as a UnixFS directory and serve it from the chain.", keywords: "deploy static site folder index.html sandbox" },
      { href: "/docs/keep-alive", title: "Keep-alive", summary: "Prepaid renewals and the keeper that spends them.", keywords: "keeper cron renewal prepaid" },
    ],
  },
  {
    title: "Reference",
    items: [
      { href: "/docs/sdk", title: "SDK", summary: "Every exported function, with signatures and examples.", keywords: "typescript api prepareFile uploadFile getFile readRange" },
      { href: "/docs/cli", title: "CLI", summary: "put, get, deploy, info, renew and ls.", keywords: "command line terminal" },
      { href: "/docs/react", title: "React", summary: "usePotFile, <PotImage> and <PotVideo>: verified files in any React app.", keywords: "react hook component npm package" },
      { href: "/docs/mcp", title: "MCP server", summary: "Let AI agents read, store and deploy on Portaldot.", keywords: "mcp ai agent claude cursor tools" },
      { href: "/docs/gateway", title: "Gateway API", summary: "HTTP routes, Range requests, headers and status codes.", keywords: "http ipfs range headers 206" },
      { href: "/docs/registry", title: "Registry contract", summary: "PotDriveRegistry on Revive: functions, events and storage layout.", keywords: "solidity revive evm contract deposit events" },
      { href: "/docs/security", title: "Security model", summary: "Threats, what PotDrive does about each, and what it doesn't.", keywords: "threat xss sandbox keys" },
      { href: "/docs/limits", title: "Costs and limits", summary: "Measured fees, sizes, retention and known constraints.", keywords: "fee cost price limit faq" },
    ],
  },
];

export const DOC_LIST: DocLink[] = DOCS.flatMap((g) => g.items);

export function neighbours(href: string): { prev?: DocLink; next?: DocLink } {
  const i = DOC_LIST.findIndex((d) => d.href === href);
  return { prev: i > 0 ? DOC_LIST[i - 1] : undefined, next: i >= 0 && i < DOC_LIST.length - 1 ? DOC_LIST[i + 1] : undefined };
}
