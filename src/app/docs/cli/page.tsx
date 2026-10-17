import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "CLI" };

export default function Page() {
  return (
    <Doc href="/docs/cli">
      <DocHeader eyebrow="Reference" title="CLI" summary="Store, deploy, fetch, inspect and renew from a terminal. Runs with Bun." />

      <H2 id="setup">Setup</H2>
      <Code
        lang="bash"
        title="Terminal"
        code={`git clone https://github.com/Anshv784/potdrive && cd potdrive && bun install
export POTDRIVE_SEED="your twelve words …"        # signs put, deploy and renew
export POTDRIVE_REGISTRY=0x…                        # optional: register ownership`}
      />

      <H2 id="commands">Commands</H2>
      <table>
        <thead>
          <tr>
            <th>Command</th>
            <th>Does</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>put &lt;file&gt; [--private] [--keep N]</code></td><td>Store a file and print its share link. <code>--keep</code> prepays N renewals.</td></tr>
          <tr><td><code>deploy &lt;dir&gt;</code></td><td>Store a folder as a UnixFS directory and print its site URL.</td></tr>
          <tr><td><code>get &lt;cid&gt; [-o path] [--key k]</code></td><td>Fetch, verify every block, decrypt if sealed, save.</td></tr>
          <tr><td><code>info &lt;cid&gt;</code></td><td>Every block, its <code>(block, index)</code>, size and expiry.</td></tr>
          <tr><td><code>renew &lt;cid&gt;</code></td><td>Renew every block of a file or folder.</td></tr>
          <tr><td><code>ls</code></td><td>Everything TransactionStorage holds right now.</td></tr>
        </tbody>
      </table>

      <H2 id="example">Example</H2>
      <Code
        lang="bash"
        title="Terminal (illustrative output)"
        code={`$ bun cli/potdrive.ts put ./deck-v2.pdf
  prepared   deck-v2.pdf · 3.40 MiB → 7 block(s)
  estimate   61.204 tPOT at most
  dedup      5 block(s), 2.81 MiB already on chain, not paid again
  authorized 0x8c1e5f0d… (block #76,112)
  stored     ████████████████████ 7/7 blocks
  verified   root served by bitswap in 412 ms
  link       https://potdrive.anshverma.tech/f/bafykbzace…?name=deck-v2.pdf`}
      />
    </Doc>
  );
}
