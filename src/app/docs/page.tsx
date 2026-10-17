import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DOCS } from "@/lib/docs-nav";
import { ArchitectureDiagram } from "@/components/docs/diagrams";
import { Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Docs" };

export default function Overview() {
  return (
    <Doc href="/docs">
      <DocHeader
        eyebrow="PotDrive Documentation"
        title="Storage middleware for Portaldot V3"
        summary="PotDrive writes files into Portaldot's own TransactionStorage pallet, addresses them with standard IPFS CIDs, and lets any reader verify every byte against its hash."
      />

      <p>
        Portaldot V3 runs <code>TransactionStorage</code>, the pallet behind Polkadot&apos;s Bulletin chain. Block producers keep
        stored data for 100,800 blocks and must prove they still hold it. The node serves it by CID over a bitswap RPC. Before
        PotDrive there was no SDK, gateway or app for it, and it held no data.
      </p>
      <p>PotDrive is the missing layer on top of that pallet:</p>
      <ul>
        <li>
          <strong>Content-defined chunking</strong> (FastCDC) with chain-level deduplication, so a new version of a file only pays
          for what changed.
        </li>
        <li>
          <strong>One-signature uploads</strong> for any number of blocks, through a throwaway in-tab upload key.
        </li>
        <li>
          <strong>UnixFS files and folders</strong>, including static websites served from the chain.
        </li>
        <li>
          <strong>Verified reads</strong> everywhere: the Drive, the gateway, the SDK and the CLI re-hash every block.
        </li>
        <li>
          <strong>A Solidity registry on Revive</strong> for ownership and prepaid keep-alive, called from the same Polkadot
          wallet.
        </li>
      </ul>

      <figure className="not-prose my-8 overflow-hidden rounded-2xl ring-1 ring-sep">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/shots/drive.jpg" alt="The PotDrive Drive: sections, file list and details panel" className="w-full" />
      </figure>

      <H2 id="architecture">Architecture</H2>
      <ArchitectureDiagram />

      <H2 id="browse">Browse the docs</H2>
      <div className="not-prose mt-6 grid gap-4 sm:grid-cols-2">
        {DOCS.flatMap((g) => g.items)
          .filter((d) => d.href !== "/docs")
          .map((d) => (
            <Link key={d.href} href={d.href} className="group rounded-2xl bg-bg-2 p-5 transition-colors duration-200 hover:bg-fill">
              <div className="flex items-center justify-between text-[17px] font-semibold">
                {d.title}
                <ChevronRight className="size-4 text-label-3 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-[14px] leading-snug text-label-2">{d.summary}</p>
            </Link>
          ))}
      </div>
    </Doc>
  );
}
