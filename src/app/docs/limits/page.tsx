import type { Metadata } from "next";
import { Doc, DocHeader, H2, H3 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Costs and limits" };

const rows: [string, string][] = [
  ["Retention", "100,800 blocks per store or renew, about 7 days at 6 s blocks"],
  ["Max per store", "8 MiB (MaxTransactionSize). PotDrive blocks are ≤ 1 MiB"],
  ["Max stores per block", "512 (MaxBlockTransactions)"],
  ["Block length (normal class)", "14,942,208 bytes"],
  ["Fee", "≈ 0.1135 tPOT per KiB, ≈ 104.87 tPOT per MiB (linear; measured 17 Oct 2026)"],
  ["Renewal fee", "The same as storing the same bytes"],
  ["Existential deposit", "0.1 tPOT"],
  ["Registry deploy deposit", "≈ 224 tPOT (refundable code deposit)"],
  ["Drive upload size", "64 MiB per file or folder; the CLI has no cap"],
  ["Gateway response window", "32 MiB; larger files are served as ranges"],
];

export default function Page() {
  return (
    <Doc href="/docs/limits">
      <DocHeader eyebrow="Reference" title="Costs and limits" summary="Numbers measured on the Portaldot V3 testnet, and the questions people ask most." />

      <H2 id="numbers">Numbers</H2>
      <table>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th className="w-56">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H2 id="faq">FAQ</H2>
      <H3 id="permanent">Is this permanent storage?</H3>
      <p>
        No. Portaldot keeps data for a rolling window that someone has to renew. Validators are paid to keep and prove data for a
        known time, and keep-alive automates the renewing.
      </p>
      <H3 id="ipfs">Can an IPFS node fetch my files?</H3>
      <p>
        The CIDs are standard. A Portaldot node started with <code>--ipfs-server</code> serves them to IPFS peers over libp2p
        bitswap. The public testnet node exposes the <code>bitswap_v1_get</code> RPC, which is what PotDrive reads.
      </p>
      <H3 id="site-down">What if potdrive.anshverma.tech goes away?</H3>
      <p>
        Nothing is lost. The data is in Portaldot, the CID is in your link, and the SDK or CLI can fetch and verify it from any
        Portaldot node.
      </p>
      <H3 id="cost">Why is storage expensive on the testnet?</H3>
      <p>
        The transaction length fee dominates. PotDrive can&apos;t change it, which is why it chunks by content and dedupes against
        the chain. Re-uploading an edited file usually costs a few percent of the first upload.
      </p>
    </Doc>
  );
}
