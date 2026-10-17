import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { UploadSequence } from "@/components/docs/diagrams";
import { Callout, Doc, DocHeader, H2, H3 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "One-signature uploads" };

export default function Page() {
  return (
    <Doc href="/docs/uploads">
      <DocHeader
        eyebrow="Concepts"
        title="One-signature uploads"
        summary="A 30-block upload needs 30 store extrinsics. PotDrive asks your wallet once."
      />

      <H2 id="problem">The problem</H2>
      <p>
        Each block must be its own <code>store</code> extrinsic (see <a href="/docs/storage#no-batch">why</a>). A browser wallet
        pops up once per signature. Forty prompts for a small website is not a product.
      </p>

      <H2 id="flow">The flow</H2>
      <UploadSequence />
      <ol>
        <li>
          <strong>Prepare.</strong> The browser chunks, hashes and builds the DAG. No network, no keys.
        </li>
        <li>
          <strong>Estimate.</strong> One state read finds blocks Portaldot already holds. Two <code>paymentInfo</code> calls give
          the linear fee model. The budget is the fees for new blocks plus 15%, two sweep fees and two existential deposits.
        </li>
        <li>
          <strong>Authorize.</strong> PotDrive generates an sr25519 key from a fresh mnemonic, in memory. Your wallet signs one{" "}
          <code>utility.batchAll</code>: <code>balances.transferKeepAlive(uploadKey, budget)</code>, plus{" "}
          <code>revive.call(registry, register(…))</code> if the registry is deployed. Ownership is recorded under your account,
          not the key&apos;s.
        </li>
        <li>
          <strong>Store.</strong> The upload key sends one <code>store</code> per new block. It pre-assigns nonces and keeps
          four in flight, and reports each block&apos;s inclusion block and transaction index from the <code>Stored</code> event.
        </li>
        <li>
          <strong>Verify.</strong> PotDrive fetches the root back with <code>bitswap_v1_get</code> and re-hashes it.
        </li>
        <li>
          <strong>Sweep.</strong> The key sends its entire remaining balance back with <code>balances.transferAll</code>.
        </li>
      </ol>

      <H2 id="safety">Safety of the upload key</H2>
      <H3 id="blast">Blast radius</H3>
      <p>
        The key only ever holds the budget for this upload, and only until the sweep a few blocks later. It has no proxy rights and
        no registry rights. It is a funded throwaway.
      </p>
      <H3 id="recovery">Closed tabs</H3>
      <p>
        Before funding, the mnemonic is written to <code>localStorage</code> with the owner and root. If the tab closes mid-upload,
        the Drive finds it next time and offers to return the balance. Blocks already stored stay on chain, and re-uploading the
        same file skips them because they dedupe.
      </p>
      <Code
        title="recover"
        code={`import { recoverSession } from "@potdrive/sdk";
await recoverSession(api, mnemonic, ownerAddress); // transferAll back to the owner`}
      />
      <Callout kind="tip" title="Using a script or a server?">
        Pass a <code>KeyringPair</code> as <code>owner</code>. The same flow runs, and there is no prompt at all.
      </Callout>

      <H2 id="events">Progress events</H2>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>estimate</code></td><td>Fees, reused and new bytes, budget, total.</td></tr>
          <tr><td><code>session</code></td><td>The upload key&apos;s address, before funding.</td></tr>
          <tr><td><code>authorized</code></td><td>The single wallet transaction is in a block.</td></tr>
          <tr><td><code>block</code></td><td>Every status change of every block: queued, skipped, sent, inBlock, finalized, failed.</td></tr>
          <tr><td><code>verified</code></td><td>The root came back over bitswap and matched its hash.</td></tr>
          <tr><td><code>swept</code></td><td>Unspent budget returned.</td></tr>
          <tr><td><code>done</code></td><td>The result: root CID, private key if any, block placements.</td></tr>
        </tbody>
      </table>
    </Doc>
  );
}
