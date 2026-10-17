import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Verification and trust" };

export default function Page() {
  return (
    <Doc href="/docs/verification">
      <DocHeader
        eyebrow="Concepts"
        title="Verification and trust"
        summary="What a reader checks, what it still trusts, and what Portaldot's validators guarantee."
      />

      <H2 id="integrity">Integrity: trust nothing</H2>
      <p>
        Every read path goes through one function. It asks a node for a block by CID and refuses the bytes unless their
        blake2b-256 hash equals the CID&apos;s digest:
      </p>
      <Code
        title="sdk/src/fetch.ts"
        code={`export async function getBlock(cid: CID | string): Promise<Uint8Array> {
  const bytes = hexToU8a(await rpc("bitswap_v1_get", [cid.toString()]));
  if (!verifyBytes(cid, bytes)) throw new IntegrityError(cid.toString());
  return bytes;
}`}
      />
      <p>
        A root links its children by CID, so verifying the root and then each child verifies the whole file. A node, the PotDrive
        gateway or anyone in between can withhold data, but it cannot change data without being caught. On a file page this
        happens in your browser, straight against the Portaldot node (its RPC sends <code>Access-Control-Allow-Origin: *</code>),
        and the grid of squares shows each block as it passes.
      </p>

      <H2 id="trust">What you still trust</H2>
      <table>
        <thead>
          <tr>
            <th>Question</th>
            <th>Who answers</th>
            <th>Can they lie?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Are these the right bytes?</td>
            <td>Your hash check</td>
            <td>No</td>
          </tr>
          <tr>
            <td>Is the data available?</td>
            <td>The RPC node you query</td>
            <td>It can withhold. Query another node.</td>
          </tr>
          <tr>
            <td>When does it expire?</td>
            <td>Chain state read through that node</td>
            <td>A dishonest RPC could misreport. A light client or state proof removes this trust.</td>
          </tr>
          <tr>
            <td>Do validators still hold it?</td>
            <td>The runtime, via <code>checkProof</code> in every block</td>
            <td>Not without producing invalid blocks</td>
          </tr>
          <tr>
            <td>Who owns it?</td>
            <td>The registry contract</td>
            <td>No. The record is on chain.</td>
          </tr>
        </tbody>
      </table>

      <H2 id="proofs">Storage proofs</H2>
      <p>
        For data stored at block <em>N</em>, the author of block <em>N + 100,800</em> must include a proof of a random 256-byte
        chunk. PotDrive&apos;s <a href="/explore">proof monitor</a> reads recent blocks, finds the <code>checkProof</code> inherent
        and the <code>ProofChecked</code> event, and shows when the next proof is due based on the oldest held data.
      </p>
      <Code
        title="sdk/src/proofs.ts"
        code={`const hasInherent = block.extrinsics.some(
  (x) => x.method.section === "transactionStorage" && x.method.method === "checkProof",
);
const proved = events.some(({ event }) => event.method === "ProofChecked");
const due = storedBlocks.has(number - RETENTION);   // this block had to prove something`}
      />
    </Doc>
  );
}
