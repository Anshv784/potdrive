import type { Metadata } from "next";
import { Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Security model" };

const threats: [string, string, string][] = [
  ["A node or the gateway returns tampered data", "Every block is re-hashed against its CID before use. Mismatches are refused (502).", "Covered"],
  ["A node withholds data", "Readers can query any Portaldot node; the CID is node-independent.", "Availability depends on the node"],
  ["Validators silently drop data", "The runtime requires checkProof every block for data stored one period earlier.", "Covered by the chain"],
  ["A stored website attacks PotDrive users", "HTML, SVG and JS are served with a CSP sandbox without allow-same-origin: opaque origin, no cookies or storage.", "Covered"],
  ["The share link of a private file leaks", "Nothing to do after the fact: the ciphertext is public until it expires.", "By design, documented"],
  ["Someone probes whether you stored a known file", "Private files get a fresh key and IV, so ciphertext never repeats or dedupes.", "Covered for private files"],
  ["The upload key is stolen from the tab", "It only holds this upload's budget, for a few blocks, then sweeps.", "Bounded"],
  ["A tab closes mid-upload", "The key is persisted locally and the Drive offers a sweep back to the owner.", "Covered"],
  ["The keeper over-claims", "Capped per file by its own balance. Every claim is a public Renewed event. Owners can withdraw any time.", "Bounded, trusted operator"],
  ["The gasless relay is abused", "Each authorization is wallet-signed, bound to one upload key and root, with a byte budget and an expiry. Only transactionStorage.store is sponsored.", "Bounded"],
  ["A dishonest RPC misreports expiry or ownership", "Ownership is read from the contract; expiry from chain state via the same RPC.", "Trusts the RPC; a light client fixes this"],
];

export default function Page() {
  return (
    <Doc href="/docs/security">
      <DocHeader eyebrow="Reference" title="Security model" summary="What can go wrong, what PotDrive does about it, and what it leaves to the chain or to you." />

      <H2 id="threats">Threats</H2>
      <table>
        <thead>
          <tr>
            <th>Threat</th>
            <th>Mitigation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {threats.map(([t, m, s]) => (
            <tr key={t}>
              <td>{t}</td>
              <td>{m}</td>
              <td className="whitespace-nowrap">{s}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H2 id="keys">Keys</H2>
      <ul>
        <li>Your wallet key never leaves the extension. PotDrive asks it for one signature per upload.</li>
        <li>Upload keys are generated in the tab from a fresh mnemonic and exist only for one upload.</li>
        <li>Private-file keys exist only in the share link fragment and in the uploader&apos;s local library.</li>
        <li>The keeper key is a server secret (<code>KEEPER_SEED</code>). It can only renew and claim per-file balances.</li>
      </ul>

      <H2 id="roadmap">Roadmap</H2>
      <ul>
        <li>Read chain state through a light client (smoldot) instead of trusting one RPC for placements and expiry.</li>
        <li>Verify renewals inside the registry with a storage proof, so the keeper needs no trust.</li>
        <li>Serve stored websites from per-CID subdomains so they get a real origin.</li>
      </ul>
    </Doc>
  );
}
