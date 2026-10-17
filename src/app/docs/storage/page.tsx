import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Callout, Doc, DocHeader, H2, H3 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "TransactionStorage" };

export default function Page() {
  return (
    <Doc href="/docs/storage">
      <DocHeader
        eyebrow="Concepts"
        title="TransactionStorage"
        summary="The Portaldot V3 pallet that holds PotDrive's data: how it indexes bytes, how long it keeps them, and how block producers prove they still have them."
      />

      <H2 id="calls">The calls</H2>
      <table>
        <thead>
          <tr>
            <th>Call</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>store(data)</code></td>
            <td>Charges a fee and asks the node to index <code>data</code> under <code>blake2_256(data)</code>. Max 8 MiB.</td>
          </tr>
          <tr>
            <td><code>renew(block, index)</code></td>
            <td>Re-indexes data stored at <code>(block, index)</code> for another retention period. Same fee as storing.</td>
          </tr>
          <tr>
            <td><code>checkProof(proof)</code></td>
            <td>Inherent included by the block author: proof of a random chunk of the data stored a retention period ago.</td>
          </tr>
        </tbody>
      </table>
      <p>
        On Portaldot V3 the pallet is the fee-based variant: there is no <code>authorize_account</code> step, so any funded
        account can store. We verified this against the live runtime (<code>specVersion 3002</code>): the call list is exactly{" "}
        <code>store</code>, <code>renew</code> and <code>checkProof</code>, and <code>Authorizations</code> is empty.
      </p>

      <H2 id="indexing">How data is indexed</H2>
      <p>
        <code>store</code> does not write your bytes into runtime state. It records a <code>TransactionInfo</code> (content hash,
        size, chunk root) under the current block, and emits an index operation telling the node&apos;s database to keep the
        extrinsic&apos;s data addressable by its blake2b-256 hash. The node later serves it through{" "}
        <code>bitswap_v1_get(cid)</code>, which accepts any CIDv1 whose multihash is that digest.
      </p>
      <H3 id="no-batch">Why blocks cannot share a batch</H3>
      <p>
        The database keeps <em>one</em> index entry per extrinsic and stores the <em>last</em> <code>size</code> bytes of the
        encoded extrinsic (<code>sc-client-db</code>, <code>apply_index_ops</code>):
      </p>
      <Code
        lang="rust"
        title="substrate/client/db/src/lib.rs (abridged)"
        code={`IndexOperation::Insert { extrinsic, hash, size } => {
    index_map.insert(extrinsic, (hash, size));   // keyed by extrinsic index
}
// …
let offset = encoded.len() - size;
transaction.store(columns::TRANSACTION, hash, encoded[offset..].to_vec());`}
      />
      <p>
        Two <code>store</code> calls inside one <code>utility.batchAll</code> would overwrite each other&apos;s index entry, and
        the indexed bytes would not be the data. So every block is its own extrinsic. PotDrive keeps that to one wallet prompt
        with an <a href="/docs/uploads">upload key</a>.
      </p>

      <H2 id="retention">Retention</H2>
      <p>
        Data is kept for <code>RetentionPeriod = 100,800</code> blocks, about 7 days at 6-second blocks. When the period ends,
        the pallet drops the <code>TransactionInfo</code> and validators stop having to hold the data. <code>renew</code> moves
        it into the renewal block, starting a new period. Anyone can renew any data. PotDrive&apos;s{" "}
        <a href="/docs/keep-alive">keeper</a> does it automatically for prepaid files.
      </p>
      <p>
        You can read what is held at any moment from chain state. Each key of <code>TransactionStorage.Transactions</code> is a
        block number, and its value lists that block&apos;s stored items. <a href="/explore">Explore</a> renders exactly this.
      </p>

      <H2 id="proofs">Storage proofs</H2>
      <p>
        In block <em>N</em>, the author must include <code>checkProof</code> for the data stored at block{" "}
        <em>N − RetentionPeriod</em>. The runtime picks a random 256-byte chunk using on-chain randomness, and the author has to
        supply that chunk with a trie proof against the stored chunk root. A block with a missing or invalid proof is invalid.
        Validators that drop data cannot keep producing blocks.
      </p>
      <Callout kind="note" title="When proofs start">
        Proofs are only required for data stored exactly one retention period earlier. Data stored today is first proven about 7
        days later. The <a href="/explore">proof monitor</a> shows recent blocks and when the next proof falls due.
      </Callout>

      <H2 id="fees">Fees</H2>
      <p>
        <code>store</code> pays the pallet&apos;s own byte and entry fees (<code>ByteFee = 10</code>, <code>EntryFee = 1000</code>{" "}
        planck, negligible) plus the normal transaction fee. On V3 the length component dominates. Measured with{" "}
        <code>paymentInfo</code> on 17 October 2026:
      </p>
      <table>
        <thead>
          <tr>
            <th>Payload</th>
            <th>Fee</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1 KiB</td><td>0.1135 tPOT</td></tr>
          <tr><td>256 KiB</td><td>26.23 tPOT</td></tr>
          <tr><td>1 MiB</td><td>104.87 tPOT</td></tr>
          <tr><td>4 MiB</td><td>419.44 tPOT</td></tr>
        </tbody>
      </table>
      <p>
        Fees are linear in size, so PotDrive estimates any upload from two <code>paymentInfo</code> calls. They are also the
        reason <a href="/docs/content-addressing">deduplication</a> matters.
      </p>
    </Doc>
  );
}
